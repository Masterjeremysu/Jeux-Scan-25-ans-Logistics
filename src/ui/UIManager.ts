import { InfoColis } from '../types/game';

export class GestionnaireUI {
  private elScore!: HTMLElement;
  private elConformes!: HTMLElement;
  private elErreurs!: HTMLElement;
  private elTaux!: HTMLElement;
  private elBanniere!: HTMLElement;

  // Fiche d'inspection du colis
  private elFicheTitre!: HTMLElement;
  private elFicheId!: HTMLElement;
  private elFicheDest!: HTMLElement;
  private elFichePoids!: HTMLElement;
  private elFicheTemp!: HTMLElement;
  private elFicheDesc!: HTMLElement;
  private elFicheBadges!: HTMLElement;

  public score: number = 0;
  public totalConformes: number = 0;
  public totalErreurs: number = 0;

  constructor() {
    this.initialiserElements();
  }

  private initialiserElements(): void {
    this.elScore = document.getElementById('stat-score')!;
    this.elConformes = document.getElementById('stat-conformes')!;
    this.elErreurs = document.getElementById('stat-erreurs')!;
    this.elTaux = document.getElementById('stat-taux')!;
    this.elBanniere = document.getElementById('banniere-feedback')!;

    this.elFicheTitre = document.getElementById('fiche-nom')!;
    this.elFicheId = document.getElementById('fiche-id')!;
    this.elFicheDest = document.getElementById('fiche-dest')!;
    this.elFichePoids = document.getElementById('fiche-poids')!;
    this.elFicheTemp = document.getElementById('fiche-temp')!;
    this.elFicheDesc = document.getElementById('fiche-desc')!;
    this.elFicheBadges = document.getElementById('fiche-badges')!;
  }

  public actualiserScore(points: number, succes: boolean, message: string): void {
    this.score += points;
    if (succes) {
      this.totalConformes++;
      this.elBanniere.className = 'banniere-status active succes';
    } else {
      this.totalErreurs++;
      this.elBanniere.className = 'banniere-status active erreur';
    }

    this.elBanniere.textContent = message;

    const total = this.totalConformes + this.totalErreurs;
    const taux = total > 0 ? Math.round((this.totalConformes / total) * 100) : 100;

    this.elScore.textContent = `${this.score} pts`;
    this.elConformes.textContent = `${this.totalConformes}`;
    this.elErreurs.textContent = `${this.totalErreurs}`;
    this.elTaux.textContent = `${taux}%`;

    setTimeout(() => {
      this.elBanniere.className = 'banniere-status';
    }, 3500);
  }

  public afficherFicheColis(colis: InfoColis): void {
    this.elFicheTitre.textContent = colis.nom;
    this.elFicheId.textContent = `ID: ${colis.id}`;
    this.elFicheDest.textContent = colis.destinationNom;
    this.elFichePoids.textContent = `${colis.poidsKg} kg`;
    this.elFicheTemp.textContent = `${colis.temperatureC} °C`;
    this.elFicheDesc.textContent = colis.description;

    this.elFicheBadges.innerHTML = '';

    if (colis.garderVertical) {
      const b = document.createElement('span');
      b.className = 'badge vertical';
      b.textContent = '⬆️ Maintenir Vertical';
      this.elFicheBadges.appendChild(b);
    }

    if (colis.fragile) {
      const b = document.createElement('span');
      b.className = 'badge fragile';
      b.textContent = '⚠️ Fragilité Élevée';
      this.elFicheBadges.appendChild(b);
    }
  }
}
