import { SimulationLogistique } from './core/Simulation';
import { RenduCanvas } from './render/CanvasRenderer';
import { GestionnaireUI } from './ui/UIManager';

// Initialisation globale
const canvas = document.getElementById('canvas-jeu') as HTMLCanvasElement;
const simulation = new SimulationLogistique();
const renderer = new RenduCanvas(canvas, simulation);
const ui = new GestionnaireUI(simulation);

// Gestion des clics sur la carte
canvas.addEventListener('click', (event: MouseEvent) => {
  const hubClique = renderer.detecterHubClique(event.clientX, event.clientY);
  if (hubClique) {
    ui.selectionnerHub(hubClique.id);
  } else {
    // Si on clique dans le vide sans être en mode construction, fermer le panneau
    if (!simulation.modeConstructionRoute.sourceHubId) {
      ui.selectionnerHub(null);
    }
  }
});

// Boucle principale de jeu
let dernierTemps = performance.now();

function boucleDeJeu(tempsActuel: number): void {
  const deltaSec = Math.min((tempsActuel - dernierTemps) / 1000, 0.1);
  dernierTemps = tempsActuel;

  // 1. Logique métier & simulation
  simulation.update(deltaSec);

  // 2. Rendu graphique
  const rect = canvas.getBoundingClientRect();
  renderer.render(rect.width, rect.height);

  // 3. Rafraîchissement HUD
  ui.rafraichir();

  requestAnimationFrame(boucleDeJeu);
}

// Lancement de la boucle
requestAnimationFrame(boucleDeJeu);
