import { InventoryItem, WarehouseLocation } from '../types';

export const INITIAL_LOCATIONS: WarehouseLocation[] = [
  { id: 'loc-1', barcode: 'LOC-B01-T03', label: 'Armoire B01 (Allée B - Tiroir T03)', lrCode: 'LOC_B01_T03', crLabel: 'ARMOIRE ALLEE B TIROIR T03', zone: 'Magasin Central' },
  { id: 'loc-2', barcode: 'LOC-B01-T04', label: 'Armoire B01 (Allée B - Tiroir T04)', lrCode: 'LOC_B01_T04', crLabel: 'ARMOIRE ALLEE B TIROIR T04', zone: 'Magasin Central' },
  { id: 'loc-3', barcode: 'ZONE_POMPE_GRILLE_41', label: 'Zone Pompe Grille 41 (Stock Central)', lrCode: 'ZONE_PMP_41', crLabel: 'ZONE POMPE GRILLE 41', zone: 'Magasin Central' },
  { id: 'loc-4', barcode: 'LOC-ETAGERE-COLLECTE', label: 'Étagère de Collecte & Retours Clients', lrCode: 'ETA_COLLECT', crLabel: 'ETAGERE DE COLLECTE CLIENTS', zone: 'Quai Réception' },
  { id: 'loc-5', barcode: 'LOC-ETAGERE-LIVRAISON', label: 'Étagère de Livraison & Dépôt Client', lrCode: 'ETA_LIVR', crLabel: 'ETAGERE LIVRAISON CLIENT', zone: 'Quai Livraison' },
  { id: 'loc-6', barcode: 'LOC-ETA1-NIV1', label: 'Étagère 1 • Niveau 1 (Prise Colis)', lrCode: 'ETA_1_N1', crLabel: 'ETAGERE 1 NIVEAU BAS', zone: 'Poste 1' },
  { id: 'loc-7', barcode: 'LOC-ETA1-NIV2', label: 'Étagère 1 • Niveau 2 (Milieu)', lrCode: 'ETA_1_N2', crLabel: 'ETAGERE 1 NIVEAU MILIEU', zone: 'Poste 1' },
  { id: 'loc-8', barcode: 'LOC-ETA1-NIV3', label: 'Étagère 1 • Niveau 3 (Haut)', lrCode: 'ETA_1_N3', crLabel: 'ETAGERE 1 NIVEAU HAUT', zone: 'Poste 1' },
  { id: 'loc-9', barcode: 'LOC-ETA2-NIV1', label: 'Étagère 2 • Niveau 1 (Prise Colis)', lrCode: 'ETA_2_N1', crLabel: 'ETAGERE 2 NIVEAU BAS', zone: 'Poste 2' },
  { id: 'loc-10', barcode: 'LOC-ETA2-NIV2', label: 'Étagère 2 • Niveau 2 (Milieu)', lrCode: 'ETA_2_N2', crLabel: 'ETAGERE 2 NIVEAU MILIEU', zone: 'Poste 2' },
  { id: 'loc-11', barcode: 'LOC-ETA2-NIV3', label: 'Étagère 2 • Niveau 3 (Haut)', lrCode: 'ETA_2_N3', crLabel: 'ETAGERE 2 NIVEAU HAUT', zone: 'Poste 2' },
  { id: 'loc-12', barcode: 'ZONE_RECEPTION_CENTRALE', label: 'La Réception Centrale (Départs Étranger)', lrCode: 'REC_CENT', crLabel: 'LA RECEPTION CENTRALE DEPARTS', zone: 'Expédition' },
  { id: 'loc-13', barcode: 'DOCK-EXPED-01', label: 'Quai Expédition A (Poste 1)', lrCode: 'QAI_EXP_A', crLabel: 'QUAI EXPEDITION POSTE 1', zone: 'Quais' },
  { id: 'loc-14', barcode: 'DOCK-EXPED-02', label: 'Quai Expédition B (Poste 2)', lrCode: 'QAI_EXP_B', crLabel: 'QUAI EXPEDITION POSTE 2', zone: 'Quais' }
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'item-1',
    sku: 'REF191000007490', // Article exact exemple GT Logistics
    name: 'JOINT TORIQUE KALREZ (TUBE)',
    category: 'Vide & Cryo',
    location: 'LOC-B01-T04',
    quantity: 45,
    unit: 'pcs',
    critical: false,
    batch: 'LOT-2026-KLZ-01',
    description: 'Joint torique ultra-haute pureté résistant aux gaz corrosifs pour bâtis de dépôt.',
    lrCode: 'JNT_A001',
    crLabel: 'JOINT TORIQUE KALREZ (TUBE)',
    gestionnaire: 'GT Logistics',
    machinePdt: 'Bâti Dépôt PVD LETI-4',
    refEquipementier: 'DUPONT-KLZ-4079-USA'
  },
  {
    id: 'item-2',
    sku: 'ART-KF40-INOX',
    name: 'BRIDE A VIDE KF40 INOX 316L',
    category: 'Vide & Cryo',
    location: 'LOC-B01-T03',
    quantity: 28,
    unit: 'pcs',
    critical: true,
    batch: 'LOT-2026-KF09',
    description: 'Raccord rapide pour vide secondaire banc de dépôt couche mince.',
    lrCode: 'BRD_KF40',
    crLabel: 'BRIDE A VIDE KF40 INOX 316L',
    gestionnaire: 'GT Logistics',
    machinePdt: 'Générique Banc Vide',
    refEquipementier: 'EDW-KF40-316L'
  },
  {
    id: 'item-3',
    sku: 'ART-VITON-KF40',
    name: 'JOINT ELASTOMERE VITON KF40 AVEC BAGUE',
    category: 'Vide & Cryo',
    location: 'LOC-B01-T04',
    quantity: 32,
    unit: 'pcs',
    critical: false,
    batch: 'LOT-2026-VIT22',
    description: 'Joint torique résistant aux dégazages pour ultra-vide.',
    lrCode: 'JNT_VT40',
    crLabel: 'JOINT ELASTOMERE VITON KF40',
    gestionnaire: 'GT Logistics',
    machinePdt: 'Bâti Épitaxie MBE-02',
    refEquipementier: 'VIT-BA-40-ISO'
  },
  {
    id: 'item-4',
    sku: 'ART-WAFER-300MM',
    name: 'LOT WAFERS SILICIUM PUR 300MM (FOSB 25X)',
    category: 'Microélectronique',
    location: 'LOC-SB-C01',
    quantity: 8,
    unit: 'boîtes',
    critical: true,
    batch: 'LOT-SIL-MINATEC-99',
    description: 'Plaquettes 300mm ultra-pures salle blanche ISO 5 LETI.',
    lrCode: 'WFR_S300',
    crLabel: 'LOT WAFERS SILICIUM PUR 300MM',
    gestionnaire: 'CEA Minatec',
    machinePdt: 'Salle Blanche ISO 5',
    refEquipementier: 'MEMC-SIL-300-UHP'
  },
  {
    id: 'item-5',
    sku: 'ART-SACHET-ESD',
    name: 'SACHET DOUBLE ENSACHAGE ANTISTATIQUE ESD',
    category: 'Consommables',
    location: 'LOC-SB-C02',
    quantity: 120,
    unit: 'sacs',
    critical: false,
    batch: 'LOT-ESD-2026',
    description: 'Protection contre les décharges électrostatiques classe 0.',
    lrCode: 'SAC_ESD2',
    crLabel: 'SACHET DOUBLE ENSACHAGE ESD',
    gestionnaire: 'GT Logistics',
    machinePdt: 'Poste Emballage Salle Blanche',
    refEquipementier: 'ESD-SHIELD-PRO'
  },
  {
    id: 'item-6',
    sku: 'ART-PUMP-EDWARDS',
    name: 'POMPE TURBO-MOLECULAIRE EDWARDS 300KG',
    category: 'Vide & Cryo',
    location: 'ZONE_POMPE_GRILLE_41',
    quantity: 3,
    unit: 'unités',
    critical: true,
    batch: 'LOT-CRYO-EDW-03',
    description: 'Pompe pour bâtis épitaxie MBE, manipulation palan obligatoire.',
    lrCode: 'PMP_EDW3',
    crLabel: 'POMPE TURBO-MOLECULAIRE EDWARDS',
    gestionnaire: 'Magasin Central CEA',
    machinePdt: 'Zone Grille Palan Bât. 17',
    refEquipementier: 'EDW-STP-iXA3306'
  },
  {
    id: 'item-7',
    sku: 'ART-CARTON-EXP',
    name: 'CARTON DOUBLE CANNELURE SECURISE CEA',
    category: 'Consommables',
    location: 'LOC-PACK-ZONE',
    quantity: 65,
    unit: 'cartons',
    critical: false,
    batch: 'LOT-CTN-CEA-12',
    description: 'Carton renforcé agréé transport matériel scientifique fragile.',
    lrCode: 'CTN_DBL1',
    crLabel: 'CARTON DOUBLE CANNELURE CEA',
    gestionnaire: 'GT Logistics',
    machinePdt: 'Zone Expédition CEA',
    refEquipementier: 'CTN-CEA-HOMOLOGUE'
  },
  {
    id: 'item-8',
    sku: 'ART-SCEL-SECURITE',
    name: 'SCELLE NUMEROTE INVIOLABLE IATA',
    category: 'Consommables',
    location: 'LOC-PACK-SCELL',
    quantity: 200,
    unit: 'scellés',
    critical: true,
    batch: 'LOT-SCL-IATA-01',
    description: 'Scellé inviolable pour fret aérien international.',
    lrCode: 'SCL_IATA',
    crLabel: 'SCELLE INVIOLABLE IATA SECURISE',
    gestionnaire: 'GT Logistics',
    machinePdt: 'Fret Quai International',
    refEquipementier: 'IATA-SEC-SEAL-RED'
  }
];

export interface BarcodeItemCatalog {
  code: string;
  label: string;
  type: string;
  lrCode?: string;
  crLabel?: string;
  gestionnaire?: string;
  machinePdt?: string;
  refEquipementier?: string;
}

export const BARCODE_CATALOG: BarcodeItemCatalog[] = [
  // Étagères Stand Physique (2 étagères x 3 niveaux)
  { code: 'LOC-ETA1-NIV1', label: 'Étagère 1 • Niveau 1 (Bas)', type: 'location', lrCode: 'ETA_1_N1', crLabel: 'ETAGERE 1 NIVEAU BAS' },
  { code: 'LOC-ETA1-NIV2', label: 'Étagère 1 • Niveau 2 (Milieu)', type: 'location', lrCode: 'ETA_1_N2', crLabel: 'ETAGERE 1 NIVEAU MILIEU' },
  { code: 'LOC-ETA1-NIV3', label: 'Étagère 1 • Niveau 3 (Haut)', type: 'location', lrCode: 'ETA_1_N3', crLabel: 'ETAGERE 1 NIVEAU HAUT' },
  { code: 'LOC-ETA2-NIV1', label: 'Étagère 2 • Niveau 1 (Bas)', type: 'location', lrCode: 'ETA_2_N1', crLabel: 'ETAGERE 2 NIVEAU BAS' },
  { code: 'LOC-ETA2-NIV2', label: 'Étagère 2 • Niveau 2 (Milieu)', type: 'location', lrCode: 'ETA_2_N2', crLabel: 'ETAGERE 2 NIVEAU MILIEU' },
  { code: 'LOC-ETA2-NIV3', label: 'Étagère 2 • Niveau 3 (Haut)', type: 'location', lrCode: 'ETA_2_N3', crLabel: 'ETAGERE 2 NIVEAU HAUT' },

  // Quais d'Expédition du stand & Réception Centrale
  { code: 'ZONE_RECEPTION_CENTRALE', label: 'La Réception Centrale (Départs Étranger)', type: 'dock', lrCode: 'REC_CENT', crLabel: 'LA RECEPTION CENTRALE DEPARTS' },
  { code: 'LOC-ETAGERE-COLLECTE', label: 'Étagère de Collecte & Retours Clients', type: 'location', lrCode: 'ETA_COLLECT', crLabel: 'ETAGERE DE COLLECTE CLIENTS' },
  { code: 'LOC-ETAGERE-LIVRAISON', label: 'Étagère de Livraison & Dépôt Client', type: 'location', lrCode: 'ETA_LIVR', crLabel: 'ETAGERE LIVRAISON CLIENT' },
  { code: 'DOCK-EXPED-01', label: 'Quai Expédition A (Poste 1)', type: 'dock', lrCode: 'QAI_EXP_A', crLabel: 'QUAI EXPEDITION POSTE 1' },
  { code: 'DOCK-EXPED-02', label: 'Quai Expédition B (Poste 2)', type: 'dock', lrCode: 'QAI_EXP_B', crLabel: 'QUAI EXPEDITION POSTE 2' },
  { code: 'DOCK-LETI-17', label: 'Quai Expédition Bâtiment 17 - LETI', type: 'dock', lrCode: 'QAI_BAT17', crLabel: 'QUAI EXPEDITION BATIMENT 17' },
  { code: 'DOCK-INTL-FRET', label: 'Quai Expédition Fret International', type: 'dock', lrCode: 'QAI_INTL', crLabel: 'QUAI FRET INTERNATIONAL' },

  // Emplacements physiques classiques & Exemple Image PJ
  { code: 'ZONE_POMPE_GRILLE_41', label: 'Zone Pompe Grille 41', type: 'location', lrCode: 'ZONE_PMP_41', crLabel: 'ZONE POMPE GRILLE 41' },
  { code: 'LOC-B01-T03', label: 'Emplacement Allée B - Tiroir T03', type: 'location', lrCode: 'LOC_B01_T03', crLabel: 'ARMOIRE ALLEE B TIROIR T03' },
  { code: 'LOC-B01-T04', label: 'Emplacement Allée B - Tiroir T04', type: 'location', lrCode: 'LOC_B01_T04', crLabel: 'ARMOIRE ALLEE B TIROIR T04' },
  { code: 'LOC-SB-C01', label: 'Emplacement Salle Blanche - Armoire C01', type: 'location', lrCode: 'LOC_SB_C01', crLabel: 'SALLE BLANCHE ARMOIRE C01' },
  { code: 'LOC-SB-C02', label: 'Emplacement Salle Blanche - Armoire C02', type: 'location', lrCode: 'LOC_SB_C02', crLabel: 'SALLE BLANCHE ARMOIRE C02' },
  { code: 'LOC-PACK-ZONE', label: 'Emplacement Table Emballage & Conditionnement', type: 'location', lrCode: 'LOC_PACK_Z', crLabel: 'ZONE CONDITIONNEMENT CARTON' },
  { code: 'LOC-PACK-SCELL', label: 'Emplacement Casiers Scellés Sécurité', type: 'location', lrCode: 'LOC_SCELL', crLabel: 'ZONE SCELLES DE SECURITE' },

  // Articles & Pièces sur étagères avec exemple exact demandé
  { code: 'REF191000007490', label: 'Joint Torique Kalrez (Tube)', type: 'article', lrCode: 'JNT_A001', crLabel: 'JOINT TORIQUE KALREZ (TUBE)' },
  { code: 'ART-KF40-INOX', label: 'Bride à Vide KF40 Inox 316L', type: 'article', lrCode: 'BRD_KF40', crLabel: 'BRIDE A VIDE KF40 INOX 316L' },
  { code: 'ART-VITON-KF40', label: 'Joint Viton KF40 avec Bague', type: 'article', lrCode: 'JNT_VT40', crLabel: 'JOINT ELASTOMERE VITON KF40' },
  { code: 'ART-WAFER-300MM', label: 'Boîte : Wafers Silicium 300mm FOSB', type: 'article', lrCode: 'WFR_S300', crLabel: 'LOT WAFERS SILICIUM PUR 300MM' },
  { code: 'ART-SACHET-ESD', label: 'Consommable : Sachet Antistatique ESD', type: 'article', lrCode: 'SAC_ESD2', crLabel: 'SACHET DOUBLE ENSACHAGE ESD' },
  { code: 'ART-PUMP-EDWARDS', label: 'Pompe Turbo-Moléculaire Edwards 300kg', type: 'article', lrCode: 'PMP_EDW3', crLabel: 'POMPE TURBO-MOLECULAIRE EDWARDS' },
  { code: 'ART-CARTON-EXP', label: 'Colis : Carton Expédition Sécurisé', type: 'package', lrCode: 'CTN_DBL1', crLabel: 'CARTON DOUBLE CANNELURE CEA' },
  { code: 'ART-SCEL-SECURITE', label: 'Sécurité : Scellé Numéroté Inviolable', type: 'seal', lrCode: 'SCL_IATA', crLabel: 'SCELLE INVIOLABLE IATA SECURISE' },

  // Bons de réception / Transporteur & Manutention
  { code: 'DOC-TRANSPORT-INTL', label: 'Document de Transport International (Bordereau Colis)', type: 'package', lrCode: 'DOC_TRP', crLabel: 'DOCUMENT TRANSPORT EXPEDITION' },
  { code: 'BL-EDWARDS-9941', label: 'Bon de Livraison Fournisseur Edwards n°9941', type: 'package', lrCode: 'BL_EDW41', crLabel: 'BON DE LIVRAISON FOURNISSEUR' }
];
