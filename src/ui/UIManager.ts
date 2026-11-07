import { SimulationLogistique } from '../core/Simulation';
import { CATALOGUE_VEHICULES } from '../data/scenarioFrance';
import { TypeVehicule } from '../types/game';
import confetti from 'canvas-confetti';

export class GestionnaireUI {
  private sim: SimulationLogistique;

  // Éléments du DOM
  private elTresorerie!: HTMLElement;
  private elReputation!: HTMLElement;
  private elPalettes!: HTMLElement;
  private elCo2!: HTMLElement;
  private elBanniereCrise!: HTMLElement;
  private elPanneauHub!: HTMLElement;
  private elTitreHub!: HTMLElement;
  private elCapaciteHub!: HTMLElement;
  private elStockListe!: HTMLElement;
  private elBoutonAmeliorer!: HTMLButtonElement;
  private elBoutonRelier!: HTMLButtonElement;
  private elBoutonAcheterVehicule!: HTMLButtonElement;
  private elModalAchat!: HTMLElement;
  private elCatalogueVehicules!: HTMLElement;
  private elFermerModal!: HTMLElement;
  private celebrationDeclenchee: boolean = false;

  constructor(sim: SimulationLogistique) {
    this.sim = sim;
    this.initialiserReferences();
    this.attacherEvenements();
  }

  private initialiserReferences(): void {
    this.elTresorerie = document.getElementById('stat-tresorerie')!;
    this.elReputation = document.getElementById('stat-reputation')!;
    this.elPalettes = document.getElementById('stat-palettes')!;
    this.elCo2 = document.getElementById('stat-co2')!;
    this.elBanniereCrise = document.getElementById('banniere-crise')!;
    this.elPanneauHub = document.getElementById('panneau-hub')!;
    this.elTitreHub = document.getElementById('hub-titre')!;
    this.elCapaciteHub = document.getElementById('hub-capacite')!;
    this.elStockListe = document.getElementById('hub-stock-liste')!;
    this.elBoutonAmeliorer = document.getElementById('btn-ameliorer-hub') as HTMLButtonElement;
    this.elBoutonRelier = document.getElementById('btn-relier-hub') as HTMLButtonElement;
    this.elBoutonAcheterVehicule = document.getElementById('btn-ouvrir-achat') as HTMLButtonElement;
    this.elModalAchat = document.getElementById('modal-achat')!;
    this.elCatalogueVehicules = document.getElementById('catalogue-vehicules')!;
    this.elFermerModal = document.getElementById('btn-fermer-modal')!;
  }

  private attacherEvenements(): void {
    // Boutons de vitesse
    document.querySelectorAll('.btn-vitesse').forEach(btn => {
      btn.addEventListener('click', e => {
        document.querySelectorAll('.btn-vitesse').forEach(b => b.classList.remove('actif'));
        const cible = e.currentTarget as HTMLElement;
        cible.classList.add('actif');
        const vitesse = parseFloat(cible.dataset.vitesse || '1');
        this.sim.vitesseSimulation = vitesse;
      });
    });

    // Amélioration de Hub
    this.elBoutonAmeliorer.addEventListener('click', () => {
      if (!this.sim.hubSelectionne) return;
      const succes = this.sim.ameliorerHub(this.sim.hubSelectionne.id);
      if (succes) {
        this.rafraichirPanneauHub();
      } else {
        alert('Fonds insuffisants pour améliorer ce hub !');
      }
    });

    // Relier à un autre Hub
    this.elBoutonRelier.addEventListener('click', () => {
      if (!this.sim.hubSelectionne) return;
      this.sim.modeConstructionRoute.sourceHubId = this.sim.hubSelectionne.id;
      this.elBanniereCrise.textContent = `📍 Mode construction : Cliquez sur un second hub pour créer la liaison depuis ${this.sim.hubSelectionne.nom}.`;
      this.elBanniereCrise.className = 'banniere active info';
    });

    // Modal Achat Véhicule
    this.elBoutonAcheterVehicule.addEventListener('click', () => {
      this.ouvrirModalAchat();
    });

    this.elFermerModal.addEventListener('click', () => {
      this.elModalAchat.classList.remove('ouverte');
    });
  }

  public rafraichir(): void {
    const stats = this.sim.economie.stats;
    const tresorerie = Math.round(this.sim.economie.tresorerie);

    this.elTresorerie.textContent = `${tresorerie.toLocaleString('fr-FR')} €`;
    this.elTresorerie.style.color = tresorerie < 5000 ? '#ef4444' : '#10b981';

    this.elReputation.textContent = `${Math.round(this.sim.economie.reputation)}%`;
    this.elPalettes.textContent = `${stats.palettesLivrees}`;
    this.elCo2.textContent = `${(stats.co2EmisTotal).toFixed(1)} kg`;

    // Célébration premier palier à 25 livraisons
    if (stats.palettesLivrees >= 25 && !this.celebrationDeclenchee) {
      this.celebrationDeclenchee = true;
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }

    // Gestion de la bannière de crise
    if (this.sim.crises.crisesActives.length > 0) {
      const crise = this.sim.crises.crisesActives[0];
      this.elBanniereCrise.textContent = `⚠️ [CRISE] ${crise.titre} : ${crise.description} (${Math.ceil(crise.tempsRestant)}s)`;
      this.elBanniereCrise.className = 'banniere active alerte';
    } else if (!this.sim.modeConstructionRoute.sourceHubId) {
      this.elBanniereCrise.className = 'banniere';
    }

    if (this.sim.hubSelectionne) {
      this.rafraichirPanneauHub();
    }
  }

  public selectionnerHub(hubId: string | null): void {
    if (!hubId) {
      this.sim.hubSelectionne = null;
      this.elPanneauHub.classList.remove('ouvert');
      return;
    }

    // Gestion du mode construction de route
    if (this.sim.modeConstructionRoute.sourceHubId) {
      if (this.sim.modeConstructionRoute.sourceHubId !== hubId) {
        const reussi = this.sim.creerRoute(this.sim.modeConstructionRoute.sourceHubId, hubId);
        if (reussi) {
          confetti({ particleCount: 40, spread: 50, origin: { y: 0.5 } });
        } else {
          alert('Impossible de construire cette route (liaison existante ou fonds insuffisants).');
        }
      }
      this.sim.modeConstructionRoute.sourceHubId = null;
      this.elBanniereCrise.className = 'banniere';
      return;
    }

    const hub = this.sim.hubs.find(h => h.id === hubId);
    if (!hub) return;

    this.sim.hubSelectionne = hub;
    this.elPanneauHub.classList.add('ouvert');
    this.rafraichirPanneauHub();
  }

  private rafraichirPanneauHub(): void {
    const hub = this.sim.hubSelectionne;
    if (!hub) return;

    const volumeTotal = hub.stockActuel.reduce((acc, curr) => acc + curr.quantite, 0);

    this.elTitreHub.textContent = `${hub.nom} (Niv. ${hub.niveauAmelioration})`;
    this.elCapaciteHub.textContent = `Stockage : ${volumeTotal} / ${hub.capaciteStockage} palettes`;

    const coutAmelioration = hub.niveauAmelioration * 15000;
    this.elBoutonAmeliorer.textContent = `Améliorer (+Capacité) - ${coutAmelioration.toLocaleString('fr-FR')} €`;

    // Liste des cargaisons en attente
    this.elStockListe.innerHTML = '';
    if (hub.stockActuel.length === 0) {
      this.elStockListe.innerHTML = '<li class="vide">Aucune marchandise en attente</li>';
    } else {
      hub.stockActuel.forEach(m => {
        const hubDest = this.sim.hubs.find(h => h.id === m.destinationHubId);
        const li = document.createElement('li');
        const estEnRetard = m.tempsRestant < 0;
        li.className = `fret-item ${m.type} ${estEnRetard ? 'retard' : ''}`;
        li.innerHTML = `
          <div>
            <strong>${m.nom} (${m.quantite} pal.)</strong>
            <span>Dest : ➡️ ${hubDest ? hubDest.nom : 'Inconnu'}</span>
          </div>
          <div class="delai">${estEnRetard ? 'EN RETARD' : Math.ceil(m.tempsRestant) + 's'}</div>
        `;
        this.elStockListe.appendChild(li);
      });
    }
  }

  private ouvrirModalAchat(): void {
    if (!this.sim.hubSelectionne) return;
    this.elCatalogueVehicules.innerHTML = '';

    (Object.keys(CATALOGUE_VEHICULES) as TypeVehicule[]).forEach(type => {
      const v = CATALOGUE_VEHICULES[type];
      const carte = document.createElement('div');
      carte.className = 'carte-vehicule';
      carte.innerHTML = `
        <h4>${v.nom}</h4>
        <div class="stats-vehicule">
          <p>📦 Capacité : <strong>${v.capaciteMax} palettes</strong></p>
          <p>⚡ Vitesse : <strong>${v.vitesse} km/h</strong></p>
          <p>🌱 Carbone : <strong>${v.emissionCarbone} g CO2/km</strong></p>
          <p class="prix">💰 ${v.coutAchat.toLocaleString('fr-FR')} €</p>
        </div>
        <button class="btn-acheter" data-type="${type}">Acheter</button>
      `;

      carte.querySelector('.btn-acheter')!.addEventListener('click', () => {
        if (!this.sim.hubSelectionne) return;
        const reussi = this.sim.acheterVehicule(type, this.sim.hubSelectionne.id);
        if (reussi) {
          this.elModalAchat.classList.remove('ouverte');
          confetti({ particleCount: 30, spread: 40 });
        } else {
          alert('Fonds insuffisants pour acquérir ce véhicule !');
        }
      });

      this.elCatalogueVehicules.appendChild(carte);
    });

    this.elModalAchat.classList.add('ouverte');
  }
}
