import { SimulationLogistique } from '../core/Simulation';
import { Hub } from '../types/game';
import { CATALOGUE_VEHICULES } from '../data/scenarioFrance';

export class RenduCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sim: SimulationLogistique;
  private animOffset: number = 0;

  constructor(canvas: HTMLCanvasElement, sim: SimulationLogistique) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.sim = sim;
    this.redimensionner();
    window.addEventListener('resize', () => this.redimensionner());
  }

  public redimensionner(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);
  }

  public render(largeur: number, hauteur: number): void {
    this.animOffset = (this.animOffset + 0.5) % 100;
    const ctx = this.ctx;

    // Nettoyage fond d'écran
    ctx.clearRect(0, 0, largeur, hauteur);
    this.dessinerGrilleFond(largeur, hauteur);

    // 1. Dessiner les routes
    this.dessinerRoutes();

    // 2. Dessiner la ligne de construction temporaire si active
    this.dessinerRouteEnConstruction();

    // 3. Dessiner les hubs
    this.dessinerHubs();

    // 4. Dessiner les véhicules
    this.dessinerVehicules();
  }

  private dessinerGrilleFond(largeur: number, hauteur: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;

    const pas = 40;
    for (let x = 0; x < largeur; x += pas) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, hauteur);
      ctx.stroke();
    }
    for (let y = 0; y < hauteur; y += pas) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(largeur, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private dessinerRoutes(): void {
    const ctx = this.ctx;

    for (const route of this.sim.routes) {
      const source = this.sim.hubs.find(h => h.id === route.hubSourceId);
      const cible = this.sim.hubs.find(h => h.id === route.hubCibleId);
      if (!source || !cible) continue;

      ctx.save();
      // Glow externe
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(source.position.x, source.position.y);
      ctx.lineTo(cible.position.x, cible.position.y);
      ctx.stroke();

      // Trait principal
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(source.position.x, source.position.y);
      ctx.lineTo(cible.position.x, cible.position.y);
      ctx.stroke();

      // Impulsions lumineuses de flux
      ctx.setLineDash([8, 16]);
      ctx.lineDashOffset = -this.animOffset;
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(source.position.x, source.position.y);
      ctx.lineTo(cible.position.x, cible.position.y);
      ctx.stroke();

      ctx.restore();
    }
  }

  private dessinerRouteEnConstruction(): void {
    if (!this.sim.modeConstructionRoute.sourceHubId) return;
    const source = this.sim.hubs.find(h => h.id === this.sim.modeConstructionRoute.sourceHubId);
    if (!source) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(source.position.x, source.position.y, 35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private dessinerHubs(): void {
    const ctx = this.ctx;

    for (const hub of this.sim.hubs) {
      const { x, y } = hub.position;
      const estSelectionne = this.sim.hubSelectionne?.id === hub.id;
      const volumeStock = hub.stockActuel.reduce((acc, curr) => acc + curr.quantite, 0);
      const ratioSaturation = Math.min(1, volumeStock / hub.capaciteStockage);

      ctx.save();

      // Effet pulsation si bloqué ou sélectionné
      if (hub.bloque) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const pulse = 24 + Math.sin(Date.now() / 150) * 4;
        ctx.arc(x, y, pulse, 0, Math.PI * 2);
        ctx.stroke();
      } else if (estSelectionne) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x, y, 26, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Cercle d'arrière-plan du Hub
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fill();

      // Anneau de saturation du stock
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.stroke();

      if (ratioSaturation > 0) {
        ctx.strokeStyle = ratioSaturation > 0.85 ? '#ef4444' : ratioSaturation > 0.6 ? '#f59e0b' : '#10b981';
        ctx.beginPath();
        ctx.arc(x, y, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratioSaturation);
        ctx.stroke();
      }

      // Point central (icône selon type)
      let couleurCentrale = '#38bdf8';
      let symbole = '📦';
      if (hub.type === 'port') {
        couleurCentrale = '#0284c7';
        symbole = '⚓';
      } else if (hub.type === 'aeroport') {
        couleurCentrale = '#8b5cf6';
        symbole = '✈️';
      } else if (hub.type === 'centre_tri') {
        couleurCentrale = '#f59e0b';
        symbole = '⚡';
      }

      ctx.fillStyle = couleurCentrale;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();

      // Texte du nom de la ville
      ctx.fillStyle = estSelectionne ? '#38bdf8' : '#f8fafc';
      ctx.font = '600 12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${symbole} ${hub.nom}`, x, y + 34);

      // Quantité en stock
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 10px monospace';
      ctx.fillText(`${volumeStock} / ${hub.capaciteStockage} pal.`, x, y + 47);

      ctx.restore();
    }
  }

  private dessinerVehicules(): void {
    const ctx = this.ctx;

    for (const v of this.sim.vehicules) {
      if (!v.enTransit) continue;

      const carac = CATALOGUE_VEHICULES[v.type];
      const { x, y } = v.position;

      ctx.save();
      ctx.translate(x, y);

      // Orientation selon le vecteur de direction
      const hubDepart = this.sim.hubs.find(h => h.id === v.hubActuelId);
      const hubArrivee = this.sim.hubs.find(h => h.id === v.hubDestinationId);
      if (hubDepart && hubArrivee) {
        const angle = Math.atan2(
          hubArrivee.position.y - hubDepart.position.y,
          hubArrivee.position.x - hubDepart.position.x
        );
        ctx.rotate(angle);
      }

      // Silhouette du véhicule
      ctx.fillStyle = carac.couleur;
      ctx.shadowColor = carac.couleur;
      ctx.shadowBlur = 8;

      if (v.type === 'train_fret') {
        ctx.fillRect(-14, -5, 28, 10);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(8, -3, 4, 6);
      } else if (v.type === 'cargo_maritime') {
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-12, -7);
        ctx.lineTo(-12, 7);
        ctx.closePath();
        ctx.fill();
      } else if (v.type === 'drone_express') {
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // Camion
        ctx.fillRect(-10, -4, 20, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(6, -3, 3, 6);
      }

      ctx.restore();
    }
  }

  public detecterHubClique(clientX: number, clientY: number): Hub | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    for (const hub of this.sim.hubs) {
      const dist = Math.hypot(hub.position.x - x, hub.position.y - y);
      if (dist <= 26) {
        return hub;
      }
    }
    return null;
  }
}
