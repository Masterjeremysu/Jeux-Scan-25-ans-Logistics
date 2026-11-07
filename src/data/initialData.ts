import { InventoryItem } from '../types';

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'item-1',
    sku: 'ART-KF40-INOX',
    name: 'Bride à Vide KF40 Inox 316L',
    category: 'Vide & Cryo',
    location: 'LOC-B01-T03',
    quantity: 28,
    unit: 'pcs',
    critical: true,
    batch: 'LOT-2026-KF09',
    description: 'Raccord rapide pour vide secondaire banc de dépôt couche mince.'
  },
  {
    id: 'item-2',
    sku: 'ART-VITON-KF40',
    name: 'Joint Élastomère Viton KF40 avec Bague',
    category: 'Vide & Cryo',
    location: 'LOC-B01-T04',
    quantity: 45,
    unit: 'pcs',
    critical: false,
    batch: 'LOT-2026-VIT22',
    description: 'Joint torique résistant aux dégazages pour ultra-vide.'
  },
  {
    id: 'item-3',
    sku: 'ART-WAFER-300MM',
    name: 'Lot Wafers Silicium Pur 300mm (FOSB 25x)',
    category: 'Microélectronique',
    location: 'LOC-SB-C01',
    quantity: 8,
    unit: 'boîtes',
    critical: true,
    batch: 'LOT-SIL-MINATEC-99',
    description: 'Plaquettes 300mm ultra-pures salle blanche ISO 5 LETI.'
  },
  {
    id: 'item-4',
    sku: 'ART-SACHET-ESD',
    name: 'Sachet Double Ensachage Antistatique ESD',
    category: 'Consommables',
    location: 'LOC-SB-C02',
    quantity: 120,
    unit: 'sacs',
    critical: false,
    batch: 'LOT-ESD-2026',
    description: 'Protection contre les décharges électrostatiques classe 0.'
  },
  {
    id: 'item-5',
    sku: 'ART-PUMP-EDWARDS',
    name: 'Pompe Turbo-Moléculaire Edwards 300kg',
    category: 'Vide & Cryo',
    location: 'LOC-A01-PAL01',
    quantity: 3,
    unit: 'unités',
    critical: true,
    batch: 'LOT-CRYO-EDW-03',
    description: 'Pompe pour bâtis épitaxie MBE, manipulation palan obligatoire.'
  },
  {
    id: 'item-6',
    sku: 'ART-CARTON-EXP',
    name: 'Carton Double Cannelure Sécurisé CEA',
    category: 'Consommables',
    location: 'LOC-PACK-ZONE',
    quantity: 65,
    unit: 'cartons',
    critical: false,
    batch: 'LOT-CTN-CEA-12',
    description: 'Carton renforcé agréé transport matériel scientifique fragile.'
  },
  {
    id: 'item-7',
    sku: 'ART-SCEL-SECURITE',
    name: 'Scellé Numéroté Inviolable IATA',
    category: 'Consommables',
    location: 'LOC-PACK-SCELL',
    quantity: 200,
    unit: 'scellés',
    critical: true,
    batch: 'LOT-SCL-IATA-01',
    description: 'Scellé inviolable pour fret aérien international.'
  }
];

export const BARCODE_CATALOG = [
  // Emplacements physiques
  { code: 'LOC-B01-T03', label: 'Emplacement Allée B - Tiroir T03 (Brides KF40)', type: 'location' },
  { code: 'LOC-B01-T04', label: 'Emplacement Allée B - Tiroir T04 (Joints Viton)', type: 'location' },
  { code: 'LOC-SB-C01', label: 'Emplacement Salle Blanche - Armoire C01 (Wafers)', type: 'location' },
  { code: 'LOC-PACK-ZONE', label: 'Emplacement Table Emballage & Conditionnement', type: 'location' },
  { code: 'DOCK-LETI-17', label: 'Quai Expédition Bâtiment 17 - LETI', type: 'dock' },
  { code: 'DOCK-INTL-FRET', label: 'Quai Expédition Fret International', type: 'dock' },

  // Articles & Pièces
  { code: 'ART-KF40-INOX', label: 'Pièce : Bride à Vide KF40 Inox', type: 'article' },
  { code: 'ART-VITON-KF40', label: 'Pièce : Joint Viton KF40', type: 'article' },
  { code: 'ART-WAFER-300MM', label: 'Boîte : Wafers Silicium 300mm FOSB', type: 'article' },
  { code: 'ART-SACHET-ESD', label: 'Consommable : Sachet Antistatique ESD', type: 'article' },
  { code: 'ART-CARTON-EXP', label: 'Colis : Carton Expédition Sécurisé', type: 'package' },
  { code: 'ART-SCEL-SECURITE', label: 'Sécurité : Scellé Numéroté Inviolable', type: 'seal' },

  // Bons de réception / Transporteur
  { code: 'BL-EDWARDS-9941', label: 'Bon de Livraison Fournisseur Edwards n°9941', type: 'package' }
];
