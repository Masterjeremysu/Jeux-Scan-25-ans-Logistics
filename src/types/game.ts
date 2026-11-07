export type TypeHub = 'port' | 'aeroport' | 'centre_tri' | 'entrepot_regional';

export interface Position {
  x: number;
  y: number;
}

export interface Hub {
  id: string;
  nom: string;
  type: TypeHub;
  position: Position;
  capaciteStockage: number; // en palettes
  stockActuel: Marchandise[];
  niveauAmelioration: number; // 1 à 5
  bloque: boolean;
  raisonBlocage?: string;
}

export type TypeVehicule = 'camion_electrique' | 'train_fret' | 'cargo_maritime' | 'drone_express';

export interface CaracteristiquesVehicule {
  nom: string;
  capaciteMax: number; // en palettes
  vitesse: number; // pixels par seconde
  coutAchat: number; // en €
  coutParKm: number; // coût par pixel parcouru
  emissionCarbone: number; // g CO2/km
  couleur: string;
}

export interface Vehicule {
  id: string;
  nom: string;
  type: TypeVehicule;
  hubActuelId: string;
  hubDestinationId: string | null;
  position: Position;
  progressionRoute: number; // 0 (départ) à 1 (arrivée)
  enTransit: boolean;
  chargement: Marchandise[];
  capaciteMax: number;
  vitesse: number;
}

export type TypeMarchandise = 'alimentaire' | 'electronique' | 'pharmaceutique' | 'industriel';

export interface Marchandise {
  id: string;
  type: TypeMarchandise;
  nom: string;
  quantite: number; // palettes
  departHubId: string;
  destinationHubId: string;
  valeurUnitaire: number; // € par palette
  tempsRestant: number; // secondes avant pénalité de retard
  tempsInitial: number;
  penaliteRetard: number;
}

export interface RouteConnexion {
  id: string;
  hubSourceId: string;
  hubCibleId: string;
  distance: number;
  coutEntretienParSec: number;
  debitMaxVehicules: number;
  niveauRoute: number; // 1 (Départementale), 2 (Autoroute), 3 (Voie Intelligente)
}

export interface EvenementCrise {
  id: string;
  titre: string;
  description: string;
  impactType: 'blocage_hub' | 'hausse_carburant' | 'ralentissement_route' | 'boom_demande';
  hubCibleId?: string;
  dureeSecondes: number;
  tempsRestant: number;
}

export interface StatistiquesJeu {
  revenuTotal: number;
  coutTotal: number;
  palettesLivrees: number;
  livraisonsEnRetard: number;
  co2EmisTotal: number; // en kg
}
