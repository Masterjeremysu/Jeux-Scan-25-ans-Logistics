import * as THREE from 'three';
import { EMPLACEMENTS_ENTREPOT, ETAGERES_LIVRAISON, PIECES_EN_STOCK_INITIALES } from '../core/WarehouseData';
import { EmplacementEntrepot, EtagereLivraison, PieceEnStock } from '../types/game';
import { AudioEffets } from '../audio/SoundEffects';

export class Entrepot3D {
  private container: HTMLElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private audio: AudioEffets;

  // Objets de l'entrepôt
  public emplacements: EmplacementEntrepot[] = EMPLACEMENTS_ENTREPOT;
  public etageresLivraison: EtagereLivraison[] = ETAGERES_LIVRAISON;
  public piecesEnStock: PieceEnStock[] = [];
  public colisPorteMesh: THREE.Group | null = null;

  // Contrôle du déplacement de l'opérateur (FPS / Libre)
  public positionOperateur = new THREE.Vector3(0, 1.7, 4.0); // Devant le quai au début
  public angleCameraY = 0;
  public angleCameraX = 0;
  private touchesEnfoncees: Record<string, boolean> = {};
  private vitesseMarche = 4.5; // m/s
  private estEnPointerLock = false;

  // Raycaster pour le scanner Zebra
  private raycaster = new THREE.Raycaster();
  public faisceauLaser!: THREE.Line;

  // Callbacks
  public onEmplacementVise: ((locId: string) => void) | null = null;
  public onEtagereLivraisonVisee: ((etagereId: string) => void) | null = null;

  constructor(container: HTMLElement, audio: AudioEffets) {
    this.container = container;
    this.audio = audio;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0c1322');
    this.scene.fog = new THREE.FogExp2('#0c1322', 0.035);

    this.camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 0.1, 60);
    this.camera.position.copy(this.positionOperateur);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.initialiserLumieres();
    this.construireSolEtBatiment();
    this.construireRacksEtArmoires();
    this.construireEtageresLivraison();
    this.construireEtabliCentral();
    this.construireFaisceauLaserZebra();
    this.chargerPieces3D();
    this.attacherControlesClavierSouris();

    window.addEventListener('resize', () => this.onResize());
  }

  private initialiserLumieres(): void {
    const ambiante = new THREE.AmbientLight('#94a3b8', 0.75);
    this.scene.add(ambiante);

    // Rangées de réglettes néon industrielles au plafond des 3 allées
    [-5.5, 0, 5.5].forEach(x => {
      for (let z = -5; z <= 4; z += 4) {
        const neon = new THREE.PointLight('#f8fafc', 0.9, 9);
        neon.position.set(x, 4.5, z);
        this.scene.add(neon);

        // Modèle du luminaire néon
        const fixture = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 0.1, 2.0),
          new THREE.MeshStandardMaterial({ color: '#f1f5f9', emissive: '#ffffff', emissiveIntensity: 0.6 })
        );
        fixture.position.set(x, 4.7, z);
        this.scene.add(fixture);
      }
    });
  }

  private construireSolEtBatiment(): void {
    // Sol béton industriel avec résine époxy grise
    const solGeo = new THREE.PlaneGeometry(24, 20);
    const solMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.35, metalness: 0.1 });
    const sol = new THREE.Mesh(solGeo, solMat);
    sol.rotation.x = -Math.PI / 2;
    sol.receiveShadow = true;
    this.scene.add(sol);

    // Lignes de marquage au sol de sécurité jaune
    const traceLigne = (x1: number, z1: number, x2: number, z2: number) => {
      const lg = Math.hypot(x2 - x1, z2 - z1);
      const angle = Math.atan2(x2 - x1, z2 - z1);
      const ligne = new THREE.Mesh(
        new THREE.PlaneGeometry(0.12, lg),
        new THREE.MeshBasicMaterial({ color: '#eab308' })
      );
      ligne.rotation.x = -Math.PI / 2;
      ligne.rotation.z = -angle;
      ligne.position.set((x1 + x2) / 2, 0.01, (z1 + z2) / 2);
      this.scene.add(ligne);
    };

    // Délimitations allées
    traceLigne(-8.5, -7, -8.5, 7);
    traceLigne(-3.0, -7, -3.0, 7);
    traceLigne(3.0, -7, 3.0, 7);
    traceLigne(8.5, -7, 8.5, 7);
  }

  // Construction des Allées A, B, C avec Racks et Armoires
  private construireRacksEtArmoires(): void {
    // Panneaux suspendus des allées
    this.creerPanneauAllee('🅰️ ALLÉE A • PALETTIER LOURD & VIDE', -6, 3.8, -6.5, '#3b82f6');
    this.creerPanneauAllee('🅱️ ALLÉE B • TIROIRS & RACCORDS FLUIDES', 0, 3.8, -6.5, '#eab308');
    this.creerPanneauAllee('🅲 ALLÉE C • ARMOIRES STÉRILES & WAFERS', 6, 3.8, -6.5, '#10b981');

    // ALLÉE A : Racks à palettes (Bleu #1e40af et Orange #ea580c)
    this.creerPalettier(-6, -4, 2);
    this.creerPalettier(-6, 0, 2);

    // ALLÉE B : Armoires métalliques à tiroirs & étagères à bacs
    this.creerArmoireTiroirs(0, -4);
    this.creerEtagereBacs(0, 0);

    // ALLÉE C : Armoires Salle Blanche vitrées
    this.creerArmoireSalleBlanche(6, -4);
    this.creerArmoireSalleBlanche(6, 0);
  }

  private creerPanneauAllee(texte: string, x: number, y: number, z: number, couleur: string): void {
    const grp = new THREE.Group();

    // Canvas pour le texte du panneau suspendu
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 64);
    ctx.fillStyle = couleur;
    ctx.fillRect(0, 0, 512, 6);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(texte, 256, 42);

    const texture = new THREE.CanvasTexture(canvas);
    const panneauMat = new THREE.MeshBasicMaterial({ map: texture });
    const panneau = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.55, 0.08), panneauMat);
    grp.add(panneau);

    grp.position.set(x, y, z);
    this.scene.add(grp);
  }

  // Palettier industriel métallique
  private creerPalettier(x: number, z: number, nbNiveaux: number): void {
    const grp = new THREE.Group();
    const bleuMat = new THREE.MeshStandardMaterial({ color: '#1d4ed8', metalness: 0.8, roughness: 0.3 });
    const orangeMat = new THREE.MeshStandardMaterial({ color: '#ea580c', metalness: 0.6, roughness: 0.3 });

    // Échelles verticales bleues
    [-1.8, 1.8].forEach(dx => {
      [-0.6, 0.6].forEach(dz => {
        const montant = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.8, 0.12), bleuMat);
        montant.position.set(dx, 1.9, dz);
        montant.castShadow = true;
        grp.add(montant);
      });
    });

    // Lisses horizontales orange
    for (let n = 1; n <= nbNiveaux; n++) {
      const y = n * 1.4;
      const lisseAvant = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.15, 0.08), orangeMat);
      lisseAvant.position.set(0, y, 0.6);
      grp.add(lisseAvant);

      const lisseArriere = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.15, 0.08), orangeMat);
      lisseArriere.position.set(0, y, -0.6);
      grp.add(lisseArriere);

      // Plateau bois pour palettes
      const plateau = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 0.04, 1.2),
        new THREE.MeshStandardMaterial({ color: '#b4864f', roughness: 0.9 })
      );
      plateau.position.set(0, y + 0.08, 0);
      plateau.receiveShadow = true;
      grp.add(plateau);
    }

    grp.position.set(x, 0, z);
    this.scene.add(grp);
  }

  // Armoire à tiroirs métalliques
  private creerArmoireTiroirs(x: number, z: number): void {
    const grp = new THREE.Group();
    const acierMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.85, roughness: 0.25 });
    const meuble = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 0.9), acierMat);
    meuble.position.set(0, 1.1, 0);
    meuble.castShadow = true;
    grp.add(meuble);

    // Lignes de tiroirs avec poignées inox
    for (let ty = 0.3; ty < 2.0; ty += 0.35) {
      const tiroir = new THREE.Mesh(
        new THREE.BoxGeometry(2.3, 0.3, 0.02),
        new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.7 })
      );
      tiroir.position.set(0, ty, 0.46);
      grp.add(tiroir);

      const poign = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.04, 0.05),
        new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.95 })
      );
      poign.position.set(0, ty, 0.49);
      grp.add(poign);
    }

    grp.position.set(x, 0, z);
    this.scene.add(grp);
  }

  // Étagère à bacs plastiques bleus
  private creerEtagereBacs(x: number, z: number): void {
    const grp = new THREE.Group();
    const montantMat = new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.7 });
    const bacMat = new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.3 });

    const structure = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 0.8), montantMat);
    structure.position.set(0, 1.1, 0);
    grp.add(structure);

    // Bacs bleus
    for (let by = 0.4; by <= 1.8; by += 0.45) {
      for (let bx = -0.8; bx <= 0.8; bx += 0.55) {
        const bac = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.25, 0.6), bacMat);
        bac.position.set(bx, by, 0.15);
        bac.castShadow = true;
        grp.add(bac);
      }
    }

    grp.position.set(x, 0, z);
    this.scene.add(grp);
  }

  // Armoire Salle Blanche blanche
  private creerArmoireSalleBlanche(x: number, z: number): void {
    const grp = new THREE.Group();
    const corpsMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.2, metalness: 0.1 });
    const meuble = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.3, 0.8), corpsMat);
    meuble.position.set(0, 1.15, 0);
    meuble.castShadow = true;
    grp.add(meuble);

    // Vitres sécurisées
    const vitreMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', transparent: true, opacity: 0.4 });
    const vitre = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.8), vitreMat);
    vitre.position.set(0, 1.15, 0.42);
    grp.add(vitre);

    grp.position.set(x, 0, z);
    this.scene.add(grp);
  }

  // 4. Les Étagères de Livraison Finale nominatives au quai
  private construireEtageresLivraison(): void {
    for (const etagere of this.etageresLivraison) {
      const grp = new THREE.Group();
      const colHex = parseInt(etagere.codeCouleur.replace('#', '0x'));

      // Meuble de dépose
      const meubleGeo = new THREE.BoxGeometry(2.2, 1.1, 1.0);
      const meubleMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.4 });
      const meuble = new THREE.Mesh(meubleGeo, meubleMat);
      meuble.position.set(0, 0.55, 0);
      grp.add(meuble);

      // Plateau de dépose lumineux
      const plateauGeo = new THREE.BoxGeometry(2.1, 0.08, 0.95);
      const plateauMat = new THREE.MeshStandardMaterial({
        color: colHex,
        emissive: colHex,
        emissiveIntensity: 0.4,
      });
      const plateau = new THREE.Mesh(plateauGeo, plateauMat);
      plateau.position.set(0, 1.14, 0);
      grp.add(plateau);

      // Cadre néon clignotant au-dessus
      const enseigneGeo = new THREE.BoxGeometry(2.2, 0.35, 0.08);
      const enseigneMat = new THREE.MeshStandardMaterial({ color: colHex, emissive: colHex, emissiveIntensity: 0.2 });
      const enseigne = new THREE.Mesh(enseigneGeo, enseigneMat);
      enseigne.position.set(0, 1.7, 0);
      grp.add(enseigne);

      grp.position.copy(etagere.position);
      this.scene.add(grp);
    }
  }

  private construireEtabliCentral(): void {
    // Établi d'emballage central (situé à Z = 2.5, entre les allées et les étagères de livraison)
    const tableGeo = new THREE.BoxGeometry(3.5, 0.9, 1.6);
    const tableMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.5, roughness: 0.3 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(0, 0.45, 2.5);
    table.receiveShadow = true;
    this.scene.add(table);

    // Carton d'emballage prêt à être scotché
    const cartonGeo = new THREE.BoxGeometry(0.8, 0.55, 0.6);
    const cartonMat = new THREE.MeshStandardMaterial({ color: '#b4864f', roughness: 0.85 });
    const carton = new THREE.Mesh(cartonGeo, cartonMat);
    carton.position.set(0, 1.18, 2.5);
    carton.castShadow = true;
    this.scene.add(carton);
  }

  private construireFaisceauLaserZebra(): void {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -6)]);
    const mat = new THREE.LineBasicMaterial({ color: '#ef4444', linewidth: 3 });
    this.faisceauLaser = new THREE.Line(geo, mat);
    this.faisceauLaser.position.set(0, -0.2, -0.3); // Tenu à la main
    this.faisceauLaser.visible = false;
    this.camera.add(this.faisceauLaser);
    this.scene.add(this.camera);
  }

  // Chargement des pièces 3D à leurs emplacements
  private chargerPieces3D(): void {
    this.piecesEnStock = JSON.parse(JSON.stringify(PIECES_EN_STOCK_INITIALES));

    for (const piece of this.piecesEnStock) {
      const loc = this.emplacements.find(e => e.id === piece.emplacementId);
      if (!loc) continue;

      const grp = new THREE.Group();
      if (piece.reference.includes('DRY300')) {
        // Pompe 300kg
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1.0), new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.8 }));
        p.position.set(0, 0.3, 0);
        grp.add(p);
      } else if (piece.reference.includes('FOSB')) {
        // FOSB Vert
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: '#10b981' }));
        f.position.set(0, 0.25, 0);
        grp.add(f);
      } else {
        // Boîtes & raccords
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.2, 16), new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.9 }));
        grp.add(b);
      }

      grp.position.copy(loc.position);
      this.scene.add(grp);
      piece.mesh = grp;
    }
  }

  // Déplacement fluide de l'opérateur dans les allées
  private attacherControlesClavierSouris(): void {
    window.addEventListener('keydown', e => {
      this.touchesEnfoncees[e.code] = true;
    });

    window.addEventListener('keyup', e => {
      this.touchesEnfoncees[e.code] = false;
    });

    const dom = this.renderer.domElement;
    dom.addEventListener('click', () => {
      dom.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      this.estEnPointerLock = document.pointerLockElement === dom;
    });

    window.addEventListener('mousemove', e => {
      if (!this.estEnPointerLock) return;
      this.angleCameraY -= e.movementX * 0.0022;
      this.angleCameraX -= e.movementY * 0.0022;
      this.angleCameraX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.angleCameraX));
    });
  }

  // Déclenchement du tir laser Zebra pour bipper
  public declencherScanLaser(): { type: 'emplacement' | 'etagere' | 'rien'; id: string } {
    this.audio.playScanner();
    this.faisceauLaser.visible = true;
    setTimeout(() => {
      this.faisceauLaser.visible = false;
    }, 250);

    // Raycast depuis le centre de la caméra
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    // Vérifier proximité des emplacements
    for (const loc of this.emplacements) {
      const dist = this.camera.position.distanceTo(loc.position);
      if (dist < 3.5) {
        // En face de l'emplacement
        if (this.onEmplacementVise) this.onEmplacementVise(loc.id);
        return { type: 'emplacement', id: loc.id };
      }
    }

    // Vérifier proximité des étagères de livraison
    for (const etagere of this.etageresLivraison) {
      const dist = this.camera.position.distanceTo(etagere.position);
      if (dist < 3.0) {
        if (this.onEtagereLivraisonVisee) this.onEtagereLivraisonVisee(etagere.id);
        return { type: 'etagere', id: etagere.id };
      }
    }

    return { type: 'rien', id: '' };
  }

  // Téléportation fluide / guidage vers un emplacement
  public allerVers(positionCible: THREE.Vector3): void {
    this.positionOperateur.set(positionCible.x, 1.7, positionCible.z + 1.8);
    this.camera.lookAt(positionCible);
  }

  public update(deltaSec: number): void {
    // Calcul de la direction de marche
    const dir = new THREE.Vector3();
    if (this.touchesEnfoncees['KeyW'] || this.touchesEnfoncees['KeyZ'] || this.touchesEnfoncees['ArrowUp']) dir.z -= 1;
    if (this.touchesEnfoncees['KeyS'] || this.touchesEnfoncees['ArrowDown']) dir.z += 1;
    if (this.touchesEnfoncees['KeyA'] || this.touchesEnfoncees['KeyQ'] || this.touchesEnfoncees['ArrowLeft']) dir.x -= 1;
    if (this.touchesEnfoncees['KeyD'] || this.touchesEnfoncees['ArrowRight']) dir.x += 1;

    if (dir.lengthSq() > 0) {
      dir.normalize();
      dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.angleCameraY);
      this.positionOperateur.addScaledVector(dir, this.vitesseMarche * deltaSec);

      // Limites de l'entrepôt
      this.positionOperateur.x = Math.max(-10, Math.min(10, this.positionOperateur.x));
      this.positionOperateur.z = Math.max(-7.5, Math.min(7.5, this.positionOperateur.z));
    }

    // Orientation caméra
    this.camera.position.copy(this.positionOperateur);
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotation.y = this.angleCameraY;
    this.camera.rotation.x = this.angleCameraX;

    this.renderer.render(this.scene, this.camera);
  }

  private onResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
