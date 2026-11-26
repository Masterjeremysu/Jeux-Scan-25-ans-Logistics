import { AppConfig, InventoryItem, Mission, MissionStep, WarehouseLocation } from '../types';

export type StationLaneId = 'poste-1' | 'poste-2';

export interface ShelfLaneInfo {
  station: StationLaneId;
  shelfZone: string;
  shortTag: string;
}

const RECENT_SKUS_STORAGE_PREFIX = 'gt25_recent_skus_';
const MAX_RECENT_SKUS_MEMORY = 14;

/**
 * Détermine de façon déterministe à quelle étagère physique (ETAGERE A -> poste-1,
 * ETAGERE B -> poste-2) appartient un article, pour garantir 0 collision physique
 * entre deux duos jouant en simultané.
 */
export function detectItemShelfLane(
  item: InventoryItem,
  locations: WarehouseLocation[]
): ShelfLaneInfo {
  const loc = locations.find(
    (l) => l.barcode.trim().toUpperCase() === (item.location || '').trim().toUpperCase()
  );

  const rawZone = (loc?.zone || '').trim().toUpperCase();
  const rawBarcode = (item.location || '').trim().toUpperCase();
  const combined = `${rawZone} ${rawBarcode}`;

  // Détection explicite Étagère A / Étagère B (insensible aux accents)
  const normalized = combined.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (/\bETAGERE\s*A\b|\bZONE\s*A\b|\bALLEE\s*A\b|\bRACK\s*A\b|^A[-_\s]/.test(normalized)) {
    return { station: 'poste-1', shelfZone: 'ETAGERE A', shortTag: 'Étagère A' };
  }
  if (/\bETAGERE\s*B\b|\bZONE\s*B\b|\bALLEE\s*B\b|\bRACK\s*B\b|^B[-_\s]/.test(normalized)) {
    return { station: 'poste-2', shelfZone: 'ETAGERE B', shortTag: 'Étagère B' };
  }

  // Repli déterministe si d'autres noms de zones existent : hash stable de la zone
  const key = rawZone || rawBarcode || item.sku;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  if (hash % 2 === 0) {
    return { station: 'poste-1', shelfZone: rawZone || 'ETAGERE A', shortTag: rawZone || 'Étagère A' };
  }
  return { station: 'poste-2', shelfZone: rawZone || 'ETAGERE B', shortTag: rawZone || 'Étagère B' };
}

/**
 * Filtre et ordonne les missions dédiées à une station donnée.
 * Empêche totalement Poste 1 (Étagère A) et Poste 2 (Étagère B) de se marcher dessus.
 */
export function filterMissionsForStation(
  baseMissions: Mission[],
  stationId: string,
  preferredMissionIndex?: number
): Mission[] {
  if (!baseMissions || baseMissions.length === 0) return [];

  const activeOnly = baseMissions.filter((m) => m.isActive !== false);
  const pool = activeOnly.length > 0 ? activeOnly : baseMissions;

  const hasLaneAssignments = pool.some(
    (m) => m.assignedStation === 'poste-1' || m.assignedStation === 'poste-2'
  );

  let stationPool = pool;
  if (hasLaneAssignments && (stationId === 'poste-1' || stationId === 'poste-2')) {
    const dedicated = pool.filter(
      (m) => !m.assignedStation || m.assignedStation === 'any' || m.assignedStation === stationId
    );
    if (dedicated.length > 0) {
      stationPool = dedicated;
    }
  } else if (!hasLaneAssignments && stationId === 'poste-2') {
    // Rétro-compatibilité si l'utilisateur a créé manuellement des missions sans couloir
    stationPool = pool.slice().reverse();
  }

  if (
    typeof preferredMissionIndex === 'number' &&
    preferredMissionIndex >= 0 &&
    preferredMissionIndex < stationPool.length
  ) {
    const chosen = stationPool[preferredMissionIndex];
    return [chosen, ...stationPool.filter((m) => m.id !== chosen.id)];
  }

  return stationPool;
}

function getRecentSkus(station: StationLaneId): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${RECENT_SKUS_STORAGE_PREFIX}${station}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((s) => String(s).toUpperCase()) : [];
  } catch {
    return [];
  }
}

function rememberRecentSkus(station: StationLaneId, skus: string[]): void {
  if (typeof window === 'undefined' || skus.length === 0) return;
  try {
    const prev = getRecentSkus(station);
    const upperNew = skus.map((s) => s.toUpperCase());
    const merged = [...prev.filter((s) => !upperNew.includes(s)), ...upperNew];
    const trimmed = merged.slice(-MAX_RECENT_SKUS_MEMORY);
    localStorage.setItem(`${RECENT_SKUS_STORAGE_PREFIX}${station}`, JSON.stringify(trimmed));
  } catch {
    // Non-bloquant
  }
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Sélectionne `count` articles en privilégiant ceux qui n'ont PAS été joués récemment
 * (rotation complète sur toute l'étagère pour éliminer la redondance).
 */
function pickRotatedItems(
  candidates: InventoryItem[],
  count: number,
  recentSkus: string[],
  excludeSkus: Set<string> = new Set()
): InventoryItem[] {
  const eligible = candidates.filter((it) => !excludeSkus.has(it.sku.toUpperCase()));
  const pool = eligible.length >= count ? eligible : candidates;

  const recentSet = new Set(recentSkus.map((s) => s.toUpperCase()));
  const fresh = shuffleArray(pool.filter((it) => !recentSet.has(it.sku.toUpperCase())));

  // Les articles déjà joués sont triés du plus ancien au plus récent
  const older = pool
    .filter((it) => recentSet.has(it.sku.toUpperCase()))
    .sort((a, b) => recentSkus.indexOf(a.sku.toUpperCase()) - recentSkus.indexOf(b.sku.toUpperCase()));

  return [...fresh, ...older].slice(0, count);
}

/**
 * Génère automatiquement un pack complet de 6 missions 100 % isolées par étagère :
 *
 * - Couloir Bleu  (Poste 1 -> ETAGERE A) : 3 missions dédiées
 * - Couloir Orange (Poste 2 -> ETAGERE B) : 3 missions dédiées
 *
 * Auto-cicatrisation du stock (protection fin de chrono / blocage duo) :
 * - Si un duo précédent a laissé des pièces sur la table (onTableQty > 0) pour cette étagère,
 *   la Mission 1 du couloir devient AUTOMATIQUEMENT une Collecte de rattrapage de ces pièces !
 * - Sinon, le couloir démarre sur une Livraison (2 réf. neuves), suivie de sa Collecte (bilan = 0)
 *   puis d'un Contrôle Inventaire sur place (2 autres réf. neuves, bilan = 0).
 */
export function generateAutoBalancedMissions(
  inventory: InventoryItem[],
  locations: WarehouseLocation[],
  appConfig: AppConfig,
  itemsPerMission: number = 2
): Mission[] {
  const deliveryBarcode = appConfig.deliveryTableBarcode || 'LOC-ETAGERE-LIVRAISON';
  const collectBarcode = appConfig.collectTableBarcode || 'LOC-ETAGERE-COLLECTE';

  const findLoc = (barcode: string) =>
    locations.find((l) => l.barcode.trim().toUpperCase() === barcode.trim().toUpperCase());

  const deliveryLoc = findLoc(deliveryBarcode);
  const collectLoc = findLoc(collectBarcode);

  const playableItems = inventory.filter(
    (it) => it.location && it.itemType !== 'golden_ticket'
  );

  if (playableItems.length === 0) return [];

  const nowId = Date.now();
  const generated: Mission[] = [];

  const buildDeliveryMission = (
    chosenItems: InventoryItem[],
    lane: ShelfLaneInfo,
    orderIdx: number
  ): Mission => {
    const steps: MissionStep[] = [];
    const total = chosenItems.length;
    chosenItems.forEach((item, idx) => {
      const binLoc = findLoc(item.location);
      const binName = binLoc?.label || item.location;
      const numTag = total > 1 ? `Pièce ${idx + 1}/${total}` : 'Pièce unique';
      steps.push({
        id: `auto-del-loc-${lane.station}-${nowId}-${orderIdx}-${idx}`,
        instruction: `${numTag} — Allez devant le bac ${binName} et flashez l'étiquette du bac.`,
        expectedBarcode: item.location,
        barcodeType: 'location',
        targetLabel: binName,
        lrCode: binLoc?.lrCode || item.location.toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
        crLabel: binLoc?.crLabel || item.location.toUpperCase(),
        quantity: 1,
        scannedCount: 0,
        completed: false,
        hint: `Flashez l'étiquette collée sur le bac ${item.location}.`
      });
      steps.push({
        id: `auto-del-art-${lane.station}-${nowId}-${orderIdx}-${idx}`,
        instruction: `${numTag} — Sortez « ${item.name} » du bac et flashez son code-barres.`,
        expectedBarcode: item.sku,
        barcodeType: 'article',
        targetLabel: item.name,
        lrCode: item.lrCode || '',
        crLabel: item.crLabel || item.name.toUpperCase(),
        quantity: 1,
        scannedCount: 0,
        completed: false,
        hint: `Prenez la pièce en main et flashez ${item.sku}.`
      });
    });

    steps.push({
      id: `auto-del-end-${lane.station}-${nowId}-${orderIdx}`,
      instruction: `Étape finale — Déposez ${total > 1 ? `les ${total} pièces` : 'la pièce'} sur la Table de Livraison et flashez son étiquette.`,
      expectedBarcode: deliveryBarcode,
      barcodeType: 'dock',
      targetLabel: 'Table de Livraison Client',
      lrCode: deliveryLoc?.lrCode || 'ETA_LIVR',
      crLabel: deliveryLoc?.crLabel || 'TABLE LIVRAISON CLIENT',
      quantity: 1,
      scannedCount: 0,
      completed: false,
      hint: `Flashez l'étiquette ${deliveryBarcode} sur la Table de Livraison pour terminer.`
    });

    const itemNames = chosenItems.map((i) => i.name).join(' + ');
    const laneLetter = lane.station === 'poste-1' ? 'A' : 'B';
    const clientCatalog = appConfig.clientsCatalog && appConfig.clientsCatalog.length > 0
      ? appConfig.clientsCatalog
      : [appConfig.eventTitle || 'Client Labo'];

    return {
      id: `mission-auto-liv-${lane.station}-${orderIdx}-${nowId}`,
      code: `LIV-${laneLetter}-${String(nowId).slice(-3)}`,
      title: `Livraison • ${lane.shortTag} (${chosenItems.length} réf.)`,
      client: clientCatalog[(orderIdx + (lane.station === 'poste-2' ? 1 : 0)) % clientCatalog.length],
      priority: 'URGENCE CRITIQUE',
      description: `Prélèvement sur ${lane.shortTag} et dépôt sur la Table de Livraison : ${itemNames}. (-1 bac / +1 table)`,
      timeLimitSeconds: 180,
      basePoints: 1200,
      stockDirection: 'out',
      assignedStation: lane.station,
      shelfZone: lane.shelfZone,
      isActive: true,
      steps
    };
  };

  const buildCollectMission = (
    chosenItems: InventoryItem[],
    lane: ShelfLaneInfo,
    orderIdx: number,
    isRecovery: boolean
  ): Mission => {
    const total = chosenItems.length;
    const steps: MissionStep[] = [
      {
        id: `auto-col-start-${lane.station}-${nowId}-${orderIdx}`,
        instruction: `Départ — Allez à la Table de Collecte et flashez son étiquette pour récupérer ${total > 1 ? `${total} pièces` : 'la pièce'}.`,
        expectedBarcode: collectBarcode,
        barcodeType: 'location',
        targetLabel: 'Table de Collecte & Retours',
        lrCode: collectLoc?.lrCode || 'ETA_COLLECT',
        crLabel: collectLoc?.crLabel || 'TABLE COLLECTE RETOURS',
        quantity: 1,
        scannedCount: 0,
        completed: false,
        hint: `Flashez l'étiquette ${collectBarcode} sur la Table de Collecte.`
      }
    ];

    chosenItems.forEach((item, idx) => {
      const binLoc = findLoc(item.location);
      const binName = binLoc?.label || item.location;
      const numTag = total > 1 ? `Pièce ${idx + 1}/${total}` : 'Pièce unique';
      steps.push({
        id: `auto-col-art-${lane.station}-${nowId}-${orderIdx}-${idx}`,
        instruction: `${numTag} — Prenez « ${item.name} » sur la table et flashez son code-barres.`,
        expectedBarcode: item.sku,
        barcodeType: 'article',
        targetLabel: item.name,
        lrCode: item.lrCode || '',
        crLabel: item.crLabel || item.name.toUpperCase(),
        quantity: 1,
        scannedCount: 0,
        completed: false,
        hint: `Flashez le code-barres ${item.sku} sur la pièce.`
      });
      steps.push({
        id: `auto-col-bin-${lane.station}-${nowId}-${orderIdx}-${idx}`,
        instruction: `Rangement ${idx + 1}/${total} — Posez la pièce dans son bac ${binName} et flashez le bac pour confirmer.`,
        expectedBarcode: item.location,
        barcodeType: 'location',
        targetLabel: binName,
        lrCode: binLoc?.lrCode || item.location.toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
        crLabel: binLoc?.crLabel || item.location.toUpperCase(),
        quantity: 1,
        scannedCount: 0,
        completed: false,
        hint: `Flashez l'étiquette du bac ${item.location} pour prouver que la pièce est bien rangée.`
      });
    });

    const itemNames = chosenItems.map((i) => i.name).join(' + ');
    const laneLetter = lane.station === 'poste-1' ? 'A' : 'B';

    return {
      id: `mission-auto-col-${lane.station}-${orderIdx}-${nowId}`,
      code: `COL-${laneLetter}-${String(nowId).slice(-3)}`,
      title: isRecovery
        ? `Collecte Prioritaire • ${lane.shortTag} (${chosenItems.length} réf.)`
        : `Collecte & Retour • ${lane.shortTag} (${chosenItems.length} réf.)`,
      client: isRecovery
        ? `Rattrapage Table → ${lane.shortTag}`
        : `Retour Client → ${lane.shortTag}`,
      priority: isRecovery ? 'URGENCE CRITIQUE' : 'STANDARD',
      description: isRecovery
        ? `Pièce(s) en attente sur la table à remettre en stock sur ${lane.shortTag} : ${itemNames}. (+1 bac / -1 table)`
        : `Récupérer sur la table et remettre en bac sur ${lane.shortTag} : ${itemNames}. (+1 bac / -1 table)`,
      timeLimitSeconds: 180,
      basePoints: 1200,
      stockDirection: 'in',
      assignedStation: lane.station,
      shelfZone: lane.shelfZone,
      isActive: true,
      steps
    };
  };

  const buildInventoryAuditMission = (
    chosenItems: InventoryItem[],
    lane: ShelfLaneInfo,
    orderIdx: number
  ): Mission => {
    const steps: MissionStep[] = [];
    const total = chosenItems.length;
    chosenItems.forEach((item, idx) => {
      const binLoc = findLoc(item.location);
      const binName = binLoc?.label || item.location;
      const numTag = total > 1 ? `Contrôle ${idx + 1}/${total}` : 'Contrôle unique';
      steps.push({
        id: `auto-inv-loc-${lane.station}-${nowId}-${orderIdx}-${idx}`,
        instruction: `${numTag} — Allez devant le bac ${binName} et flashez l'étiquette du bac.`,
        expectedBarcode: item.location,
        barcodeType: 'location',
        targetLabel: binName,
        lrCode: binLoc?.lrCode || item.location.toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
        crLabel: binLoc?.crLabel || item.location.toUpperCase(),
        quantity: 1,
        scannedCount: 0,
        completed: false,
        hint: `Flashez le bac ${item.location} (ne sortez pas la pièce).`
      });
      steps.push({
        id: `auto-inv-art-${lane.station}-${nowId}-${orderIdx}-${idx}`,
        instruction: `${numTag} — Flashez « ${item.name} » SUR PLACE et laissez-la dans son bac !`,
        expectedBarcode: item.sku,
        barcodeType: 'article',
        targetLabel: item.name,
        lrCode: item.lrCode || '',
        crLabel: item.crLabel || item.name.toUpperCase(),
        quantity: 1,
        scannedCount: 0,
        completed: false,
        hint: `Flashez ${item.sku} sur place — la pièce reste dans son bac.`
      });
    });

    const itemNames = chosenItems.map((i) => i.name).join(' + ');
    const laneLetter = lane.station === 'poste-1' ? 'A' : 'B';

    return {
      id: `mission-auto-inv-${lane.station}-${orderIdx}-${nowId}`,
      code: `INV-${laneLetter}-${String(nowId).slice(-3)}`,
      title: `Contrôle Qualité • ${lane.shortTag} (${chosenItems.length} réf.)`,
      client: `Audit Traçabilité 25 Ans (${lane.shortTag})`,
      priority: 'EXPÉDITION INTERNATIONALE',
      description: `Vérification physique sur place sur ${lane.shortTag} sans déplacement de stock : ${itemNames}. (Stock inchangé)`,
      timeLimitSeconds: 180,
      basePoints: 1200,
      stockDirection: 'none',
      assignedStation: lane.station,
      shelfZone: lane.shelfZone,
      isActive: true,
      steps
    };
  };

  // Construire les 2 couloirs strictement isolés : Poste 1 (ETAGERE A) et Poste 2 (ETAGERE B)
  const lanes: ShelfLaneInfo[] = [
    { station: 'poste-1', shelfZone: 'ETAGERE A', shortTag: 'Étagère A' },
    { station: 'poste-2', shelfZone: 'ETAGERE B', shortTag: 'Étagère B' }
  ];

  lanes.forEach((lane) => {
    const laneItems = playableItems.filter(
      (it) => detectItemShelfLane(it, locations).station === lane.station
    );
    const laneShelfItems = laneItems.filter((it) => it.quantity > 0);
    const laneTableItems = laneItems.filter((it) => (it.onTableQty || 0) > 0);

    if (laneShelfItems.length === 0 && laneTableItems.length === 0) return;

    const recentSkus = getRecentSkus(lane.station);
    const pickedSkusThisRun: string[] = [];

    if (laneTableItems.length > 0) {
      // AUTO-CICATRISATION : Des pièces de cette étagère sont restées sur la table !
      // Mission 1 : Collecte prioritaire de ces pièces exactes pour les remettre dans leur bac
      const recoveryItems = laneTableItems.slice(0, itemsPerMission);
      generated.push(buildCollectMission(recoveryItems, lane, 1, true));
      recoveryItems.forEach((it) => pickedSkusThisRun.push(it.sku));

      // Mission 2 : Livraison sur des pièces fraîches (non récemment jouées) de cette même étagère
      if (laneShelfItems.length > 0) {
        const exclude = new Set(recoveryItems.map((i) => i.sku.toUpperCase()));
        const deliveryItems = pickRotatedItems(laneShelfItems, itemsPerMission, recentSkus, exclude);
        generated.push(buildDeliveryMission(deliveryItems, lane, 2));
        deliveryItems.forEach((it) => pickedSkusThisRun.push(it.sku));

        // Mission 3 : Retour en bac de ces mêmes pièces livrées (bilan net = 0)
        generated.push(buildCollectMission(deliveryItems, lane, 3, false));
      }
    } else if (laneShelfItems.length > 0) {
      // Table propre pour cette étagère :
      // Mission 1 : Livraison sur 2 pièces fraîches
      const deliveryItems = pickRotatedItems(laneShelfItems, itemsPerMission, recentSkus);
      generated.push(buildDeliveryMission(deliveryItems, lane, 1));
      deliveryItems.forEach((it) => pickedSkusThisRun.push(it.sku));

      // Mission 2 : Collecte & Retour de ces mêmes pièces (bilan net = 0)
      generated.push(buildCollectMission(deliveryItems, lane, 2, false));

      // Mission 3 : Contrôle Inventaire sur place sur 2 AUTRES pièces fraîches (bilan net = 0)
      const exclude = new Set(deliveryItems.map((i) => i.sku.toUpperCase()));
      const auditItems = pickRotatedItems(laneShelfItems, itemsPerMission, recentSkus, exclude);
      if (auditItems.length > 0) {
        generated.push(buildInventoryAuditMission(auditItems, lane, 3));
        auditItems.forEach((it) => pickedSkusThisRun.push(it.sku));
      }
    }

    rememberRecentSkus(lane.station, pickedSkusThisRun);
  });

  return generated;
}
