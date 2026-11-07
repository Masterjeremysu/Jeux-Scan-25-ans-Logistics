import { EvenementCrise, Hub } from '../types/game';

export class GestionnaireCrises {
  public crisesActives: EvenementCrise[] = [];
  private dernierDeclenchement: number = 0;
  private intervalleCriseSec: number = 35; // Déclenchement d'un événement toutes les 35 secondes environ

  public update(deltaSec: number, hubs: Hub[]): EvenementCrise | null {
    // Mise à jour des crises en cours
    for (let i = this.crisesActives.length - 1; i >= 0; i--) {
      const crise = this.crisesActives[i];
      crise.tempsRestant -= deltaSec;
      if (crise.tempsRestant <= 0) {
        // Lever les effets
        if (crise.hubCibleId) {
          const hub = hubs.find(h => h.id === crise.hubCibleId);
          if (hub) hub.bloque = false;
        }
        this.crisesActives.splice(i, 1);
      }
    }

    this.dernierDeclenchement += deltaSec;
    if (this.dernierDeclenchement >= this.intervalleCriseSec) {
      this.dernierDeclenchement = 0;
      return this.genererNouvelleCrise(hubs);
    }

    return null;
  }

  private genererNouvelleCrise(hubs: Hub[]): EvenementCrise | null {
    const hubAleatoire = hubs[Math.floor(Math.random() * hubs.length)];

    const modelesCrises: Omit<EvenementCrise, 'id' | 'tempsRestant'>[] = [
      {
        titre: '⚡ Panne Réseau Automatisation',
        description: `Le hub de ${hubAleatoire.nom} subit une panne de trieurs robotisés. Opérations suspendues !`,
        impactType: 'blocage_hub',
        hubCibleId: hubAleatoire.id,
        dureeSecondes: 20,
      },
      {
        titre: '❄️ Tempête & Verglas Sévère',
        description: 'Vitesse de l\'ensemble des convois réduite de 40% sur le réseau national.',
        impactType: 'ralentissement_route',
        dureeSecondes: 25,
      },
      {
        titre: '📈 Pic Tarifaire Énergie',
        description: 'Le coût d\'exploitation par kilomètre a doublé pendant la période de pointe.',
        impactType: 'hausse_carburant',
        dureeSecondes: 30,
      },
      {
        titre: '🚨 Commande d\'Urgence Médicale',
        description: `Besoin express vers ${hubAleatoire.nom} ! Bonus de livraison doublé pendant 30s.`,
        impactType: 'boom_demande',
        hubCibleId: hubAleatoire.id,
        dureeSecondes: 30,
      },
    ];

    const modele = modelesCrises[Math.floor(Math.random() * modelesCrises.length)];
    const nouvelleCrise: EvenementCrise = {
      ...modele,
      id: `crise_${Date.now()}`,
      tempsRestant: modele.dureeSecondes,
    };

    if (nouvelleCrise.impactType === 'blocage_hub' && nouvelleCrise.hubCibleId) {
      const hub = hubs.find(h => h.id === nouvelleCrise.hubCibleId);
      if (hub) {
        hub.bloque = true;
        hub.raisonBlocage = nouvelleCrise.titre;
      }
    }

    this.crisesActives.push(nouvelleCrise);
    return nouvelleCrise;
  }
}
