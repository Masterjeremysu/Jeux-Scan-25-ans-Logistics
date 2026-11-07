import { Entrepot3D } from './render/Warehouse3D';
import { ZebraPDA } from './ui/ZebraPDA';
import { ImprimanteEtiquettesReelles } from './ui/LabelPrinter';
import { AudioEffets } from './audio/SoundEffects';
import { MISSIONS_PICKING_ENTREPOT, EMPLACEMENTS_ENTREPOT } from './core/WarehouseData';
import { ModeDeJeu, MissionPickingEntrepot } from './types/game';
import confetti from 'canvas-confetti';

// 1. Initialisations
const audio = new AudioEffets();
const conteneur3D = document.getElementById('conteneur-3d')!;
const entrepot3D = new Entrepot3D(conteneur3D, audio);
const zebra = new ZebraPDA();
const imprimante = new ImprimanteEtiquettesReelles();

let modeActuel: ModeDeJeu = 'dematerialise';
let indexMission = 0;
let missionsCompletees = 0;

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

// 2. Switch Mode Virtuel vs Mode Réel
const btnModeDemat = document.getElementById('btn-mode-demat')!;
const btnModeReel = document.getElementById('btn-mode-reel')!;

btnModeDemat.addEventListener('click', () => {
  modeActuel = 'dematerialise';
  zebra.modeJeu = 'dematerialise';
  btnModeDemat.classList.add('actif');
  btnModeReel.classList.remove('actif');
  afficherNotification('🖥️ Mode Virtuel actif : Tout se déroule dans l\'entrepôt 3D.', true);
});

btnModeReel.addEventListener('click', () => {
  modeActuel = 'reel_phygital';
  zebra.modeJeu = 'reel_phygital';
  btnModeReel.classList.add('actif');
  btnModeDemat.classList.remove('actif');
  afficherNotification('🖨️ Mode Réel Phygital actif : Impression et scan réels d\'étiquettes !', true);
});

// 3. Affichage du plan des emplacements
function rafraichirPlanEmplacements(): void {
  elListePiecesStock.innerHTML = '';
  for (const loc of EMPLACEMENTS_ENTREPOT) {
    const li = document.createElement('li');
    li.className = 'stock-item';
    li.style.cursor = 'pointer';
    li.innerHTML = `
      <div>
        <strong>${loc.nomAffiche}</strong>
        <code>Code : ${loc.id}</code>
      </div>
      <div class="emplacement">Allée ${loc.allee} ➡️</div>
    `;
    li.addEventListener('click', () => {
      entrepot3D.allerVers(loc.position);
      afficherNotification(`🚶 Déplacement vers [${loc.nomAffiche}]`, true);
    });
    elListePiecesStock.appendChild(li);
  }
}

// 4. Lancement de la Mission WMS
function chargerMission(mission: MissionPickingEntrepot): void {
  const missionCopie: MissionPickingEntrepot = JSON.parse(JSON.stringify(mission));
  zebra.afficherMission(missionCopie);
  afficherNotification(`📋 Ordre WMS reçu : ${missionCopie.titre}`, true);
}

document.getElementById('btn-mission-suivante')?.addEventListener('click', () => {
  indexMission = (indexMission + 1) % MISSIONS_PICKING_ENTREPOT.length;
  chargerMission(MISSIONS_PICKING_ENTREPOT[indexMission]);
});

// 5. Actions du Zebra
// A. Déclenchement du Scan Laser (ESPACE ou Bouton Zebra)
function actionnerScanLaser(): void {
  const resultat = entrepot3D.declencherScanLaser();
  const mis = zebra.missionActuelle;
  if (!mis) return;

  if (resultat.type === 'emplacement') {
    if (resultat.id === mis.emplacementCibleId) {
      audio.playScanner();
      zebra.marquerEmplacementValide();
      afficherNotification(`✅ Emplacement ${resultat.id} scanné et validé !`, true);
    } else {
      audio.playError();
      afficherNotification(`❌ Mauvais emplacement ! Vous êtes devant [${resultat.id}], attendu : [${mis.emplacementCibleId}]`, false);
    }
  } else if (resultat.type === 'etagere') {
    if (resultat.id === mis.etagereLivraisonId) {
      if (mis.colisPrepare) {
        validerLivraisonFinale();
      } else {
        afficherNotification(`⚠️ Vous devez d'abord préparer et scotcher le carton à l'établi central !`, false);
      }
    } else {
      audio.playError();
      afficherNotification(`❌ Mauvaise étagère ! Ce colis doit être livré sur [${mis.etagereLivraisonId}]`, false);
    }
  } else {
    afficherNotification(`🔍 Aucun code-barre à portée. Rapprochez-vous d'un rack ou d'une étagère.`, false);
  }
}

zebra.onDeclencherScanLaser = () => actionnerScanLaser();

// Raccourci barre d'espace pour bipper
window.addEventListener('keydown', e => {
  if (e.code === 'Space' && (document.activeElement?.tagName !== 'INPUT')) {
    e.preventDefault();
    actionnerScanLaser();
  }
});

// B. Guidage GPS vers l'emplacement
zebra.onDemandeGuidage = () => {
  const mis = zebra.missionActuelle;
  if (!mis) return;
  const loc = EMPLACEMENTS_ENTREPOT.find(l => l.id === mis.emplacementCibleId);
  if (loc) {
    entrepot3D.allerVers(loc.position);
    afficherNotification(`🚶 Guidage automatique vers ${loc.nomAffiche}`, true);
  }
};

// C. Vérification quantité & prélèvement
zebra.onValiderPrelevement = () => {
  audio.playDrop();
  zebra.marquerQuantitePrelevee();
  afficherNotification(`✋ Pièces prélevées en stock ! Rendez-vous à l'établi central.`, true);
};

// D. Préparation et scotchage à l'établi central
zebra.onPreparerCarton = () => {
  audio.playScotch();
  zebra.marquerColisPrepare();
  afficherNotification(`📦 Carton préparé et scotché ! Amenez-le à l'étagère [${zebra.missionActuelle?.destinataireBatiment}].`, true);
};

// E. Dépôt et validation sur l'étagère finale
zebra.onValiderLivraisonEtagere = () => {
  if (modeActuel === 'reel_phygital') {
    // Mode Réel : Ouvrir l'étiquette réelle
    if (zebra.missionActuelle) imprimante.ouvrirEtiquette(zebra.missionActuelle);
  } else {
    validerLivraisonFinale();
  }
};

imprimante.onScanReelValide = (code) => {
  const mis = zebra.missionActuelle;
  if (mis && code === mis.codeBarreLivraison) {
    validerLivraisonFinale();
    afficherNotification(`✅ Étiquette réelle ${code} validée au scanner !`, true);
  } else {
    audio.playError();
    afficherNotification(`❌ Code-barres erroné ou non conforme !`, false);
  }
};

function validerLivraisonFinale(): void {
  missionsCompletees++;
  elStatColis.textContent = `${missionsCompletees}`;
  audio.playSuccess();
  confetti({ particleCount: 100, spread: 80, origin: { x: 0.5, y: 0.6 } });
  afficherNotification(`🎉 Livraison terminée avec succès sur l'étagère [${zebra.missionActuelle?.destinataireBatiment}] !`, true);

  setTimeout(() => {
    indexMission = (indexMission + 1) % MISSIONS_PICKING_ENTREPOT.length;
    chargerMission(MISSIONS_PICKING_ENTREPOT[indexMission]);
  }, 3400);
}

// 6. Démarrage
rafraichirPlanEmplacements();
chargerMission(MISSIONS_PICKING_ENTREPOT[0]);

let dernierTemps = performance.now();
function boucleAnimation(tempsActuel: number): void {
  const deltaSec = Math.min((tempsActuel - dernierTemps) / 1000, 0.1);
  dernierTemps = tempsActuel;

  entrepot3D.update(deltaSec);
  requestAnimationFrame(boucleAnimation);
}
requestAnimationFrame(boucleAnimation);
