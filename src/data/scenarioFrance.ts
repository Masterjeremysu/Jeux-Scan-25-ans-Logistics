import { Hub, CaracteristiquesVehicule, TypeVehicule } from '../types/game';

// Configuration de base des Hubs (Positions ajustées pour une carte stylisée de la France)
export const HUBS_INITIAUX: Hub[] = [
  {
    id: 'hub_le_havre',
    nom: 'Le Havre Port',
    type: 'port',
    position: { x: 380, y: 170 },
    capaciteStockage: 600,
    stockActuel: [],
    niveauAmelioration: 1,
    bloque: false,
  },
  {
    id: 'hub_paris',
    nom: 'Paris Hub Central',
    type: 'centre_tri',
    position: { x: 490, y: 220 },
    capaciteStockage: 1000,
    stockActuel: [],
    niveauAmelioration: 1,
    bloque: false,
  },
  {
    id: 'hub_lille',
    nom: 'Lille Terminal Nord',
    type: 'entrepot_regional',
    position: { x: 510, y: 110 },
    capaciteStockage: 450,
    stockActuel: [],
    niveauAmelioration: 1,
    bloque: false,
  },
  {
    id: 'hub_strasbourg',
    nom: 'Strasbourg Euro-Plateforme',
    type: 'centre_tri',
    position: { x: 740, y: 220 },
    capaciteStockage: 500,
    stockActuel: [],
    niveauAmelioration: 1,
    bloque: false,
  },
  {
    id: 'hub_lyon',
    nom: 'Lyon Corridors Sud',
    type: 'centre_tri',
    position: { x: 600, y: 440 },
    capaciteStockage: 800,
    stockActuel: [],
    niveauAmelioration: 1,
    bloque: false,
  },
  {
    id: 'hub_bordeaux',
    nom: 'Bordeaux Atlantique',
    type: 'entrepot_regional',
    position: { x: 330, y: 480 },
    capaciteStockage: 500,
    stockActuel: [],
    niveauAmelioration: 1,
    bloque: false,
  },
  {
    id: 'hub_toulouse',
    nom: 'Toulouse AéroLog',
    type: 'aeroport',
    position: { x: 430, y: 570 },
    capaciteStockage: 400,
    stockActuel: [],
    niveauAmelioration: 1,
    bloque: false,
  },
  {
    id: 'hub_marseille',
    nom: 'Marseille Fos Port',
    type: 'port',
    position: { x: 630, y: 600 },
    capaciteStockage: 750,
    stockActuel: [],
    niveauAmelioration: 1,
    bloque: false,
  },
];

// Catalogue des véhicules disponibles à l'achat
export const CATALOGUE_VEHICULES: Record<TypeVehicule, CaracteristiquesVehicule> = {
  camion_electrique: {
    nom: 'Semi-Remorque Électrique',
    capaciteMax: 40,
    vitesse: 85,
    coutAchat: 25000,
    coutParKm: 0.15,
    emissionCarbone: 20,
    couleur: '#38bdf8', // bleu cyan
  },
  train_fret: {
    nom: 'Train Fret Électrifié',
    capaciteMax: 200,
    vitesse: 130,
    coutAchat: 120000,
    coutParKm: 0.08,
    emissionCarbone: 8,
    couleur: '#4ade80', // vert émeraude
  },
  cargo_maritime: {
    nom: 'Barge Fluviale / Maritime',
    capaciteMax: 500,
    vitesse: 50,
    coutAchat: 280000,
    coutParKm: 0.04,
    emissionCarbone: 12,
    couleur: '#fbbf24', // jaune ambre
  },
  drone_express: {
    nom: 'Drone Fret Longue Portée',
    capaciteMax: 10,
    vitesse: 180,
    coutAchat: 15000,
    coutParKm: 0.35,
    emissionCarbone: 5,
    couleur: '#f43f5e', // rose vif
  },
};
