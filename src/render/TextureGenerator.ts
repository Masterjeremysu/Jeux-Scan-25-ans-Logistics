import * as THREE from 'three';
import { InfoColis } from '../types/game';

export class GenerateurTextures {
  /**
   * Crée un matériau avec étiquette de transport réaliste pour carton/boîte
   */
  public static creerTextureBoite(info: InfoColis): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Fond carton kraft texturé
    ctx.fillStyle = '#c89d66';
    ctx.fillRect(0, 0, 512, 512);

    // Ruban adhésif scellé de sécurité
    ctx.fillStyle = '#b4864f';
    ctx.fillRect(0, 240, 512, 32);

    // Bande de sécurité orange "CEA GRENOBLE EXPÉDITION"
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(0, 0, 512, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('⚡ CEA GRENOBLE • QUAI RÉCEPTION ⚡', 35, 34);

    // Étiquette blanche principale
    ctx.fillStyle = '#ffffff';
    ctx.roundRect ? ctx.roundRect(40, 70, 432, 380, 10) : ctx.fillRect(40, 70, 432, 380);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.stroke();

    // En-tête étiquette
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText('RÉCEPTION PROTOCOLE CEA', 60, 110);

    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#2563eb';
    ctx.fillText(`ID: ${info.id}`, 60, 145);

    // Destination Labo
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('DESTINATION DÉPARTEMENT :', 60, 185);

    ctx.fillStyle = info.destination === 'nanotech' ? '#d97706' : info.destination === 'cryogenie' ? '#0284c7' : '#7c3aed';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(info.destinationNom, 60, 215);

    // Poids et Température
    ctx.fillStyle = '#334155';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(`Masse : ${info.poidsKg} kg  |  Temp : ${info.temperatureC}°C`, 60, 255);

    // Symboles de sécurité
    if (info.garderVertical) {
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 36px system-ui, sans-serif';
      ctx.fillText('⬆️ HAUT / TOP ⬆️', 60, 310);
    }

    if (info.fragile) {
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText('⚠️ FRAGILE - HAUTE PRÉCISION ⚠️', 60, 350);
    }

    // Faux Code-Barre réaliste
    ctx.fillStyle = '#000000';
    let x = 60;
    while (x < 420) {
      const largeur = Math.random() > 0.5 ? 4 : 2;
      ctx.fillRect(x, 375, largeur, 45);
      x += largeur + (Math.random() > 0.4 ? 3 : 2);
    }
    ctx.font = '14px monospace';
    ctx.fillText(info.codeBarre, 150, 435);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * Crée une texture pour cylindre cryogénique ou fûts industriels
   */
  public static creerTextureCylindre(info: InfoColis): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Dégradé inox / métal brossé
    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, '#94a3b8');
    grad.addColorStop(0.5, '#f1f5f9');
    grad.addColorStop(1, '#64748b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Bandes de sécurité hachurées jaunes et noires
    ctx.fillStyle = '#eab308';
    ctx.fillRect(0, 60, 512, 40);
    ctx.fillStyle = '#000000';
    for (let i = 0; i < 512; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 60);
      ctx.lineTo(i + 20, 60);
      ctx.lineTo(i, 100);
      ctx.closePath();
      ctx.fill();
    }

    // Marquage laser
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 26px monospace';
    ctx.fillText('CEA - SERVICE BASSE TEMP.', 40, 180);
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(`${info.nom}`, 40, 220);
    ctx.fillText(`TEMP CIBLE : ${info.temperatureC} °C`, 40, 260);

    // Flèches d'orientation verticale
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 50px system-ui';
    ctx.fillText('⬆️ MAINTENIR VERTICAL ⬆️', 40, 340);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }
}
