import { AppConfig, InventoryItem, Mission, MissionStep, WarehouseLocation } from '../types';

/**
 * Génère automatiquement une boucle fermée de STRICTEMENT 3 missions 100 % équilibrées
 * avec le stock réel Supabase (zéro remplissage physique requis par l'animateur) :
 *
 *  - Mission 1 (Livraison • Lot A, stockDirection: 'out') :
 *      Prélèvement en bac (-1) -> dépôt sur la Table de Livraison (+1)
 *  - Mission 2 (Collecte & Réintégration • Lot A, stockDirection: 'in') :
 *      Reprise de ces MÊMES articles sur la Table (-1) -> rangement dans leur bac (+1)
 *      => Bilan physique net = 0 !
 *  - Mission 3 (Contrôle Inventaire Express • Lot B, stockDirection: 'none') :
 *      Scan bac + contrôle pièce sur place (sans déplacer la pièce) -> validation quai
 *      => Bilan physique net = 0, aucune collision avec le Lot A !
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

  // Articles réellement disponibles en bac sur les étagères (quantity >= 1)
  const shelfItems = inventory.filter(
    (it) => it.quantity > 0 && it.location && it.itemType !== 'golden_ticket'
  );

  // Articles déjà posés sur la table prêts à être réintégrés (onTableQty >= 1)
  const tableItems = inventory.filter(
    (it) => (it.onTableQty || 0) > 0 && it.location && it.itemType !== 'golden_ticket'
  );

  const generated: Mission[] = [];
  const nowId = Date.now();

  const buildDeliveryMission = (
    chosenItems: InventoryItem[],
    slotLabel: string,
    index: number
  ): Mission => {
    const steps: MissionStep[] = [];
    chosenItems.forEach((item, idx) => {
      const binLoc = findLoc(item.location);
      steps.push({
        id: `auto-del-loc-${nowId}-${index}-${idx}`,
        instruction: `Rendez-vous au bac ${binLoc?.label || item.location} et scannez l'emplacement.`,
        expectedBarcode: item.location,
        barcodeType: 'location',
        targetLabel: binLoc?.label || item.location,
        lrCode: binLoc?.lrCode || item.location.toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
        crLabel: binLoc?.crLabel || item.location.toUpperCase(),
        quantity: 1,
        scannedCount: 0,
        completed: false,
        hint: `Scannez l'étiquette du bac ${item.location}.`
      });
      steps.push({
        id: `auto-del-art-${nowId}-${index}-${idx}`,
        instruction: `Prélevez et scannez ${item.name} (${item.sku}).`,
        expectedBarcode: item.sku,
        barcodeType: 'article',
        targetLabel: item.name,
        lrCode: item.lrCode || '',
        crLabel: item.crLabel || item.name.toUpperCase(),
        quantity: 1,
        scannedCount: 0,
        completed: false,
        hint: `Scannez le code-barres ${item.sku} sur la pièce.`
      });
    });

    steps.push({
      id: `auto-del-end-${nowId}-${index}`,
      instruction: `Déposez la commande sur la ${deliveryLoc?.label || 'Table de Livraison'} et validez le scan final.`,
      expectedBarcode: deliveryBarcode,
      barcodeType: 'dock',
      targetLabel: deliveryLoc?.label || 'Table de Livraison Client',
      lrCode: deliveryLoc?.lrCode || 'ETA_LIVR',
      crLabel: deliveryLoc?.crLabel || 'TABLE LIVRAISON CLIENT',
      quantity: 1,
      scannedCount: 0,
      completed: false,
      hint: `Scannez l'étiquette ${deliveryBarcode} pour clôturer la livraison.`
    });

    const itemNames = chosenItems.map((i) => i.name).join(' + ');
    return {
      id: `mission-auto-livraison-${slotLabel.toLowerCase().replace(/\s+/g, '-')}-${nowId}`,
      code: `LIV-${slotLabel.toUpperCase().replace(/\s+/g, '')}-${String(nowId).slice(-3)}`,
      title: `Livraison Client • ${slotLabel} (${chosenItems.length} réf.)`,
      client: (appConfig.clientsCatalog && appConfig.clientsCatalog[index % appConfig.clientsCatalog.length]) || appConfig.eventTitle || 'Client Labo',
      priority: 'URGENCE CRITIQUE',
      description: `Prélèvement en bac et dépôt sur la Table de Livraison : ${itemNames}. (Sortie -1 bac / +1 table)`,
      timeLimitSeconds: 180,
      basePoints: 1200,
      stockDirection: 'out',
      isActive: true,
      steps
    };
  };

  const buildCollectMission = (
    chosenItems: InventoryItem[],
    slotLabel: string,
    index: number
  ): Mission => {
    const steps: MissionStep[] = [
      {
        id: `auto-col-start-${nowId}-${index}`,
        instruction: `Rendez-vous à la ${collectLoc?.label || 'Table de Collecte'} et scannez l'emplacement.`,
        expectedBarcode: collectBarcode,
        barcodeType: 'location',
        targetLabel: collectLoc?.label || 'Table de Collecte & Retours',
        lrCode: collectLoc?.lrCode || 'ETA_COLLECT',
        crLabel: collectLoc?.crLabel || 'TABLE COLLECTE RETOURS',
        quantity: 1,
        scannedCount: 0,
        completed: false,
        hint: `Scannez l'étiquette ${collectBarcode}.`
      }
    ];

    chosenItems.forEach((item, idx) => {
      const binLoc = findLoc(item.location);
      steps.push({
        id: `auto-col-art-${nowId}-${index}-${idx}`,
        instruction: `Récupérez sur la table et scannez ${item.name} (${item.sku}).`,
        expectedBarcode: item.sku,
        barcodeType: 'article',
        targetLabel: item.name,
        lrCode: item.lrCode || '',
        crLabel: item.crLabel || item.name.toUpperCase(),
        quantity: 1,
        scannedCount: 0,
        completed: false,
        hint: `Scannez le code-barres ${item.sku}.`
      });
      steps.push({
        id: `auto-col-bin-${nowId}-${index}-${idx}`,
        instruction: `Rangez la pièce dans son bac d'origine ${binLoc?.label || item.location} et scannez l'emplacement (+1 stock).`,
        expectedBarcode: item.location,
        barcodeType: 'location',
        targetLabel: binLoc?.label || item.location,
        lrCode: binLoc?.lrCode || item.location.toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
        crLabel: binLoc?.crLabel || item.location.toUpperCase(),
        quantity: 1,
        scannedCount: 0,
        completed: false,
        hint: `Scannez l'étiquette du bac ${item.location} pour réintégrer la pièce.`
      });
    });

    const itemNames = chosenItems.map((i) => i.name).join(' + ');
    return {
      id: `mission-auto-collecte-${slotLabel.toLowerCase().replace(/\s+/g, '-')}-${nowId}`,
      code: `COL-${slotLabel.toUpperCase().replace(/\s+/g, '')}-${String(nowId).slice(-3)}`,
      title: `Collecte & Réintégration • ${slotLabel} (${chosenItems.length} réf.)`,
      client: `Retour Client → Magasin (${appConfig.eventTitle || 'GT Logistics'})`,
      priority: 'STANDARD',
      description: `Récupérer sur la table et remettre en bac : ${itemNames}. (Entrée +1 bac / -1 table — boucle équilibrée)`,
      timeLimitSeconds: 180,
      basePoints: 1200,
      stockDirection: 'in',
      isActive: true,
      steps
    };
  };

  const buildInventoryAuditMission = (
    chosenItems: InventoryItem[],
    slotLabel: string,
    index: number
  ): Mission => {
    const steps: MissionStep[] = [];
    chosenItems.forEach((item, idx) => {
      const binLoc = findLoc(item.location);
      steps.push({
        id: `auto-inv-loc-${nowId}-${index}-${idx}`,
        instruction: `Contrôle inventaire : rendez-vous au bac ${binLoc?.label || item.location} et scannez l'emplacement.`,
        expectedBarcode: item.location,
        barcodeType: 'location',
        targetLabel: binLoc?.label || item.location,
        lrCode: binLoc?.lrCode || item.location.toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
        crLabel: binLoc?.crLabel || item.location.toUpperCase(),
        quantity: 1,
        scannedCount: 0,
        completed: false,
        hint: `Scannez l'étiquette du bac ${item.location}.`
      });
      steps.push({
        id: `auto-inv-art-${nowId}-${index}-${idx}`,
        instruction: `Contrôlez sur place (sans retirer du bac) et scannez ${item.name} (${item.sku}).`,
        expectedBarcode: item.sku,
        barcodeType: 'article',
        targetLabel: item.name,
        lrCode: item.lrCode || '',
        crLabel: item.crLabel || item.name.toUpperCase(),
        quantity: 1,
        scannedCount: 0,
        completed: false,
        hint: `Scannez ${item.sku} puis laissez la pièce dans son bac.`
      });
    });

    steps.push({
      id: `auto-inv-end-${nowId}-${index}`,
      instruction: `Validez votre rapport de contrôle qualité sur la ${deliveryLoc?.label || 'Table de Livraison'}.`,
      expectedBarcode: deliveryBarcode,
      barcodeType: 'dock',
      targetLabel: deliveryLoc?.label || 'Validation Contrôle Qualité',
      lrCode: deliveryLoc?.lrCode || 'ETA_LIVR',
      crLabel: deliveryLoc?.crLabel || 'VALIDATION CONTROLE',
      quantity: 1,
      scannedCount: 0,
      completed: false,
      hint: `Scannez l'étiquette ${deliveryBarcode} pour valider le contrôle.`
    });

    const itemNames = chosenItems.map((i) => i.name).join(' + ');
    return {
      id: `mission-auto-inventaire-${slotLabel.toLowerCase().replace(/\s+/g, '-')}-${nowId}`,
      code: `INV-${slotLabel.toUpperCase().replace(/\s+/g, '')}-${String(nowId).slice(-3)}`,
      title: `Contrôle Qualité & Inventaire • ${slotLabel} (${chosenItems.length} réf.)`,
      client: `Audit Traçabilité 25 Ans (${appConfig.eventTitle || 'GT Logistics'})`,
      priority: 'EXPÉDITION INTERNATIONALE',
      description: `Vérification physique sur place sans déplacement de stock : ${itemNames}. (Stock inchangé)`,
      timeLimitSeconds: 180,
      basePoints: 1200,
      stockDirection: 'none',
      isActive: true,
      steps
    };
  };

  // Partitionne les articles en 2 lots disjoints (Lot A / Lot B) pour éviter toute collision entre Poste 1 et Poste 2
  const lotA = shelfItems.filter((_, i) => i % 2 === 0);
  const lotB = shelfItems.filter((_, i) => i % 2 === 1);

  const mission1Items = lotA.slice(0, itemsPerMission);
  const mission2Items = tableItems.length > 0 ? tableItems.slice(0, itemsPerMission) : mission1Items;
  const mission3Items = (lotB.length > 0 ? lotB : lotA).slice(0, itemsPerMission);

  // Mission 1 : Livraison Lot A (Bac -> Table)
  if (mission1Items.length > 0) {
    generated.push(buildDeliveryMission(mission1Items, 'Lot A', 0));
  }
  // Mission 2 : Collecte & Réintégration des MÊMES articles (Table -> Bac : bilan net = 0 !)
  if (mission2Items.length > 0) {
    generated.push(buildCollectMission(mission2Items, 'Retour Lot A', 1));
  }
  // Mission 3 : Contrôle Inventaire sur place Lot B (bilan net = 0, aucune collision physique)
  if (mission3Items.length > 0) {
    generated.push(buildInventoryAuditMission(mission3Items, 'Lot B', 2));
  }

  return generated;
}
