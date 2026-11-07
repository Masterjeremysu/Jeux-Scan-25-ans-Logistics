import { InfoColis, DestinationLabo } from '../types/game';

export interface ModeleColisCEA {
  nom: string;
  destination: DestinationLabo;
  destinationNom: string;
  forme: 'boite' | 'cylindre' | 'mallette';
  fragile: boolean;
  garderVertical: boolean;
  temperatureC: number;
  poidsKg: number;
  description: string;
}

export const CATALOGUE_COLIS_CEA: ModeleColisCEA[] = [
  {
    nom: 'Lot Wafers 300mm Silicium',
    destination: 'nanotech',
    destinationNom: 'Minatec - Salle Blanche Bât. 17',
    forme: 'boite',
    fragile: true,
    garderVertical: true,
    temperatureC: 21,
    poidsKg: 3.8,
    description: 'Substrats de micro-puces 2nm scellés sous atmosphère inerte d\'argon. Chocs interdits.',
  },
  {
    nom: 'Cuve Dewar Azote Liquide',
    destination: 'cryogenie',
    destinationNom: 'SBT - Service des Basses Températures',
    forme: 'cylindre',
    fragile: false,
    garderVertical: true,
    temperatureC: -196,
    poidsKg: 14.2,
    description: 'Échantillon supraconducteur à haute criticité. Risque de fuite si renversé !',
  },
  {
    nom: 'Coffret Processeur Qubit Spin',
    destination: 'quantique',
    destinationNom: 'IRIG - Laboratoire Quantique',
    forme: 'mallette',
    fragile: true,
    garderVertical: false,
    temperatureC: -273,
    poidsKg: 5.4,
    description: 'Puce de calcul quantique à spins de silicium. Blindage magnétique renforcé.',
  },
  {
    nom: 'Filtre Échangeur Ionique Déchu',
    destination: 'decontamination',
    destinationNom: 'Sas Décontamination & Contrôle Radiologique',
    forme: 'cylindre',
    fragile: false,
    garderVertical: true,
    temperatureC: 18,
    poidsKg: 22.0,
    description: 'Composant de circuit fermé à inspecter avant recyclage ou stockage sécurisé.',
  },
  {
    nom: 'Micro-Capteurs Spatiaux Infrarouge',
    destination: 'nanotech',
    destinationNom: 'LETI - Laboratoire d\'Optique Spatiale',
    forme: 'boite',
    fragile: true,
    garderVertical: false,
    temperatureC: 19,
    poidsKg: 1.2,
    description: 'Détecteurs pour télescopes orbitaux. Fragilité extrême, ne pas secouer.',
  },
  {
    nom: 'Cryostat Dilution Hélium-3/4',
    destination: 'cryogenie',
    destinationNom: 'SBT - Service des Basses Températures',
    forme: 'cylindre',
    fragile: true,
    garderVertical: true,
    temperatureC: -269,
    poidsKg: 18.5,
    description: 'Système de refroidissement milliKelvin. Maintenir scrupuleusement la tête vers le haut.',
  },
];

let compteurColis = 100;

export function genererColisAleatoire(): InfoColis & { forme: 'boite' | 'cylindre' | 'mallette' } {
  const modele = CATALOGUE_COLIS_CEA[Math.floor(Math.random() * CATALOGUE_COLIS_CEA.length)];
  compteurColis++;
  return {
    ...modele,
    id: `CEA-GRE-${compteurColis}`,
    codeBarre: `FR-GRE-${compteurColis}-${Math.floor(Math.random() * 899 + 100)}`,
  };
}
