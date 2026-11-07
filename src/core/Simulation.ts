import {
  Hub,
  RouteConnexion,
  Vehicule,
  Marchandise,
  TypeVehicule,
  TypeMarchandise,
} from '../types/game';
import { HUBS_INITIAUX, CATALOGUE_VEHICULES } from '../data/scenarioFrance';
import { GestionnaireEconomie } from './Economy';
import { GestionnaireCrises } from './CrisisManager';

export class SimulationLogistique {
  public hubs: Hub[] = [];
  public routes: RouteConnexion[] = [];
  public vehicules: Vehicule[] = [];
  public economie: GestionnaireEconomie;
  public crises: GestionnaireCrises;

  public vitesseSimulation: number = 1; // 0 = pause, 1 = normal, 2 = rapide, 4 = turbo
  private tempsEcouleGenCargaison: number = 0;
  private idCompteur: number = 1;

  public hubSelectionne: Hub | null = null;
  public modeConstructionRoute: { sourceHubId: string | null } = { sourceHubId: null };

  constructor() {
    this.economie = new GestionnaireEconomie();
    this.crises = new GestionnaireCrises();
    this.reinitialiser();
  }

  public reinitialiser(): void {
    // Clonage profond des hubs initiaux
    this.hubs = JSON.parse(JSON.stringify(HUBS_INITIAUX));
    this.routes = [];
    this.vehicules = [];

    // Connexions initiales majeures (Le Havre -> Paris, Paris -> Lille, Paris -> Lyon)
    this.creerRoute('hub_le_havre', 'hub_paris');
    this.creerRoute('hub_paris', 'hub_lille');
    this.creerRoute('hub_paris', 'hub_lyon');
    this.creerRoute('hub_lyon', 'hub_marseille');

    // Flotte initiale offerte
    this.acheterVehicule('camion_electrique', 'hub_paris');
    this.acheterVehicule('camion_electrique', 'hub_le_havre');
    this.acheterVehicule('train_fret', 'hub_lyon');

    // Générer un premier lot de cargaisons
    for (let i = 0; i < 4; i++) {
      this.genererCargaisonAleatoire();
    }
  }

  public creerRoute(hubSourceId: string, hubCibleId: string): boolean {
    if (hubSourceId === hubCibleId) return false;
    // Vérifier si la route existe déjà
    const existante = this.routes.find(
      r =>
        (r.hubSourceId === hubSourceId && r.hubCibleId === hubCibleId) ||
        (r.hubSourceId === hubCibleId && r.hubCibleId === hubSourceId)
    );
    if (existante) return false;

    const source = this.hubs.find(h => h.id === hubSourceId);
    const cible = this.hubs.find(h => h.id === hubCibleId);
    if (!source || !cible) return false;

    const distance = Math.hypot(cible.position.x - source.position.x, cible.position.y - source.position.y);
    const coutConstruction = Math.round(distance * 35);

    if (!this.economie.peutAcheter(coutConstruction)) {
      return false;
    }

    this.economie.deduireDepense(coutConstruction);

    const nouvelleRoute: RouteConnexion = {
      id: `route_${hubSourceId}_${hubCibleId}_${Date.now()}`,
      hubSourceId,
      hubCibleId,
      distance,
      coutEntretienParSec: 2,
      debitMaxVehicules: 5,
      niveauRoute: 1,
    };

    this.routes.push(nouvelleRoute);
    return true;
  }

  public acheterVehicule(type: TypeVehicule, hubDepartId: string): boolean {
    const carac = CATALOGUE_VEHICULES[type];
    const hub = this.hubs.find(h => h.id === hubDepartId);
    if (!hub) return false;

    if (!this.economie.peutAcheter(carac.coutAchat)) {
      return false;
    }

    this.economie.deduireDepense(carac.coutAchat);

    const nouveauVehicule: Vehicule = {
      id: `veh_${this.idCompteur++}`,
      nom: `${carac.nom} #${this.idCompteur}`,
      type,
      hubActuelId: hubDepartId,
      hubDestinationId: null,
      position: { ...hub.position },
      progressionRoute: 0,
      enTransit: false,
      chargement: [],
      capaciteMax: carac.capaciteMax,
      vitesse: carac.vitesse,
    };

    this.vehicules.push(nouveauVehicule);
    return true;
  }

  public ameliorerHub(hubId: string): boolean {
    const hub = this.hubs.find(h => h.id === hubId);
    if (!hub || hub.niveauAmelioration >= 5) return false;

    const coutAmelioration = hub.niveauAmelioration * 15000;
    if (!this.economie.peutAcheter(coutAmelioration)) return false;

    this.economie.deduireDepense(coutAmelioration);
    hub.niveauAmelioration += 1;
    hub.capaciteStockage = Math.round(hub.capaciteStockage * 1.5);
    return true;
  }

  public update(deltaSecReel: number): void {
    if (this.vitesseSimulation === 0) return;
    const deltaSec = deltaSecReel * this.vitesseSimulation;

    // Mise à jour des crises
    this.crises.update(deltaSec, this.hubs);

    // Déduction des frais fixes de maintenance
    const coutEntretienTotal = this.routes.length * 1.5 * deltaSec;
    this.economie.deduireDepense(coutEntretienTotal);

    // Génération périodique de commandes de transport
    this.tempsEcouleGenCargaison += deltaSec;
    if (this.tempsEcouleGenCargaison >= 6) {
      this.tempsEcouleGenCargaison = 0;
      this.genererCargaisonAleatoire();
    }

    // Mise à jour de l'urgence des marchandises stockées dans les hubs
    for (const hub of this.hubs) {
      for (let i = hub.stockActuel.length - 1; i >= 0; i--) {
        const m = hub.stockActuel[i];
        m.tempsRestant -= deltaSec;
        if (m.tempsRestant <= -60) {
          // Marchandise périmée / contrat annulé
          this.economie.reputation = Math.max(0, this.economie.reputation - 3);
          hub.stockActuel.splice(i, 1);
        }
      }
    }

    // Gestion du déplacement et du dispatching des véhicules
    for (const vehicule of this.vehicules) {
      this.updateVehicule(vehicule, deltaSec);
    }
  }

  private updateVehicule(vehicule: Vehicule, deltaSec: number): void {
    const carac = CATALOGUE_VEHICULES[vehicule.type];

    if (!vehicule.enTransit) {
      // Le véhicule est au repos dans un hub : chercher du fret à transporter
      const hubActuel = this.hubs.find(h => h.id === vehicule.hubActuelId);
      if (!hubActuel || hubActuel.bloque) return;

      // Chercher des destinations connectées directement par une route
      const routesConnectees = this.routes.filter(
        r => r.hubSourceId === hubActuel.id || r.hubCibleId === hubActuel.id
      );

      if (routesConnectees.length === 0) return;

      // Regarder si le hub actuel a des marchandises destinées à un hub atteignable
      let marchandiseTrouvee: Marchandise | null = null;
      let hubCibleChoisi: string | null = null;

      for (let i = 0; i < hubActuel.stockActuel.length; i++) {
        const m = hubActuel.stockActuel[i];
        // Vérifier si m.destinationHubId est une route directe ou si on peut l'acheminer
        const routeVersDest = routesConnectees.find(
          r =>
            (r.hubSourceId === hubActuel.id && r.hubCibleId === m.destinationHubId) ||
            (r.hubCibleId === hubActuel.id && r.hubSourceId === m.destinationHubId)
        );

        if (routeVersDest) {
          marchandiseTrouvee = hubActuel.stockActuel.splice(i, 1)[0];
          hubCibleChoisi = m.destinationHubId;
          break;
        }
      }

      // Si pas de fret direct, déplacer le véhicule vers un hub voisin ayant du stock
      if (!marchandiseTrouvee) {
        // Choix d'un voisin aléatoire si le véhicule attend depuis trop longtemps
        const routeAleatoire = routesConnectees[Math.floor(Math.random() * routesConnectees.length)];
        const voisinId =
          routeAleatoire.hubSourceId === hubActuel.id
            ? routeAleatoire.hubCibleId
            : routeAleatoire.hubSourceId;

        const hubVoisin = this.hubs.find(h => h.id === voisinId);
        if (hubVoisin && hubVoisin.stockActuel.length > 0 && Math.random() < 0.05) {
          hubCibleChoisi = voisinId;
        }
      }

      if (hubCibleChoisi) {
        if (marchandiseTrouvee) {
          vehicule.chargement.push(marchandiseTrouvee);
        }
        vehicule.hubDestinationId = hubCibleChoisi;
        vehicule.enTransit = true;
        vehicule.progressionRoute = 0;
      }
    } else {
      // Déplacement en transit le long de la route
      const hubDepart = this.hubs.find(h => h.id === vehicule.hubActuelId);
      const hubArrivee = this.hubs.find(h => h.id === vehicule.hubDestinationId);
      if (!hubDepart || !hubArrivee) {
        vehicule.enTransit = false;
        return;
      }

      const distanceTotale = Math.hypot(
        hubArrivee.position.x - hubDepart.position.x,
        hubArrivee.position.y - hubDepart.position.y
      );

      // Calcul de la vitesse (impactée éventuellement par les crises météo)
      let facteurVitesse = 1;
      const criseMeteo = this.crises.crisesActives.find(c => c.impactType === 'ralentissement_route');
      if (criseMeteo) facteurVitesse = 0.6;

      const deltaAvancement = (vehicule.vitesse * facteurVitesse * deltaSec) / distanceTotale;
      vehicule.progressionRoute += deltaAvancement;

      // Calcul des coûts kilométriques de trajet
      let coutCarburant = (vehicule.vitesse * deltaSec * carac.coutParKm) * 0.05;
      const criseCarburant = this.crises.crisesActives.find(c => c.impactType === 'hausse_carburant');
      if (criseCarburant) coutCarburant *= 2;
      this.economie.deduireDepense(coutCarburant);

      // Interpolation de la position
      vehicule.position.x =
        hubDepart.position.x + (hubArrivee.position.x - hubDepart.position.x) * vehicule.progressionRoute;
      vehicule.position.y =
        hubDepart.position.y + (hubArrivee.position.y - hubDepart.position.y) * vehicule.progressionRoute;

      // Arrivée à destination
      if (vehicule.progressionRoute >= 1) {
        vehicule.enTransit = false;
        vehicule.progressionRoute = 0;
        vehicule.hubActuelId = hubArrivee.id;
        vehicule.position = { ...hubArrivee.position };
        vehicule.hubDestinationId = null;

        // Déchargement et encaissement
        while (vehicule.chargement.length > 0) {
          const fret = vehicule.chargement.pop()!;
          if (fret.destinationHubId === hubArrivee.id) {
            // Livraison finale !
            const enRetard = fret.tempsRestant < 0;
            const emissionCo2 = (distanceTotale * carac.emissionCarbone) / 1000;
            const montant = fret.quantite * fret.valeurUnitaire;
            this.economie.enregistrerLivraison(montant, fret.quantite, enRetard, emissionCo2);
          } else {
            // Correspondance : déposé dans le stock du hub intermédiaire
            hubArrivee.stockActuel.push(fret);
          }
        }
      }
    }
  }

  private genererCargaisonAleatoire(): void {
    if (this.hubs.length < 2) return;
    const indexSource = Math.floor(Math.random() * this.hubs.length);
    let indexDest = Math.floor(Math.random() * this.hubs.length);
    while (indexDest === indexSource) {
      indexDest = Math.floor(Math.random() * this.hubs.length);
    }

    const source = this.hubs[indexSource];
    const destination = this.hubs[indexDest];

    // Calcul du volume actuel
    const volumeOccupe = source.stockActuel.reduce((acc, curr) => acc + curr.quantite, 0);
    if (volumeOccupe >= source.capaciteStockage) return; // Hub saturé

    const types: TypeMarchandise[] = ['alimentaire', 'electronique', 'pharmaceutique', 'industriel'];
    const typeChoisi = types[Math.floor(Math.random() * types.length)];

    let valeurUnitaire = 120;
    let delaiSec = 50;

    switch (typeChoisi) {
      case 'pharmaceutique':
        valeurUnitaire = 350;
        delaiSec = 30; // très urgent
        break;
      case 'electronique':
        valeurUnitaire = 240;
        delaiSec = 45;
        break;
      case 'industriel':
        valeurUnitaire = 90;
        delaiSec = 70;
        break;
      case 'alimentaire':
        valeurUnitaire = 140;
        delaiSec = 40; // frais
        break;
    }

    const distance = Math.hypot(
      destination.position.x - source.position.x,
      destination.position.y - source.position.y
    );
    const tempsEstime = Math.round((distance / 80) * 1.5 + delaiSec);

    const quantite = Math.floor(Math.random() * 20) + 10;

    const nouvelleMarchandise: Marchandise = {
      id: `fret_${this.idCompteur++}`,
      type: typeChoisi,
      nom: `Lot ${typeChoisi.toUpperCase()}`,
      quantite,
      departHubId: source.id,
      destinationHubId: destination.id,
      valeurUnitaire,
      tempsRestant: tempsEstime,
      tempsInitial: tempsEstime,
      penaliteRetard: 0.4,
    };

    source.stockActuel.push(nouvelleMarchandise);
  }
}
