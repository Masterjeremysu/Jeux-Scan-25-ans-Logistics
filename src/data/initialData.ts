import { InventoryItem } from '../types';

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'item-1',
    sku: 'REF191000000478', // Article exact exemple GT Logistics
    name: 'Joint Torique Kalrez (Tube)',
    category: 'Vide & Cryo',
    location: 'LOC-B01-T04',
    quantity: 45,
    unit: 'pcs',
    critical: false,
    batch: 'LOT-2026-KLZ-01',
    description: 'Joint torique ultra-haute pureté résistant aux gaz corrosifs pour bâtis de dépôt.',
    lrCode: 'JNT_A001',
    crLabel: 'JOINT TORIQUE KALREZ (TUBE)'
  },
  {
    id: 'item-2',
    sku: 'ART-KF40-INOX',
    name: 'Bride à Vide KF40 Inox 316L',
    category: 'Vide & Cryo',
    location: 'LOC-B01-T03',
    quantity: 28,
    unit: 'pcs',
    critical: true,
    batch: 'LOT-2026-KF09',
    description: 'Raccord rapide pour vide secondaire banc de dépôt couche mince.',
    lrCode: 'BRD_KF40',
    crLabel: 'BRIDE A VIDE KF40 INOX 316L'
  },
  {
    id: 'item-3',
    sku: 'ART-VITON-KF40',
    name: 'Joint Élastomère Viton KF40 avec Bague',
    category: 'Vide & Cryo',
    location: 'LOC-B01-T04',
    quantity: 32,
    unit: 'pcs',
    critical: false,
    batch: 'LOT-2026-VIT22',
    description: 'Joint torique résistant aux dégazages pour ultra-vide.',
    lrCode: 'JNT_VT40',
    crLabel: 'JOINT ELASTOMERE VITON KF40'
  },
  {
    id: 'item-4',
    sku: 'ART-WAFER-300MM',
    name: 'Lot Wafers Silicium Pur 300mm (FOSB 25x)',
    category: 'Microélectronique',
    location: 'LOC-SB-C01',
    quantity: 8,
    unit: 'boîtes',
    critical: true,
    batch: 'LOT-SIL-MINATEC-99',
    description: 'Plaquettes 300mm ultra-pures salle blanche ISO 5 LETI.',
    lrCode: 'WFR_S300',
    crLabel: 'LOT WAFERS SILICIUM PUR 300MM'
  },
  {
    id: 'item-5',
    sku: 'ART-SACHET-ESD',
    name: 'Sachet Double Ensachage Antistatique ESD',
    category: 'Consommables',
    location: 'LOC-SB-C02',
    quantity: 120,
    unit: 'sacs',
    critical: false,
    batch: 'LOT-ESD-2026',
    description: 'Protection contre les décharges électrostatiques classe 0.',
    lrCode: 'SAC_ESD2',
    crLabel: 'SACHET DOUBLE ENSACHAGE ESD'
  },
  {
    id: 'item-6',
    sku: 'ART-PUMP-EDWARDS',
    name: 'Pompe Turbo-Moléculaire Edwards 300kg',
    category: 'Vide & Cryo',
    location: 'LOC-A01-PAL01',
    quantity: 3,
    unit: 'unités',
    critical: true,
    batch: 'LOT-CRYO-EDW-03',
    description: 'Pompe pour bâtis épitaxie MBE, manipulation palan obligatoire.',
    lrCode: 'PMP_EDW3',
    crLabel: 'POMPE TURBO-MOLECULAIRE EDWARDS'
  },
  {
    id: 'item-7',
    sku: 'ART-CARTON-EXP',
    name: 'Carton Double Cannelure Sécurisé CEA',
    category: 'Consommables',
    location: 'LOC-PACK-ZONE',
    quantity: 65,
    unit: 'cartons',
    critical: false,
    batch: 'LOT-CTN-CEA-12',
    description: 'Carton renforcé agréé transport matériel scientifique fragile.',
    lrCode: 'CTN_DBL1',
    crLabel: 'CARTON DOUBLE CANNELURE CEA'
  },
  {
    id: 'item-8',
    sku: 'ART-SCEL-SECURITE',
    name: 'Scellé Numéroté Inviolable IATA',
    category: 'Consommables',
    location: 'LOC-PACK-SCELL',
    quantity: 200,
    unit: 'scellés',
    critical: true,
    batch: 'LOT-SCL-IATA-01',
    description: 'Scellé inviolable pour fret aérien international.',
    lrCode: 'SCL_IATA',
    crLabel: 'SCELLE INVIOLABLE IATA SECURISE'
  }
];

export interface BarcodeItemCatalog {
  code: string;
  label: string;
  type: string;
  lrCode?: string;
  crLabel?: string;
}

export const BARCODE_CATALOG: BarcodeItemCatalog[] = [
  // Étagères Stand Physique (2 étagères x 3 niveaux)
  { code: 'LOC-ETA1-NIV1', label: 'Étagère 1 • Niveau 1 (Bas)', type: 'location', lrCode: 'ETA_1_N1', crLabel: 'ETAGERE 1 NIVEAU BAS' },
  { code: 'LOC-ETA1-NIV2', label: 'Étagère 1 • Niveau 2 (Milieu)', type: 'location', lrCode: 'ETA_1_N2', crLabel: 'ETAGERE 1 NIVEAU MILIEU' },
  { code: 'LOC-ETA1-NIV3', label: 'Étagère 1 • Niveau 3 (Haut)', type: 'location', lrCode: 'ETA_1_N3', crLabel: 'ETAGERE 1 NIVEAU HAUT' },
  { code: 'LOC-ETA2-NIV1', label: 'Étagère 2 • Niveau 1 (Bas)', type: 'location', lrCode: 'ETA_2_N1', crLabel: 'ETAGERE 2 NIVEAU BAS' },
  { code: 'LOC-ETA2-NIV2', label: 'Étagère 2 • Niveau 2 (Milieu)', type: 'location', lrCode: 'ETA_2_N2', crLabel: 'ETAGERE 2 NIVEAU MILIEU' },
  { code: 'LOC-ETA2-NIV3', label: 'Étagère 2 • Niveau 3 (Haut)', type: 'location', lrCode: 'ETA_2_N3', crLabel: 'ETAGERE 2 NIVEAU HAUT' },

  // Quais d'Expédition du stand
  { code: 'DOCK-EXPED-01', label: 'Quai Expédition A (Poste 1)', type: 'dock', lrCode: 'QAI_EXP_A', crLabel: 'QUAI EXPEDITION POSTE 1' },
  { code: 'DOCK-EXPED-02', label: 'Quai Expédition B (Poste 2)', type: 'dock', lrCode: 'QAI_EXP_B', crLabel: 'QUAI EXPEDITION POSTE 2' },
  { code: 'DOCK-LETI-17', label: 'Quai Expédition Bâtiment 17 - LETI', type: 'dock', lrCode: 'QAI_BAT17', crLabel: 'QUAI EXPEDITION BATIMENT 17' },
  { code: 'DOCK-INTL-FRET', label: 'Quai Expédition Fret International', type: 'dock', lrCode: 'QAI_INTL', crLabel: 'QUAI FRET INTERNATIONAL' },

  // Emplacements physiques classiques
  { code: 'LOC-B01-T03', label: 'Emplacement Allée B - Tiroir T03', type: 'location', lrCode: 'LOC_B01_T03', crLabel: 'ARMOIRE ALLEE B TIROIR T03' },
  { code: 'LOC-B01-T04', label: 'Emplacement Allée B - Tiroir T04', type: 'location', lrCode: 'LOC_B01_T04', crLabel: 'ARMOIRE ALLEE B TIROIR T04' },
  { code: 'LOC-SB-C01', label: 'Emplacement Salle Blanche - Armoire C01', type: 'location', lrCode: 'LOC_SB_C01', crLabel: 'SALLE BLANCHE ARMOIRE C01' },
  { code: 'LOC-PACK-ZONE', label: 'Emplacement Table Emballage & Conditionnement', type: 'location', lrCode: 'LOC_PACK_Z', crLabel: 'ZONE CONDITIONNEMENT CARTON' },

  // Articles & Pièces sur étagères avec exemple réel GT
  { code: 'REF191000000478', label: 'Joint Torique Kalrez (Tube)', type: 'article', lrCode: 'JNT_A001', crLabel: 'JOINT TORIQUE KALREZ (TUBE)' },
  { code: 'ART-KF40-INOX', label: 'Bride à Vide KF40 Inox 316L', type: 'article', lrCode: 'BRD_KF40', crLabel: 'BRIDE A VIDE KF40 INOX 316L' },
  { code: 'ART-VITON-KF40', label: 'Joint Viton KF40 avec Bague', type: 'article', lrCode: 'JNT_VT40', crLabel: 'JOINT ELASTOMERE VITON KF40' },
  { code: 'ART-WAFER-300MM', label: 'Boîte : Wafers Silicium 300mm FOSB', type: 'article', lrCode: 'WFR_S300', crLabel: 'LOT WAFERS SILICIUM PUR 300MM' },
  { code: 'ART-SACHET-ESD', label: 'Consommable : Sachet Antistatique ESD', type: 'article', lrCode: 'SAC_ESD2', crLabel: 'SACHET DOUBLE ENSACHAGE ESD' },
  { code: 'ART-CARTON-EXP', label: 'Colis : Carton Expédition Sécurisé', type: 'package', lrCode: 'CTN_DBL1', crLabel: 'CARTON DOUBLE CANNELURE CEA' },
  { code: 'ART-SCEL-SECURITE', label: 'Sécurité : Scellé Numéroté Inviolable', type: 'seal', lrCode: 'SCL_IATA', crLabel: 'SCELLE INVIOLABLE IATA SECURISE' },

  // Bons de réception / Transporteur
  { code: 'BL-EDWARDS-9941', label: 'Bon de Livraison Fournisseur Edwards n°9941', type: 'package', lrCode: 'BL_EDW41', crLabel: 'BON DE LIVRAISON FOURNISSEUR' }
];
