import { MissionWMS, ModeDeJeu, PieceLogistique } from '../types/game';

export class ZebraPDA {
  private elCommandeTitre!: HTMLElement;
  private elDestinataire!: HTMLElement;
  private elService!: HTMLElement;
  private elPriorite!: HTMLElement;
  private elConditionnement!: HTMLElement;
  private elListeReferences!: HTMLElement;
  private elStatutEtape!: HTMLElement;

  // Boutons d'actions d'atelier sur le Zebra
  private elBtnPalan!: HTMLButtonElement;
  private elBtnSangler!: HTMLButtonElement;
  private elBtnChips!: HTMLButtonElement;
  private elBtnDoubleBag!: HTMLButtonElement;
  private elBtnScotcher!: HTMLButtonElement;
  private elBtnExpedier!: HTMLButtonElement;

  public missionActuelle: MissionWMS | null = null;
  public modeJeu: ModeDeJeu = 'dematerialise';

  // Callbacks
  public onActionPalan: (() => void) | null = null;
  public onActionSangler: (() => void) | null = null;
  public onActionChips: (() => void) | null = null;
  public onActionDoubleBag: (() => void) | null = null;
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
    this.elConditionnement = document.getElementById('zebra-conditionnement')!;
    this.elListeReferences = document.getElementById('zebra-liste-refs')!;
    this.elStatutEtape = document.getElementById('zebra-statut-etape')!;

    this.elBtnPalan = document.getElementById('btn-zebra-palan') as HTMLButtonElement;
    this.elBtnSangler = document.getElementById('btn-zebra-sangler') as HTMLButtonElement;
    this.elBtnChips = document.getElementById('btn-zebra-chips') as HTMLButtonElement;
    this.elBtnDoubleBag = document.getElementById('btn-zebra-doublebag') as HTMLButtonElement;
    this.elBtnScotcher = document.getElementById('btn-zebra-scotcher') as HTMLButtonElement;
    this.elBtnExpedier = document.getElementById('btn-zebra-expedier') as HTMLButtonElement;
  }

  private attacherEvenements(): void {
    this.elBtnPalan.addEventListener('click', () => {
      if (this.onActionPalan) this.onActionPalan();
    });

    this.elBtnSangler.addEventListener('click', () => {
      if (this.onActionSangler) this.onActionSangler();
    });

    this.elBtnChips.addEventListener('click', () => {
      if (this.onActionChips) this.onActionChips();
    });

    this.elBtnDoubleBag.addEventListener('click', () => {
      if (this.onActionDoubleBag) this.onActionDoubleBag();
    });

    this.elBtnScotcher.addEventListener('click', () => {
      if (this.onDemandeScotchage) this.onDemandeScotchage();
    });

    this.elBtnExpedier.addEventListener('click', () => {
      if (this.onDemandeExpedition) this.onDemandeExpedition();
    });
  }

  public afficherMission(mission: MissionWMS): void {
    this.missionActuelle = mission;
    this.elCommandeTitre.textContent = `${mission.numeroCommande}`;
    this.elDestinataire.textContent = mission.destinataireBatiment;
    this.elService.textContent = mission.serviceDemandeur;
    this.elPriorite.textContent = mission.priorite;
    this.elPriorite.className = `badge-priorite ${mission.priorite.toLowerCase()}`;

    // Afficher le conditionnement technique requis
    let condNom = 'Carton Standard';
    if (mission.conditionnement === 'palette_lourde_palan') condNom = '🏗️ Palette Lourde + Palan (300 kg)';
    else if (mission.conditionnement === 'fosb_300mm') condNom = `🔬 FOSB 300mm (${mission.couleurFosb?.toUpperCase()})`;
    else if (mission.conditionnement === 'boite_wafer_200mm') condNom = '💿 Boîte Wafers 200mm';
    this.elConditionnement.textContent = condNom;

    // Réinitialiser les boutons du Zebra
    this.elBtnPalan.style.display = mission.necessitePalan ? 'block' : 'none';
    this.elBtnPalan.disabled = false;

    this.elBtnSangler.style.display = mission.necessiteSanglage ? 'block' : 'none';
    this.elBtnSangler.disabled = true;

    this.elBtnChips.style.display = mission.necessiteChipsCalage ? 'block' : 'none';
    this.elBtnChips.disabled = true;

    this.elBtnDoubleBag.style.display = mission.necessiteDoubleEmballage ? 'block' : 'none';
    this.elBtnDoubleBag.disabled = true;

    this.elBtnScotcher.style.display = mission.necessitePalan ? 'none' : 'block';
    this.elBtnScotcher.disabled = true;

    this.elBtnExpedier.disabled = true;

    if (mission.necessitePalan) {
      this.elStatutEtape.textContent = '1/3 - Pompe 300 kg : Actionnez le PALAN d\'atelier pour la poser sur la palette';
      this.elStatutEtape.className = 'statut-etape etape-scotch';
    } else {
      this.elStatutEtape.textContent = '1/3 - Glissez les pièces dans le conditionnement';
      this.elStatutEtape.className = 'statut-etape etape-picking';
    }

    this.rafraichirListeReferences();
  }

  public validerPiece(piece: PieceLogistique): void {
    if (!this.missionActuelle) return;

    const ref = this.missionActuelle.references.find(r => r.reference === piece.reference);
    if (ref) {
      ref.quantiteScanee += 1;
      this.rafraichirListeReferences();

      const toutComplet = this.missionActuelle.references.every(r => r.quantiteScanee >= r.quantiteRequise);
      if (toutComplet) {
        if (this.missionActuelle.necessiteChipsCalage) {
          this.elBtnChips.disabled = false;
          this.elStatutEtape.textContent = '2/3 - Pièces fragiles chargées ! Versez les CHIPS DE CALAGE';
          this.elStatutEtape.className = 'statut-etape etape-scotch';
        } else if (this.missionActuelle.necessiteDoubleEmballage) {
          this.elBtnDoubleBag.disabled = false;
          this.elStatutEtape.textContent = '2/3 - Salle Blanche : Appliquez le DOUBLE EMBALLAGE stérile';
          this.elStatutEtape.className = 'statut-etape etape-scotch';
        } else if (!this.missionActuelle.necessitePalan) {
          this.elBtnScotcher.disabled = false;
          this.elStatutEtape.textContent = '2/3 - Rabats fermés ! Cliquez sur SCOTCHER';
          this.elStatutEtape.className = 'statut-etape etape-scotch';
        }
      }
    }
  }

  public marquerPalanFait(): void {
    if (!this.missionActuelle) return;
    this.elBtnPalan.disabled = true;
    this.elBtnSangler.disabled = false;
    this.elStatutEtape.textContent = '2/3 - Pompe 300 kg sur palette ! Actionnez le SANGLAGE 5T';
    this.elStatutEtape.className = 'statut-etape etape-scotch';
  }

  public marquerSanglageFait(): void {
    if (!this.missionActuelle) return;
    this.elBtnSangler.disabled = true;
    this.elBtnExpedier.disabled = false;
    this.elStatutEtape.textContent = '3/3 - Pompe sanglée ! Validez l\'expédition de la palette';
    this.elStatutEtape.className = 'statut-etape etape-etiquette';
  }

  public marquerChipsFaites(): void {
    if (!this.missionActuelle) return;
    this.elBtnChips.disabled = true;
    this.elBtnScotcher.disabled = false;
    this.elStatutEtape.textContent = '2/3 - Calage protecteur injecté ! Rabats fermés. Cliquez sur SCOTCHER';
  }

  public marquerDoubleBagFait(): void {
    if (!this.missionActuelle) return;
    this.elBtnDoubleBag.disabled = true;
    this.elBtnScotcher.disabled = false;
    this.elStatutEtape.textContent = '2/3 - Double ensachage scellé sous vide ! Cliquez sur SCOTCHER';
  }

  public marquerScotche(): void {
    if (!this.missionActuelle) return;
    this.elBtnScotcher.disabled = true;
    this.elBtnExpedier.disabled = false;

    if (this.modeJeu === 'reel_phygital') {
      this.elStatutEtape.textContent = '3/3 - Mode Réel : Imprimez et scannez la vraie étiquette !';
      this.elBtnExpedier.textContent = '🖨️ IMPRIMER ÉTIQUETTE RÉELLE';
    } else {
      this.elStatutEtape.textContent = '3/3 - Colis scellé ! Collez l\'étiquette d\'expédition';
      this.elBtnExpedier.textContent = '🏷️ POSER ÉTIQUETTE & VALIDER';
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
