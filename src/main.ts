import { Scene3D } from './render/Scene3D';
import { GestionnaireUI } from './ui/UIManager';
import { genererColisAleatoire } from './core/ParcelData';

// Initialisation de la scène 3D et du gestionnaire UI
const conteneur3D = document.getElementById('conteneur-3d')!;
const scene3D = new Scene3D(conteneur3D);
const ui = new GestionnaireUI();

// Liaisons d'événements 3D <-> UI
scene3D.onColisInspecte = info => {
  ui.afficherFicheColis(info);
};

scene3D.onColisValide = (succes, message, points) => {
  ui.actualiserScore(points, succes, message);
};

// Fonction pour faire arriver un nouveau colis sur le tapis roulant
function faireArriverNouveauColis(): void {
  if (scene3D.colisActifs.length >= 6) return; // Ne pas saturer le quai
  const colisInfo = genererColisAleatoire();
  scene3D.ajouterColis(colisInfo, colisInfo.forme);
}

// Bouton manuel d'arrivée
const btnNouveau = document.getElementById('btn-nouveau-colis');
btnNouveau?.addEventListener('click', () => {
  faireArriverNouveauColis();
});

// Arrivée des 3 premiers colis de départ
for (let i = 0; i < 3; i++) {
  faireArriverNouveauColis();
}

// Arrivée automatique de nouveaux colis par le camion
setInterval(() => {
  if (scene3D.colisActifs.length < 4) {
    faireArriverNouveauColis();
  }
}, 10000);

// Boucle de rendu Three.js
function boucleAnimation(): void {
  scene3D.update();
  requestAnimationFrame(boucleAnimation);
}

requestAnimationFrame(boucleAnimation);
