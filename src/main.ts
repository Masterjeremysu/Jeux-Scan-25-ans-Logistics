import { EtabliPreparation3D } from './render/Workbench3D';
import { ZebraPDA } from './ui/ZebraPDA';
import { ImprimanteEtiquettesReelles } from './ui/LabelPrinter';
import { AudioEffets } from './audio/SoundEffects';
import { MISSIONS_WMS_INITIALES, CATALOGUE_PIECES_STOCK } from './core/MissionsData';
import { ModeDeJeu, MissionWMS } from './types/game';
import confetti from 'canvas-confetti';

// 1. Initialisations
const audio = new AudioEffets();
const conteneur3D = document.getElementById('conteneur-3d')!;
const etabli3D = new EtabliPreparation3D(conteneur3D, audio);
const zebra = new ZebraPDA();
const imprimante = new ImprimanteEtiquettesReelles();

let modeActuel: ModeDeJeu = 'dematerialise';
let indexMission = 0;
let totalColisExpedies = 0;

const elStatColis = document.getElementById('stat-colis-prepares')!;
const elBanniere = document.getElementById('banniere-feedback')!;
const elListePiecesStock = document.getElementById('liste-pieces-stock')!;

function afficherNotification(message: string, succes: boolean): void {
  elBanniere.textContent = message;
  elBanniere.className = `banniere-status active ${succes ? 'succes' : 'erreur'}`;
  setTimeout(() => {
    elBanniere.className = 'banniere-status';
  }, 3500);
}

// 2. Gestion du Switch : Virtuel Dématérialisé vs Mode Réel
const btnModeDemat = document.getElementById('btn-mode-demat')!;
const btnModeReel = document.getElementById('btn-mode-reel')!;

btnModeDemat.addEventListener('click', () => {
  modeActuel = 'dematerialise';
  zebra.modeJeu = 'dematerialise';
  btnModeDemat.classList.add('actif');
  btnModeReel.classList.remove('actif');
  afficherNotification('🖥️ Mode Virtuel actif : Tout se passe dans le jumeau numérique 3D.', true);
});

btnModeReel.addEventListener('click', () => {
  modeActuel = 'reel_phygital';
  zebra.modeJeu = 'reel_phygital';
  btnModeReel.classList.add('actif');
  btnModeDemat.classList.remove('actif');
  afficherNotification('🖨️ Mode Réel Phygital actif : Les étiquettes sont imprimées et scannées réellement !', true);
});

// 3. Affichage du stock disponible dans le panneau gauche
function rafraichirPanneauStock(): void {
  elListePiecesStock.innerHTML = '';
  for (const piece of CATALOGUE_PIECES_STOCK) {
    const li = document.createElement('li');
    li.className = 'stock-item';
    li.innerHTML = `
      <div>
        <strong>${piece.nom}</strong>
        <code>${piece.reference} (${piece.poidsKg} kg)</code>
      </div>
      <div class="emplacement">${piece.emplacementStock}</div>
    `;
    elListePiecesStock.appendChild(li);
  }
}

// 4. Lancement d'une mission WMS
function chargerMission(mission: MissionWMS): void {
  const missionCopie: MissionWMS = JSON.parse(JSON.stringify(mission));
  zebra.afficherMission(missionCopie);
  etabli3D.chargerMission(missionCopie);
  afficherNotification(`📋 Ordre WMS : ${missionCopie.titre}`, true);
}

// Bouton Nouvelle Mission
document.getElementById('btn-mission-suivante')?.addEventListener('click', () => {
  indexMission = (indexMission + 1) % MISSIONS_WMS_INITIALES.length;
  chargerMission(MISSIONS_WMS_INITIALES[indexMission]);
});

// 5. Liaisons d'événements Établi 3D -> Zebra
etabli3D.onPieceScaneeEtInjectee = piece => {
  zebra.validerPiece(piece);
  afficherNotification(`📦 Pièce chargée : ${piece.nom} [${piece.reference}]`, true);
};

// 6. Actions spécialisées du Zebra WMS
// A. Action Palan d'atelier 300 kg
zebra.onActionPalan = () => {
  const ok = etabli3D.actionnerPalan300kg();
  if (ok) {
    zebra.marquerPalanFait();
    afficherNotification('🏗️ Palan actionné : Pompe 300 kg déposée au centre de la palette Europe !', true);
  }
};

// B. Action Sanglage à cliquet 5T
zebra.onActionSangler = () => {
  const ok = etabli3D.sanglerPompe300kg();
  if (ok) {
    zebra.marquerSanglageFait();
    afficherNotification('🪢 Sanglage 5T verrouillé : Pompe 300 kg arrimée en toute sécurité !', true);
  }
};

// C. Action Chips de Calage pour pièces fragiles
zebra.onActionChips = () => {
  const ok = etabli3D.verserChipsCalage();
  if (ok) {
    zebra.marquerChipsFaites();
    afficherNotification('🍿 Doseur actionné : Chips de calage polystyrène injectées autour des capteurs !', true);
  }
};

// D. Action Double Emballage Salle Blanche
zebra.onActionDoubleBag = () => {
  const ok = etabli3D.appliquerDoubleEmballage();
  if (ok) {
    zebra.marquerDoubleBagFait();
    afficherNotification('🛡️ Thermosoudeuse : Double sachet stérile scellé sous atmosphère contrôlée !', true);
  }
};

// E. Scotchage du carton
zebra.onDemandeScotchage = () => {
  const reussi = etabli3D.scotcherCarton();
  if (reussi) {
    zebra.marquerScotche();
    afficherNotification('📦 Carton fermé et scellé avec le scotch adhésif !', true);
  }
};

// 7. Expédition & Impression (selon le Mode Réel ou Dématérialisé)
zebra.onDemandeExpedition = () => {
  if (!zebra.missionActuelle) return;

  if (modeActuel === 'reel_phygital') {
    imprimante.ouvrirEtiquette(zebra.missionActuelle);
  } else {
    etabli3D.poserEtiquetteExpedition();
    finaliserExpedition();
  }
};

imprimante.onScanReelValide = (code) => {
  if (zebra.missionActuelle && code === zebra.missionActuelle.codeBarreExpedition) {
    etabli3D.poserEtiquetteExpedition();
    finaliserExpedition();
    afficherNotification(`✅ Étiquette réelle ${code} validée au scanner !`, true);
  } else {
    audio.playError();
    afficherNotification(`❌ Code-barres erroné ou non conforme !`, false);
  }
};

function finaliserExpedition(): void {
  totalColisExpedies++;
  elStatColis.textContent = `${totalColisExpedies}`;
  confetti({ particleCount: 90, spread: 75, origin: { x: 0.5, y: 0.6 } });
  afficherNotification('🚀 Expédition validée pour livraison sur le site du CEA Grenoble !', true);

  setTimeout(() => {
    indexMission = (indexMission + 1) % MISSIONS_WMS_INITIALES.length;
    chargerMission(MISSIONS_WMS_INITIALES[indexMission]);
  }, 3200);
}

// 8. Démarrage
rafraichirPanneauStock();
chargerMission(MISSIONS_WMS_INITIALES[0]);

function boucleRendu(): void {
  etabli3D.render();
  requestAnimationFrame(boucleRendu);
}
requestAnimationFrame(boucleRendu);
