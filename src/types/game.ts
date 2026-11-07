import * as THREE from 'three';

export type ModeDeJeu = 'dematerialise' | 'reel_phygital';

export interface PieceLogistique {
  id: string;
  reference: string;
  nom: string;
  categorie: 'pompe' | 'raccord_vide' | 'jauge' | 'silicium' | 'produit_chimique';
  poidsKg: number;
  fragile: boolean;
  emplacementStock: string; // Ex: Allée A-02-N1
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
  type: 'picking_colis' | 'manutention_pompe' | 'collecte_reintegration';
  titre: string;
  destinataireBatiment: string;
  serviceDemandeur: string;
  priorite: 'NORMALE' | 'URGENTE' | 'CRITIQUE_SALLE_BLANCHE';
  references: ReferenceDemandee[];
  statut: 'en_cours' | 'pieces_chargees' | 'scotche' | 'etiquete' | 'livre';
  codeBarreExpedition: string;
}
