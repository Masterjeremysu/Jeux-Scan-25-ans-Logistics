import { AppConfig, InventoryItem, Mission, MissionStep, WarehouseLocation } from '../types';

/**
 * Génère automatiquement des missions de Livraison (Sortie Bac -1 / Table +1)
 * et de Collecte (Retour Table -1 / Bac +1) 100 % cohérentes avec l'état physique
 * réel du stock Supabase (quantity en bac & onTableQty sur table).
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

  // Articles réellement posés sur la table prêts à être réintégrés (onTableQty >= 1)
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
      id: `mission-auto-livraison-${slotLabel}-${nowId}`,
      code: `LIV-${slotLabel.toUpperCase()}-${String(nowId).slice(-3)}`,
      title: `Livraison Client • ${slotLabel} (${chosenItems.length} réf.)`,
      client: (appConfig.clientsCatalog && appConfig.clientsCatalog[index % appConfig.clientsCatalog.length]) || appConfig.eventTitle || 'Client Labo',
      priority: 'URGENCE CRITIQUE',
      description: `Prélèvement en bac et dépôt sur la Table de Livraison : ${itemNames}. (Sortie -1 bac / +1 table)`,
      timeLimitSeconds: 150,
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
      id: `mission-auto-collecte-${slotLabel}-${nowId}`,
      code: `COL-${slotLabel.toUpperCase()}-${String(nowId).slice(-3)}`,
      title: `Collecte & Rangement Stock • ${slotLabel} (${chosenItems.length} réf.)`,
      client: `Retour Client → Magasin (${appConfig.eventTitle || 'GT Logistics'})`,
      priority: 'STANDARD',
      description: `Récupérer sur la Table de Collecte et réintégrer en bac : ${itemNames}. (Entrée +1 bac / -1 table)`,
      timeLimitSeconds: 150,
      basePoints: 1200,
      stockDirection: 'in',
      isActive: true,
      steps
    };
  };

  // Partitionne les articles en 2 lots disjoints (Étagère A / Étagère B) pour éviter toute collision entre Poste 1 et Poste 2
  const lotA = shelfItems.filter((_, i) => i % 2 === 0);
  const lotB = shelfItems.filter((_, i) => i % 2 === 1);

  if (lotA.length > 0) {
    generated.push(buildDeliveryMission(lotA.slice(0, itemsPerMission), 'Lot A', 0));
  }
  if (tableItems.length > 0) {
    generated.push(buildCollectMission(tableItems.slice(0, itemsPerMission), 'Retour Table', 1));
  }
  if (lotB.length > 0) {
    generated.push(buildDeliveryMission(lotB.slice(0, itemsPerMission), 'Lot B', 2));
  }
  // Si aucune pièce n'est encore sur la table, on génère une Collecte prête basée sur les premiers articles du lot A
  // (ils seront justement posés sur la table par la Mission 1 !)
  if (tableItems.length === 0 && lotA.length > 0) {
    generated.push(buildCollectMission(lotA.slice(0, itemsPerMission), 'Réintégration Lot A', 3));
  }

  return generated;
}
