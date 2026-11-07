import * as THREE from 'three';

export class GenerateurEtiquettesEAN128 {
  /**
   * Génère une texture Canvas d'étiquette d'alvéole industrielle EAN-128 / GS1-128
   */
  public static creerTextureEAN128(
    codeEmplacement: string,
    designation: string,
    allee: string
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d')!;

    // Fond blanc brillant de l'étiquette thermique adhésive
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 160);

    // Bordure noire fine
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 504, 152);

    // En-tête : Badge CEA + Allée
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(8, 8, 80, 32);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('CEA', 24, 32);

    // Titre de l'allée
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(`ALLÉE ${allee} • MAGASIN CENTRAL`, 100, 30);

    // Flèche directionnelle d'alvéole
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 24px system-ui';
    ctx.fillText('⬇️', 470, 32);

    // Grand texte d'emplacement lisible à plusieurs mètres
    ctx.fillStyle = '#000000';
    ctx.font = '900 34px monospace';
    ctx.fillText(codeEmplacement, 16, 75);

    // Désignation de la référence
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(designation, 16, 100);

    // Code-barres EAN-128 / Code 128 avec checksum et barres franches
    ctx.fillStyle = '#000000';
    let x = 16;
    const largeurBarreTotale = 480;
    // Faux code-barre 128 dense et réaliste
    const sequence = this.genererMotifCode128(codeEmplacement);
    const pas = largeurBarreTotale / sequence.length;

    for (let i = 0; i < sequence.length; i++) {
      if (sequence[i] === '1') {
        ctx.fillRect(x + i * pas, 110, Math.max(1, pas * 0.9), 32);
      }
    }

    // Texte sous le code-barres (Format GS1-128 avec parenthèses)
    ctx.fillStyle = '#1e293b';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`(01)${codeEmplacement.replace(/[^A-Z0-9]/g, '')}(10)2026`, 256, 152);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private static genererMotifCode128(str: string): string {
    let motif = '11010010000'; // Start B
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      // Alternance binaire reproductible
      motif += (code % 2 === 0 ? '1100110' : '1001100') + ((code * 3) % 5 > 2 ? '110' : '011');
    }
    motif += '1100011101011'; // Stop
    return motif;
  }
}
