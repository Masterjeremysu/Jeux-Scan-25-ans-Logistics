import { MissionWMS, ModeDeJeu, PieceLogistique } from '../types/game';

export class ZebraPDA {
  private elCommandeTitre!: HTMLElement;
  private elDestinataire!: HTMLElement;
  private elService!: HTMLElement;
  private elPriorite!: HTMLElement;
  private elListeReferences!: HTMLElement;
  private elBoutonScotcher!: HTMLButtonElement;
  private elBoutonExpedier!: HTMLButtonElement;
  private elStatutEtape!: HTMLElement;

  public missionActuelle: MissionWMS | null = null;
  public modeJeu: ModeDeJeu = 'dematerialise';

  public onDemandeScotchage: (() => void) | null = null;
  public onDemandeExpedition: (() => void) | null = null;

  constructor() {
    this.initialiserReferences();
    this.attacherEvenements();
  }

  private initialiserReferences(): void {
    this.elCommandeTitre = document.getElementById('zebra-cmd-titre')!;
    this.elDestinataire = document.getElementById('zebra-destinataire')!;
    this.elService = document.getElementById('zebra-service')!;
    this.elPriorite = document.getElementById('zebra-priorite')!;
    this.elListeReferences = document.getElementById('zebra-liste-refs')!;
    this.elBoutonScotcher = document.getElementById('btn-zebra-scotcher') as HTMLButtonElement;
    this.elBoutonExpedier = document.getElementById('btn-zebra-expedier') as HTMLButtonElement;
    this.elStatutEtape = document.getElementById('zebra-statut-etape')!;
  }

  private attacherEvenements(): void {
    this.elBoutonScotcher.addEventListener('click', () => {
      if (this.onDemandeScotchage) this.onDemandeScotchage();
    });

    this.elBoutonExpedier.addEventListener('click', () => {
      if (this.onDemandeExpedition) this.onDemandeExpedition();
    });
  }

  public afficherMission(mission: MissionWMS): void {
    this.missionActuelle = mission;
    this.elCommandeTitre.textContent = `${mission.numeroCommande} • ${mission.titre}`;
    this.elDestinataire.textContent = mission.destinataireBatiment;
    this.elService.textContent = mission.serviceDemandeur;
    this.elPriorite.textContent = mission.priorite;
    this.elPriorite.className = `badge-priorite ${mission.priorite.toLowerCase()}`;

    this.elBoutonScotcher.disabled = true;
    this.elBoutonExpedier.disabled = true;
    this.elStatutEtape.textContent = '1/3 - Glissez les références demandées dans le carton';
    this.elStatutEtape.className = 'statut-etape etape-picking';

    this.rafraichirListeReferences();
  }

  public validerPiece(piece: PieceLogistique): void {
    if (!this.missionActuelle) return;

    const ref = this.missionActuelle.references.find(r => r.reference === piece.reference);
    if (ref) {
      ref.quantiteScanee += 1;
      this.rafraichirListeReferences();

      // Vérifier si toutes les références sont complétées
      const toutComplet = this.missionActuelle.references.every(r => r.quantiteScanee >= r.quantiteRequise);
      if (toutComplet) {
        this.missionActuelle.statut = 'pieces_chargees';
        this.elBoutonScotcher.disabled = false;
        this.elStatutEtape.textContent = '2/3 - Pièces conformes ! Rabats fermés. Cliquez sur SCOTCHER';
        this.elStatutEtape.className = 'statut-etape etape-scotch';
      }
    }
  }

  public marquerScotche(): void {
    if (!this.missionActuelle) return;
    this.missionActuelle.statut = 'scotche';
    this.elBoutonScotcher.disabled = true;
    this.elBoutonExpedier.disabled = false;

    if (this.modeJeu === 'reel_phygital') {
      this.elStatutEtape.textContent = '3/3 - Mode Réel : Imprimez la vraie étiquette et scannez-la !';
      this.elBoutonExpedier.textContent = '🖨️ IMPRIMER ÉTIQUETTE RÉELLE';
    } else {
      this.elStatutEtape.textContent = '3/3 - Carton scellé ! Collez l\'étiquette d\'expédition';
      this.elBoutonExpedier.textContent = '🏷️ POSER ÉTIQUETTE & VALIDER';
    }
    this.elStatutEtape.className = 'statut-etape etape-etiquette';
  }

  private rafraichirListeReferences(): void {
    if (!this.missionActuelle) return;
    this.elListeReferences.innerHTML = '';

    for (const ref of this.missionActuelle.references) {
      const estPret = ref.quantiteScanee >= ref.quantiteRequise;
      const li = document.createElement('li');
      li.className = `ref-item ${estPret ? 'validee' : 'en-attente'}`;
      li.innerHTML = `
        <div class="ref-check">${estPret ? '✅' : '⏳'}</div>
        <div class="ref-corps">
          <strong>${ref.nom}</strong>
          <code>${ref.reference}</code>
        </div>
        <div class="ref-qte">${ref.quantiteScanee} / ${ref.quantiteRequise}</div>
      `;
      this.elListeReferences.appendChild(li);
    }
  }
}
