import * as THREE from 'three';

export type ModeDeJeu = 'dematerialise' | 'reel_phygital';

export interface EmplacementEntrepot {
  id: string; // Ex: 'LOC-A01-N1'
  allee: string; // 'A' | 'B' | 'C'
  nomAffiche: string; // 'Allée A - Rack 01 - Niv 1'
  position: THREE.Vector3;
  typeRangement: 'rack_palette' | 'armoire_tiroirs' | 'etagere_bacs';
}

export interface EtagereLivraison {
  id: string; // 'LIV-LETI17'
  nomBatiment: string; // 'Bâtiment 17 - LETI'
  codeCouleur: string;
  position: THREE.Vector3;
}

export interface PieceEnStock {
  id: string;
  reference: string;
  nom: string;
  quantiteEnStock: number;
  poidsKg: number;
  fragile: boolean;
  emplacementId: string;
  mesh?: THREE.Group;
}

export interface MissionPickingEntrepot {
  id: string;
  numeroCMD: string;
  titre: string;
  destinataireBatiment: string;
  etagereLivraisonId: string;
  priorite: 'NORMALE' | 'URGENTE' | 'CRITIQUE_SALLE_BLANCHE';
  referenceDemandee: string;
  nomPiece: string;
  quantiteDemandee: number;
  emplacementCibleId: string;
  codeBarreEmplacement: string;
  codeBarrePiece: string;
  codeBarreLivraison: string;

  // Étapes de validation du logisticien
  emplacementScanne: boolean;
  quantitePrelevee: boolean;
  colisPrepare: boolean;
  livreSurEtagere: boolean;
}
