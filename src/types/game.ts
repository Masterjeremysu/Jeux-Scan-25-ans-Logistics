import * as THREE from 'three';

export type ModeDeJeu = 'dematerialise' | 'reel_phygital';

export type TypeConditionnement = 
  | 'carton_standard'
  | 'palette_lourde_palan'
  | 'fosb_300mm'
  | 'boite_wafer_200mm';

export type CouleurFOSB = 'blanc' | 'vert' | 'rouge';

export interface PieceLogistique {
  id: string;
  reference: string;
  nom: string;
  categorie: 'pompe_300kg' | 'pompe_turbo' | 'raccord_vide' | 'jauge' | 'wafer_200' | 'wafer_fosb_300';
  poidsKg: number;
  fragile: boolean;
  necessiteDoubleEmballage: boolean;
  necessiteChipsCalage: boolean;
  couleurFosb?: CouleurFOSB;
  emplacementStock: string;
  mesh?: THREE.Group;
  estEmballee: boolean;
  positionInitiale: THREE.Vector3;
}

export interface ReferenceDemandee {
  reference: string;
  nom: string;
  quantiteRequise: number;
  quantiteScanee: number;
}

export interface MissionWMS {
  id: string;
  numeroCommande: string;
  type: 'picking_colis' | 'manutention_lourde_palan' | 'salle_blanche_fosb';
  conditionnement: TypeConditionnement;
  titre: string;
  destinataireBatiment: string;
  serviceDemandeur: string;
  priorite: 'NORMALE' | 'URGENTE' | 'CRITIQUE_SALLE_BLANCHE';
  references: ReferenceDemandee[];
  
  // Protocoles de sécurité & conditionnement
  necessitePalan: boolean;
  necessiteSanglage: boolean;
  necessiteDoubleEmballage: boolean;
  necessiteChipsCalage: boolean;
  couleurFosb?: CouleurFOSB;

  // Statuts d'avancement
  chipsAjoutees: boolean;
  doubleEmballageFait: boolean;
  sanglesPosees: boolean;
  palanPositionne: boolean;
  statut: 'en_cours' | 'pieces_chargees' | 'scotche' | 'etiquete' | 'livre';
  codeBarreExpedition: string;
}
