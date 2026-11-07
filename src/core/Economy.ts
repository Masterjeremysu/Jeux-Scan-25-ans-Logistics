import { StatistiquesJeu } from '../types/game';

export class GestionnaireEconomie {
  public tresorerie: number = 100000; // 100 000 € de capital de départ
  public reputation: number = 85; // Pourcentage de satisfaction client (0 à 100%)
  public stats: StatistiquesJeu = {
    revenuTotal: 0,
    coutTotal: 0,
    palettesLivrees: 0,
    livraisonsEnRetard: 0,
    co2EmisTotal: 0,
  };

  /**
   * Enregistre un gain lors d'une livraison réussie
   */
  public enregistrerLivraison(montant: number, nbPalettes: number, enRetard: boolean, emissionCo2: number): void {
    let montantFinal = montant;
    if (enRetard) {
      montantFinal = Math.max(100, montant * 0.6); // 40% de pénalité en cas de retard
      this.reputation = Math.max(5, this.reputation - 2);
      this.stats.livraisonsEnRetard += 1;
    } else {
      this.reputation = Math.min(100, this.reputation + 0.5);
    }

    this.tresorerie += montantFinal;
    this.stats.revenuTotal += montantFinal;
    this.stats.palettesLivrees += nbPalettes;
    this.stats.co2EmisTotal += emissionCo2;
  }

  /**
   * Déduit les dépenses courantes (carburant, maintenance, péages)
   */
  public deduireDepense(montant: number): boolean {
    this.tresorerie -= montant;
    this.stats.coutTotal += montant;
    return this.tresorerie >= 0;
  }

  /**
   * Vérifie si le joueur peut se payer un achat
   */
  public peutAcheter(prix: number): boolean {
    return this.tresorerie >= prix;
  }
}
