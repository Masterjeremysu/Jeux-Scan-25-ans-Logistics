import * as THREE from 'three';

export type DestinationLabo = 'nanotech' | 'cryogenie' | 'quantique' | 'decontamination';

export interface InfoColis {
  id: string;
  nom: string;
  destination: DestinationLabo;
  destinationNom: string;
  poidsKg: number;
  temperatureC: number;
  fragile: boolean;
  garderVertical: boolean; // ex: azote liquide ou puces sensibles
  description: string;
  codeBarre: string;
}

export interface ColisObjet3D {
  info: InfoColis;
  mesh: THREE.Group;
  forme: 'boite' | 'cylindre' | 'mallette';
  estPris: boolean;
  estPoseCorrectement: boolean;
  positionCibleY: number;
  velociteY: number;
  rotationVitesseY: number;
}

export interface ZoneDepot {
  id: DestinationLabo;
  nom: string;
  couleurHex: number;
  couleurCss: string;
  boiteEnglobante: THREE.Box3;
  mesh: THREE.Mesh;
}
