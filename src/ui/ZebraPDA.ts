import { MissionPickingEntrepot, ModeDeJeu } from '../types/game';

export class ZebraPDA {
  private elCmdTitre!: HTMLElement;
  private elDestinataire!: HTMLElement;
  private elPriorite!: HTMLElement;
  private elEmplacementRequis!: HTMLElement;
  private elRefPiece!: HTMLElement;
  private elQteDemandee!: HTMLElement;
  private elStatutEtape!: HTMLElement;

  // Boutons d'action WMS
  private elBtnScanLaser!: HTMLButtonElement;
  private elBtnGuidage!: HTMLButtonElement;
  private elBtnPrelever!: HTMLButtonElement;
  private elBtnPreparerCarton!: HTMLButtonElement;
  private elBtnLivrerEtagere!: HTMLButtonElement;

  public missionActuelle: MissionPickingEntrepot | null = null;
  public modeJeu: ModeDeJeu = 'dematerialise';

  // Callbacks
  public onDeclencherScanLaser: (() => void) | null = null;
  public onDemandeGuidage: (() => void) | null = null;
  public onValiderPrelevement: (() => void) | null = null;
  public onPreparerCarton: (() => void) | null = null;
  public onValiderLivraisonEtagere: (() => void) | null = null;

  constructor() {
    this.initialiserReferences();
    this.attacherEvenements();
  }

  private initialiserReferences(): void {
    this.elCmdTitre = document.getElementById('zebra-cmd-titre')!;
    this.elDestinataire = document.getElementById('zebra-destinataire')!;
    this.elPriorite = document.getElementById('zebra-priorite')!;
    this.elEmplacementRequis = document.getElementById('zebra-emplacement-requis')!;
    this.elRefPiece = document.getElementById('zebra-ref-piece')!;
    this.elQteDemandee = document.getElementById('zebra-qte-demandee')!;
    this.elStatutEtape = document.getElementById('zebra-statut-etape')!;

    this.elBtnScanLaser = document.getElementById('btn-zebra-scan-laser') as HTMLButtonElement;
    this.elBtnGuidage = document.getElementById('btn-zebra-guidage') as HTMLButtonElement;
    this.elBtnPrelever = document.getElementById('btn-zebra-prelever') as HTMLButtonElement;
    this.elBtnPreparerCarton = document.getElementById('btn-zebra-preparer-carton') as HTMLButtonElement;
    this.elBtnLivrerEtagere = document.getElementById('btn-zebra-livrer-etagere') as HTMLButtonElement;
  }

  private attacherEvenements(): void {
    this.elBtnScanLaser.addEventListener('click', () => {
      if (this.onDeclencherScanLaser) this.onDeclencherScanLaser();
    });

    this.elBtnGuidage.addEventListener('click', () => {
      if (this.onDemandeGuidage) this.onDemandeGuidage();
    });

    this.elBtnPrelever.addEventListener('click', () => {
      if (this.onValiderPrelevement) this.onValiderPrelevement();
    });

    this.elBtnPreparerCarton.addEventListener('click', () => {
      if (this.onPreparerCarton) this.onPreparerCarton();
    });

    this.elBtnLivrerEtagere.addEventListener('click', () => {
      if (this.onValiderLivraisonEtagere) this.onValiderLivraisonEtagere();
    });
  }

  public afficherMission(mission: MissionPickingEntrepot): void {
    this.missionActuelle = mission;
    this.elCmdTitre.textContent = mission.numeroCMD;
    this.elDestinataire.textContent = mission.destinataireBatiment;
    this.elPriorite.textContent = mission.priorite;
    this.elPriorite.className = `badge-priorite ${mission.priorite.toLowerCase()}`;

    this.elEmplacementRequis.textContent = `📍 ${mission.emplacementCibleId}`;
    this.elRefPiece.textContent = `${mission.nomPiece} [${mission.referenceDemandee}]`;
    this.elQteDemandee.textContent = `x${mission.quantiteDemandee} pièce(s)`;

    // État des boutons
    this.elBtnPrelever.disabled = true;
    this.elBtnPreparerCarton.disabled = true;
    this.elBtnLivrerEtagere.disabled = true;

    this.elStatutEtape.textContent = `Étape 1/4 : Rendez-vous à l'emplacement [${mission.emplacementCibleId}] et bippez avec le laser`;
    this.elStatutEtape.className = 'statut-etape etape-picking';
  }

  public marquerEmplacementValide(): void {
    if (!this.missionActuelle) return;
    this.missionActuelle.emplacementScanne = true;
    this.elBtnPrelever.disabled = false;
    this.elStatutEtape.textContent = `Étape 2/4 : Emplacement conforme ! Vérifiez la quantité (x${this.missionActuelle.quantiteDemandee}) et prélevez`;
    this.elStatutEtape.className = 'statut-etape etape-scotch';
  }

  public marquerQuantitePrelevee(): void {
    if (!this.missionActuelle) return;
    this.missionActuelle.quantitePrelevee = true;
    this.elBtnPrelever.disabled = true;
    this.elBtnPreparerCarton.disabled = false;
    this.elStatutEtape.textContent = `Étape 3/4 : Pièce en main ! Allez à l'établi central et préparez le colis`;
    this.elStatutEtape.className = 'statut-etape etape-scotch';
  }

  public marquerColisPrepare(): void {
    if (!this.missionActuelle) return;
    this.missionActuelle.colisPrepare = true;
    this.elBtnPreparerCarton.disabled = true;
    this.elBtnLivrerEtagere.disabled = false;
    this.elStatutEtape.textContent = `Étape 4/4 : Colis scellé ! Déposez-le sur l'étagère de livraison [${this.missionActuelle.destinataireBatiment}]`;
    this.elStatutEtape.className = 'statut-etape etape-etiquette';
  }
}
