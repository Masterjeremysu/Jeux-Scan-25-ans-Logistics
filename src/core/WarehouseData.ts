import * as THREE from 'three';
import { EmplacementEntrepot, EtagereLivraison, PieceEnStock, MissionPickingEntrepot } from '../types/game';

// 1. Les Emplacements de Stockage dans l'Entrepôt
export const EMPLACEMENTS_ENTREPOT: EmplacementEntrepot[] = [
  // Allée A : Palettiers lourds (Pompes & Bâtis de vide)
  {
    id: 'LOC-A01-N1',
    allee: 'A',
    nomAffiche: 'Allée A • Rack 01 - Niveau 1 (Sol)',
    position: new THREE.Vector3(-6, 0.5, -4),
    typeRangement: 'rack_palette',
  },
  {
    id: 'LOC-A02-N2',
    allee: 'A',
    nomAffiche: 'Allée A • Rack 02 - Niveau 2',
    position: new THREE.Vector3(-6, 1.8, 0),
    typeRangement: 'rack_palette',
  },

  // Allée B : Armoires à tiroirs métalliques & étagères à bacs (Petites pièces & Raccords)
  {
    id: 'LOC-B01-T03',
    allee: 'B',
    nomAffiche: 'Allée B • Armoire 01 - Tiroir 03',
    position: new THREE.Vector3(0, 1.0, -4),
    typeRangement: 'armoire_tiroirs',
  },
  {
    id: 'LOC-B02-B12',
    allee: 'B',
    nomAffiche: 'Allée B • Étagère 02 - Bac 12',
    position: new THREE.Vector3(0, 1.0, 0),
    typeRangement: 'etagere_bacs',
  },

  // Allée C : Armoires Salle Blanche (Wafers, FOSB & Électronique)
  {
    id: 'LOC-C01-F01',
    allee: 'C',
    nomAffiche: 'Allée C • Armoire Stérile - Casier FOSB Vert',
    position: new THREE.Vector3(6, 1.0, -4),
    typeRangement: 'armoire_tiroirs',
  },
  {
    id: 'LOC-C02-W02',
    allee: 'C',
    nomAffiche: 'Allée C • Armoire Wafers 200mm',
    position: new THREE.Vector3(6, 1.0, 0),
    typeRangement: 'armoire_tiroirs',
  },
];

// 2. Les Étagères de Livraison Finale précises (Quai d'expédition)
export const ETAGERES_LIVRAISON: EtagereLivraison[] = [
  {
    id: 'LIV-LETI17',
    nomBatiment: 'Bâtiment 17 • LETI (Nano-Caractérisation)',
    codeCouleur: '#f59e0b', // Jaune ambre
    position: new THREE.Vector3(-4.5, 0.8, 5.5),
  },
  {
    id: 'LIV-MIN22',
    nomBatiment: 'Bâtiment 22 • MINATEC (Salle Blanche)',
    codeCouleur: '#10b981', // Vert émeraude
    position: new THREE.Vector3(-1.5, 0.8, 5.5),
  },
  {
    id: 'LIV-IRIG51',
    nomBatiment: 'Bâtiment 51A • IRIG (Basses Températures)',
    codeCouleur: '#38bdf8', // Bleu cyan
    position: new THREE.Vector3(1.5, 0.8, 5.5),
  },
  {
    id: 'LIV-DECONTAM',
    nomBatiment: 'Sas Magasin Central • Contrôle & Décontam.',
    codeCouleur: '#ef4444', // Rouge
    position: new THREE.Vector3(4.5, 0.8, 5.5),
  },
];

// 3. Les Pièces rangées aux emplacements
export const PIECES_EN_STOCK_INITIALES: PieceEnStock[] = [
  {
    id: 'piece_pompe_seche',
    reference: 'CEA-POM-DRY300',
    nom: 'Pompe Industrielle Sèche 300 kg',
    quantiteEnStock: 2,
    poidsKg: 300,
    fragile: false,
    emplacementId: 'LOC-A01-N1',
  },
  {
    id: 'piece_pompe_turbo',
    reference: 'CEA-VAC-P900',
    nom: 'Pompe Turbomoléculaire 300 L/s',
    quantiteEnStock: 4,
    poidsKg: 8.5,
    fragile: true,
    emplacementId: 'LOC-A02-N2',
  },
  {
    id: 'piece_raccord_kf40',
    reference: 'CEA-KF40-INX',
    nom: 'Brides & Raccords KF40 Inox',
    quantiteEnStock: 24,
    poidsKg: 0.6,
    fragile: false,
    emplacementId: 'LOC-B01-T03',
  },
  {
    id: 'piece_jauge_pirani',
    reference: 'CEA-JAU-PIR5',
    nom: 'Jauge à Vide Pirani Active',
    quantiteEnStock: 8,
    poidsKg: 0.45,
    fragile: true,
    emplacementId: 'LOC-B02-B12',
  },
  {
    id: 'piece_fosb_vert',
    reference: 'CEA-FOSB-300V',
    nom: 'FOSB 300mm Vert Qualifié Salle Blanche',
    quantiteEnStock: 6,
    poidsKg: 5.2,
    fragile: true,
    emplacementId: 'LOC-C01-F01',
  },
  {
    id: 'piece_wafer_200',
    reference: 'CEA-WAF-200B',
    nom: 'Boîte Wafers 200mm Polycarbonate',
    quantiteEnStock: 12,
    poidsKg: 1.8,
    fragile: true,
    emplacementId: 'LOC-C02-W02',
  },
];

// 4. Les Missions WMS d'atelier
export const MISSIONS_PICKING_ENTREPOT: MissionPickingEntrepot[] = [
  {
    id: 'mis_wms_01',
    numeroCMD: 'CMD-CEA-2026-601',
    titre: 'Raccords Inox KF40 • LETI Bât. 17',
    destinataireBatiment: 'Bâtiment 17 - LETI',
    etagereLivraisonId: 'LIV-LETI17',
    priorite: 'URGENTE',
    referenceDemandee: 'CEA-KF40-INX',
    nomPiece: 'Brides & Raccords KF40 Inox',
    quantiteDemandee: 2,
    emplacementCibleId: 'LOC-B01-T03',
    codeBarreEmplacement: 'LOC-B01-T03',
    codeBarrePiece: 'CEA-KF40-INX',
    codeBarreLivraison: 'LIV-LETI17',
    emplacementScanne: false,
    quantitePrelevee: false,
    colisPrepare: false,
    livreSurEtagere: false,
  },
  {
    id: 'mis_wms_02',
    numeroCMD: 'CMD-CEA-2026-602',
    titre: 'FOSB Vert 300mm • Minatec Bât. 22',
    destinataireBatiment: 'Bâtiment 22 - Minatec Salle Blanche',
    etagereLivraisonId: 'LIV-MIN22',
    priorite: 'CRITIQUE_SALLE_BLANCHE',
    referenceDemandee: 'CEA-FOSB-300V',
    nomPiece: 'FOSB 300mm Vert Qualifié',
    quantiteDemandee: 1,
    emplacementCibleId: 'LOC-C01-F01',
    codeBarreEmplacement: 'LOC-C01-F01',
    codeBarrePiece: 'CEA-FOSB-300V',
    codeBarreLivraison: 'LIV-MIN22',
    emplacementScanne: false,
    quantitePrelevee: false,
    colisPrepare: false,
    livreSurEtagere: false,
  },
  {
    id: 'mis_wms_03',
    numeroCMD: 'CMD-CEA-2026-603',
    titre: 'Pompe Turbomoléculaire • IRIG Bât. 51A',
    destinataireBatiment: 'Bâtiment 51A - IRIG',
    etagereLivraisonId: 'LIV-IRIG51',
    priorite: 'URGENTE',
    referenceDemandee: 'CEA-VAC-P900',
    nomPiece: 'Pompe Turbomoléculaire 300 L/s',
    quantiteDemandee: 1,
    emplacementCibleId: 'LOC-A02-N2',
    codeBarreEmplacement: 'LOC-A02-N2',
    codeBarrePiece: 'CEA-VAC-P900',
    codeBarreLivraison: 'LIV-IRIG51',
    emplacementScanne: false,
    quantitePrelevee: false,
    colisPrepare: false,
    livreSurEtagere: false,
  },
];
