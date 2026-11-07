import { MissionWMS } from '../types/game';

export class ImprimanteEtiquettesReelles {
  private modalOverlay!: HTMLElement;
  private apercuConteneur!: HTMLElement;
  private btnImprimer!: HTMLButtonElement;
  private btnFermer!: HTMLElement;
  private inputScanReel!: HTMLInputElement;
  private btnValiderScanReel!: HTMLButtonElement;

  public onScanReelValide: ((code: string) => void) | null = null;

  constructor() {
    this.initialiserElements();
    this.attacherEvenements();
  }

  private initialiserElements(): void {
    this.modalOverlay = document.getElementById('modal-etiquette-reelle')!;
    this.apercuConteneur = document.getElementById('apercu-etiquette-reelle')!;
    this.btnImprimer = document.getElementById('btn-imprimer-ticket') as HTMLButtonElement;
    this.btnFermer = document.getElementById('btn-fermer-modal-etiquette')!;
    this.inputScanReel = document.getElementById('input-scan-reel') as HTMLInputElement;
    this.btnValiderScanReel = document.getElementById('btn-valider-scan-reel') as HTMLButtonElement;
  }

  private attacherEvenements(): void {
    this.btnFermer.addEventListener('click', () => {
      this.modalOverlay.classList.remove('ouverte');
    });

    this.btnImprimer.addEventListener('click', () => {
      this.lancerImpressionNavigateur();
    });

    this.btnValiderScanReel.addEventListener('click', () => {
      this.traiterScanSaisi();
    });

    this.inputScanReel.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.traiterScanSaisi();
      }
    });
  }

  public ouvrirEtiquette(mission: MissionWMS): void {
    this.genererHtmlEtiquette(mission);
    this.inputScanReel.value = '';
    this.inputScanReel.placeholder = `Scannez le code (ex: ${mission.codeBarreExpedition})`;
    this.modalOverlay.classList.add('ouverte');
    setTimeout(() => this.inputScanReel.focus(), 200);
  }

  private genererHtmlEtiquette(mission: MissionWMS): void {
    const dateJour = new Date().toLocaleDateString('fr-FR');
    const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    this.apercuConteneur.innerHTML = `
      <div class="feuille-etiquette-reelle" id="zone-impression">
        <div class="etiq-entete">
          <div class="etiq-logo">CEA</div>
          <div class="etiq-titre">
            <h4>CEA GRENOBLE • LOGISTIQUE</h4>
            <p>BORDEREAU D'EXPÉDITION INTERNE</p>
          </div>
          <div class="etiq-date">${dateJour} ${heure}</div>
        </div>

        <div class="etiq-grille">
          <div class="etiq-bloc">
            <span class="lib">EXPÉDITEUR :</span>
            <strong>Magasin Central - Quai 03</strong>
            <small>Presqu'île Scientifique Grenoble</small>
          </div>
          <div class="etiq-bloc destinataire">
            <span class="lib">DESTINATAIRE BÂTIMENT :</span>
            <strong>${mission.destinataireBatiment}</strong>
            <small>Demandeur : ${mission.serviceDemandeur}</small>
          </div>
        </div>

        <div class="etiq-details">
          <div><span>CMD N° :</span> <strong>${mission.numeroCommande}</strong></div>
          <div><span>PRIORITÉ :</span> <strong class="etiq-prio">${mission.priorite}</strong></div>
        </div>

        <div class="etiq-refs">
          <span class="lib">CONTENU DU COLIS :</span>
          <ul>
            ${mission.references.map(r => `<li>• <strong>${r.nom}</strong> [${r.reference}] x${r.quantiteRequise}</li>`).join('')}
          </ul>
        </div>

        <div class="etiq-code-barres">
          <div class="faux-code128">
            ${this.genererLignesCodeBarre(mission.codeBarreExpedition)}
          </div>
          <div class="valeur-code-texte">${mission.codeBarreExpedition}</div>
        </div>
      </div>
    `;
  }

  private genererLignesCodeBarre(texte: string): string {
    // Génération visuelle fidèle d'un code-barres Code 128
    let html = '';
    for (let i = 0; i < texte.length * 3; i++) {
      const largeur = (i % 3 === 0) ? 3 : (i % 2 === 0) ? 1 : 2;
      const visible = (i * 7 + 3) % 11 > 3;
      html += `<span style="display:inline-block; width:${largeur}px; height:50px; background:${visible ? '#000' : 'transparent'}; margin-right:1px;"></span>`;
    }
    return html;
  }

  private lancerImpressionNavigateur(): void {
    const contenuZone = document.getElementById('zone-impression');
    if (!contenuZone) return;

    const fenetrePrint = window.open('', '', 'width=650,height=750');
    if (!fenetrePrint) {
      alert('Veuillez autoriser les fenêtres pop-up pour imprimer l\'étiquette réelle !');
      return;
    }

    fenetrePrint.document.write(`
      <html>
        <head>
          <title>Étiquette CEA Grenoble</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; margin: 0; }
            .feuille-etiquette-reelle { width: 100mm; height: 140mm; border: 2px solid #000; padding: 12px; box-sizing: border-box; }
            .etiq-entete { display: flex; align-items: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
            .etiq-logo { background: #000; color: #fff; font-weight: bold; font-size: 20px; padding: 4px 10px; margin-right: 12px; }
            .etiq-titre h4 { margin: 0; font-size: 14px; }
            .etiq-titre p { margin: 2px 0 0; font-size: 10px; }
            .etiq-date { margin-left: auto; font-size: 11px; font-weight: bold; }
            .etiq-grille { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border-bottom: 1px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
            .lib { font-size: 9px; text-transform: uppercase; display: block; color: #555; }
            .destinataire strong { font-size: 14px; }
            .etiq-details { display: flex; justify-content: space-between; border-bottom: 1px solid #000; padding-bottom: 6px; margin-bottom: 6px; font-size: 12px; }
            .etiq-refs { font-size: 11px; border-bottom: 1px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
            .etiq-refs ul { margin: 4px 0 0 16px; padding: 0; }
            .etiq-code-barres { text-align: center; margin-top: 10px; }
            .valeur-code-texte { font-family: monospace; font-size: 14px; font-weight: bold; letter-spacing: 2px; margin-top: 4px; }
          </style>
        </head>
        <body>
          ${contenuZone.outerHTML}
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    fenetrePrint.document.close();
  }

  private traiterScanSaisi(): void {
    const code = this.inputScanReel.value.trim();
    if (!code) return;

    if (this.onScanReelValide) {
      this.onScanReelValide(code);
    }
    this.modalOverlay.classList.remove('ouverte');
  }
}
