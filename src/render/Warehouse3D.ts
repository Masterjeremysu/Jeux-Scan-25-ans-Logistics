import * as THREE from 'three';
import { EMPLACEMENTS_ENTREPOT, ETAGERES_LIVRAISON } from '../core/WarehouseData';
import { EmplacementEntrepot, EtagereLivraison, PieceEnStock } from '../types/game';
import { AudioEffets } from '../audio/SoundEffects';
import { GenerateurEtiquettesEAN128 } from './LabelGenerator';

export class Entrepot3D {
  private container: HTMLElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private audio: AudioEffets;

  public emplacements: EmplacementEntrepot[] = EMPLACEMENTS_ENTREPOT;
  public etageresLivraison: EtagereLivraison[] = ETAGERES_LIVRAISON;
  public piecesEnStock: PieceEnStock[] = [];

  // Système de tiroir interactif animé
  public tiroirCibleMesh!: THREE.Group;
  public tiroirEstOuvert: boolean = false;
  public progressionOuvertureTiroir: number = 0; // 0 (fermé) à 1 (ouvert)
  public piecesDansTiroir: THREE.Mesh[] = [];

  // Modes de caméra : 'marche_fps' vs 'inspection_dessus'
  public modeCamera: 'marche_fps' | 'inspection_dessus' = 'marche_fps';
  public positionOperateur = new THREE.Vector3(0, 1.7, 4.0);
  public angleCameraY = 0;
  public angleCameraX = 0;

  // Cible de la caméra pour l'animation de transition douce
  private camPosCible = new THREE.Vector3();
  private camLookAtCible = new THREE.Vector3();

  private touchesEnfoncees: Record<string, boolean> = {};
  private vitesseMarche = 4.5;
  private estEnPointerLock = false;

  // Raycaster & Scanner Zebra
  private raycaster = new THREE.Raycaster();
  private pointeurSouris = new THREE.Vector2();
  public faisceauLaser!: THREE.Line;

  // Callbacks
  public onEmplacementVise: ((locId: string) => void) | null = null;
  public onEtagereLivraisonVisee: ((etagereId: string) => void) | null = null;
  public onPieceSaisieDansTiroir: (() => void) | null = null;

  constructor(container: HTMLElement, audio: AudioEffets) {
    this.container = container;
    this.audio = audio;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0f172a'); // Bleu ardoise profond, pas noir étouffant
    this.scene.fog = new THREE.FogExp2('#0f172a', 0.02);

    this.camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 0.1, 70);
    this.camera.position.copy(this.positionOperateur);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.initialiserEclairageUltraLumineux();
    this.construireSolEtMarquages();
    this.construireRacksEtArmoiresEAN128();
    this.construireEtageresLivraison();
    this.construireEtabliCentral();
    this.construireFaisceauLaserZebra();
    this.attacherControlesInteractions();

    window.addEventListener('resize', () => this.onResize());
  }

  // Éclairage puissant de niveau showroom / entrepôt moderne
  private initialiserEclairageUltraLumineux(): void {
    const ambiante = new THREE.AmbientLight('#f8fafc', 1.4); // Très clair et lisible
    this.scene.add(ambiante);

    // Lumière directionnelle principale blanche
    const soleilAtelier = new THREE.DirectionalLight('#ffffff', 1.8);
    soleilAtelier.position.set(4, 10, 5);
    soleilAtelier.castShadow = true;
    soleilAtelier.shadow.mapSize.width = 2048;
    soleilAtelier.shadow.mapSize.height = 2048;
    this.scene.add(soleilAtelier);

    // Rampes néons blanches au-dessus de chaque allée
    [-6, 0, 6].forEach(x => {
      for (let z = -5; z <= 4; z += 3.5) {
        const spot = new THREE.SpotLight('#ffffff', 2.2, 10, Math.PI / 3, 0.3);
        spot.position.set(x, 5.0, z);
        this.scene.add(spot);

        // Boîtier de réglette suspendue
        const barre = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.08, 2.2),
          new THREE.MeshStandardMaterial({ color: '#f8fafc', emissive: '#ffffff', emissiveIntensity: 0.8 })
        );
        barre.position.set(x, 5.05, z);
        this.scene.add(barre);
      }
    });
  }

  private construireSolEtMarquages(): void {
    // Sol résine époxy claire
    const solGeo = new THREE.PlaneGeometry(26, 22);
    const solMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.3, metalness: 0.15 });
    const sol = new THREE.Mesh(solGeo, solMat);
    sol.rotation.x = -Math.PI / 2;
    sol.receiveShadow = true;
    this.scene.add(sol);

    // Lignes de sécurité jaune vif
    const tracerLigne = (x1: number, z1: number, x2: number, z2: number) => {
      const lg = Math.hypot(x2 - x1, z2 - z1);
      const angle = Math.atan2(x2 - x1, z2 - z1);
      const ligne = new THREE.Mesh(
        new THREE.PlaneGeometry(0.14, lg),
        new THREE.MeshBasicMaterial({ color: '#facc15' })
      );
      ligne.rotation.x = -Math.PI / 2;
      ligne.rotation.z = -angle;
      ligne.position.set((x1 + x2) / 2, 0.015, (z1 + z2) / 2);
      this.scene.add(ligne);
    };

    tracerLigne(-8.5, -7.5, -8.5, 7.5);
    tracerLigne(-3.0, -7.5, -3.0, 7.5);
    tracerLigne(3.0, -7.5, 3.0, 7.5);
    tracerLigne(8.5, -7.5, 8.5, 7.5);
  }

  // Racks & Armoires avec vraies textures d'étiquettes EAN128
  private construireRacksEtArmoiresEAN128(): void {
    // Panneaux hauts des allées
    this.creerPanneauHaut('🅰️ ALLÉE A • PALETTIER LOURD & VIDE', -6, 4.0, -6.5, '#3b82f6');
    this.creerPanneauHaut('🅱️ ALLÉE B • TIROIRS & RACCORDS FLUIDES', 0, 4.0, -6.5, '#f59e0b');
    this.creerPanneauHaut('🅲 ALLÉE C • ARMOIRES STÉRILES & WAFERS', 6, 4.0, -6.5, '#10b981');

    // 1. ALLÉE A : Racks à palettes (Bleu #1e40af / Orange #ea580c)
    this.creerPalettier(-6, -4, 'LOC-A01-N1', 'POMPE SÈCHE 300 KG');
    this.creerPalettier(-6, 0, 'LOC-A02-N2', 'POMPE TURBO 300 L/S');

    // 2. ALLÉE B : Armoire industrielle à tiroirs animés
    this.creerArmoireTiroirsAnimee(0, -4);
    this.creerEtagereBacs(0, 0, 'LOC-B02-B12', 'JAUGES PIRANI');

    // 3. ALLÉE C : Armoires Salle Blanche
    this.creerArmoireSalleBlanche(6, -4, 'LOC-C01-F01', 'FOSB 300MM VERT');
    this.creerArmoireSalleBlanche(6, 0, 'LOC-C02-W02', 'WAFERS 200MM');
  }

  private creerPanneauHaut(texte: string, x: number, y: number, z: number, couleur: string): void {
    const grp = new THREE.Group();
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 70;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 70);
    ctx.fillStyle = couleur;
    ctx.fillRect(0, 0, 512, 8);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(texte, 256, 46);

    const texture = new THREE.CanvasTexture(canvas);
    const panneau = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 0.6, 0.08),
      new THREE.MeshBasicMaterial({ map: texture })
    );
    grp.add(panneau);
    grp.position.set(x, y, z);
    this.scene.add(grp);
  }

  // Palettier avec étiquette EAN128 sur la lisse
  private creerPalettier(x: number, z: number, codeEAN: string, designation: string): void {
    const grp = new THREE.Group();
    const bleuMat = new THREE.MeshStandardMaterial({ color: '#2563eb', metalness: 0.7, roughness: 0.25 });
    const orangeMat = new THREE.MeshStandardMaterial({ color: '#f97316', metalness: 0.6, roughness: 0.25 });

    // Montants bleus
    [-1.8, 1.8].forEach(dx => {
      [-0.6, 0.6].forEach(dz => {
        const poteau = new THREE.Mesh(new THREE.BoxGeometry(0.14, 4.0, 0.14), bleuMat);
        poteau.position.set(dx, 2.0, dz);
        poteau.castShadow = true;
        grp.add(poteau);
      });
    });

    // Lisses orange
    for (let niveau = 1; niveau <= 2; niveau++) {
      const y = niveau * 1.5;
      const lisse = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.16, 0.08), orangeMat);
      lisse.position.set(0, y, 0.6);
      grp.add(lisse);

      // Plateau bois
      const plateau = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 0.05, 1.2),
        new THREE.MeshStandardMaterial({ color: '#c29b68', roughness: 0.8 })
      );
      plateau.position.set(0, y + 0.08, 0);
      grp.add(plateau);

      // Étiquette EAN128 sur la lisse
      const etiqTexture = GenerateurEtiquettesEAN128.creerTextureEAN128(codeEAN, designation, 'A');
      const etiqMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 0.14),
        new THREE.MeshBasicMaterial({ map: etiqTexture })
      );
      etiqMesh.position.set(0, y, 0.65);
      grp.add(etiqMesh);
    }

    grp.position.set(x, 0, z);
    this.scene.add(grp);
  }

  // Armoire industrielle avec LE TIROIR ANIMÉ `LOC-B01-T03`
  private creerArmoireTiroirsAnimee(x: number, z: number): void {
    const grp = new THREE.Group();
    const meubleMat = new THREE.MeshStandardMaterial({
      color: '#475569', // Gris acier moderne visible
      metalness: 0.7,
      roughness: 0.25,
    });

    // Bâti extérieur
    const caisson = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.3, 1.0), meubleMat);
    caisson.position.set(0, 1.15, 0);
    caisson.castShadow = true;
    grp.add(caisson);

    // Tiroirs décoratifs fermés
    for (let ty = 0.35; ty <= 1.85; ty += 0.4) {
      if (Math.abs(ty - 1.15) < 0.1) continue; // On laisse l'emplacement pour le tiroir actif !

      const facade = new THREE.Mesh(
        new THREE.BoxGeometry(2.35, 0.34, 0.04),
        new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.8 })
      );
      facade.position.set(0, ty, 0.52);
      grp.add(facade);

      // Poignée inox
      const poign = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.04, 0.04),
        new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.95 })
      );
      poign.position.set(0, ty, 0.55);
      grp.add(poign);
    }

    // LE TIROIR INTERACTIF `LOC-B01-T03` (Structure ouverte creuse avec bacs intérieurs)
    this.tiroirCibleMesh = new THREE.Group();
    const tiroirMat = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.6, roughness: 0.3 });

    // Fond du tiroir (plaque basse)
    const fondTiroir = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.03, 0.92), tiroirMat);
    fondTiroir.position.set(0, -0.14, 0);
    this.tiroirCibleMesh.add(fondTiroir);

    // Paroi arrière
    const arriereTiroir = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.28, 0.03), tiroirMat);
    arriereTiroir.position.set(0, 0, -0.46);
    this.tiroirCibleMesh.add(arriereTiroir);

    // Paroi gauche
    const gaucheTiroir = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 0.92), tiroirMat);
    gaucheTiroir.position.set(-1.14, 0, 0);
    this.tiroirCibleMesh.add(gaucheTiroir);

    // Paroi droite
    const droiteTiroir = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 0.92), tiroirMat);
    droiteTiroir.position.set(1.14, 0, 0);
    this.tiroirCibleMesh.add(droiteTiroir);

    // Façade avant du tiroir
    const facadeActive = new THREE.Mesh(
      new THREE.BoxGeometry(2.35, 0.34, 0.04),
      new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.85 })
    );
    facadeActive.position.set(0, 0, 0.47);
    this.tiroirCibleMesh.add(facadeActive);

    // Poignée avant inox
    const poignActive = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.04, 0.04),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', metalness: 0.95 })
    );
    poignActive.position.set(0, 0, 0.50);
    this.tiroirCibleMesh.add(poignActive);

    // ÉTIQUETTE EAN-128 OFFICIELLE SUR LA FAÇADE DU TIROIR
    const texEAN = GenerateurEtiquettesEAN128.creerTextureEAN128('LOC-B01-T03', 'BRIDES & RACCORDS KF40', 'B');
    const etiqEAN128 = new THREE.Mesh(
      new THREE.PlaneGeometry(0.85, 0.22),
      new THREE.MeshBasicMaterial({ map: texEAN })
    );
    etiqEAN128.position.set(0, 0, 0.51);
    this.tiroirCibleMesh.add(etiqEAN128);

    // COMPARTIMENTS INTÉRIEURS THERMOFORMÉS (Vue du dessus)
    this.construireInterieurTiroir();

    this.tiroirCibleMesh.position.set(0, 1.15, 0);
    grp.add(this.tiroirCibleMesh);

    grp.position.set(x, 0, z);
    this.scene.add(grp);
  }

  // Aménagement intérieur du tiroir avec séparateurs et pièces palpables
  private construireInterieurTiroir(): void {
    const separateurMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.6, roughness: 0.3 });

    // Séparateurs de casiers thermoformés
    const sep1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.88), separateurMat);
    sep1.position.set(-0.38, -0.02, 0);
    this.tiroirCibleMesh.add(sep1);

    const sep2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.88), separateurMat);
    sep2.position.set(0.38, -0.02, 0);
    this.tiroirCibleMesh.add(sep2);

    // Lumière LED interne intégrée au tiroir pour faire briller les pièces
    const ledInterne = new THREE.PointLight('#38bdf8', 1.8, 2.5);
    ledInterne.position.set(0, 0.25, 0);
    this.tiroirCibleMesh.add(ledInterne);

    // CASIER GAUCHE : Joints toriques Viton noirs
    for (let i = 0; i < 4; i++) {
      const joint = new THREE.Mesh(
        new THREE.TorusGeometry(0.13, 0.025, 12, 24),
        new THREE.MeshStandardMaterial({ color: '#09090b', roughness: 0.85 })
      );
      joint.rotation.x = Math.PI / 2;
      joint.position.set(-0.75, -0.08, -0.28 + i * 0.18);
      this.tiroirCibleMesh.add(joint);
    }

    // CASIER CENTRE (CIBLÉ) : LES BRIDES INOX KF40 CHROMÉES & BRILLANTES !
    const inoxMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      metalness: 0.98,
      roughness: 0.05, // Miroir inox
      emissive: '#0284c7',
      emissiveIntensity: 0.2,
    });

    for (let i = 0; i < 3; i++) {
      const bride = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 16, 32), inoxMat);
      bride.rotation.x = Math.PI / 2;
      bride.position.set(0, -0.06, -0.24 + i * 0.24);
      bride.castShadow = true;
      bride.userData = { estPieceAInspecter: true, index: i };
      this.piecesDansTiroir.push(bride);
      this.tiroirCibleMesh.add(bride);
    }

    // CASIER DROIT : Bagues de centrage aluminium
    for (let i = 0; i < 3; i++) {
      const bague = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.08, 24),
        new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.92, roughness: 0.15 })
      );
      bague.position.set(0.75, -0.07, -0.2 + i * 0.22);
      this.tiroirCibleMesh.add(bague);
    }
  }

  private creerEtagereBacs(x: number, z: number, codeEAN: string, designation: string): void {
    const grp = new THREE.Group();
    const meuble = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.2, 0.8),
      new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.7 })
    );
    meuble.position.set(0, 1.1, 0);
    grp.add(meuble);

    // Bacs bleus
    const bacMat = new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.3 });
    for (let by = 0.4; by <= 1.8; by += 0.45) {
      for (let bx = -0.8; bx <= 0.8; bx += 0.55) {
        const bac = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.25, 0.6), bacMat);
        bac.position.set(bx, by, 0.15);
        grp.add(bac);
      }
    }

    // Étiquette EAN128
    const texEAN = GenerateurEtiquettesEAN128.creerTextureEAN128(codeEAN, designation, 'B');
    const etiq = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.22), new THREE.MeshBasicMaterial({ map: texEAN }));
    etiq.position.set(0, 2.1, 0.42);
    grp.add(etiq);

    grp.position.set(x, 0, z);
    this.scene.add(grp);
  }

  private creerArmoireSalleBlanche(x: number, z: number, codeEAN: string, designation: string): void {
    const grp = new THREE.Group();
    const corps = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 2.3, 0.8),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.2, metalness: 0.1 })
    );
    corps.position.set(0, 1.15, 0);
    grp.add(corps);

    // Vitres
    const vitre = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 1.8),
      new THREE.MeshStandardMaterial({ color: '#38bdf8', transparent: true, opacity: 0.4 })
    );
    vitre.position.set(0, 1.15, 0.42);
    grp.add(vitre);

    // Étiquette EAN128
    const texEAN = GenerateurEtiquettesEAN128.creerTextureEAN128(codeEAN, designation, 'C');
    const etiq = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.22), new THREE.MeshBasicMaterial({ map: texEAN }));
    etiq.position.set(0, 2.15, 0.42);
    grp.add(etiq);

    grp.position.set(x, 0, z);
    this.scene.add(grp);
  }

  private construireEtageresLivraison(): void {
    for (const etagere of this.etageresLivraison) {
      const grp = new THREE.Group();
      const colHex = parseInt(etagere.codeCouleur.replace('#', '0x'));

      const meuble = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 1.1, 1.0),
        new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.4 })
      );
      meuble.position.set(0, 0.55, 0);
      grp.add(meuble);

      const plateau = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.08, 0.95),
        new THREE.MeshStandardMaterial({ color: colHex, emissive: colHex, emissiveIntensity: 0.45 })
      );
      plateau.position.set(0, 1.14, 0);
      grp.add(plateau);

      const enseigne = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.35, 0.08),
        new THREE.MeshStandardMaterial({ color: colHex, emissive: colHex, emissiveIntensity: 0.3 })
      );
      enseigne.position.set(0, 1.7, 0);
      grp.add(enseigne);

      grp.position.copy(etagere.position);
      this.scene.add(grp);
    }
  }

  private construireEtabliCentral(): void {
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.9, 1.6),
      new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.6, roughness: 0.25 })
    );
    table.position.set(0, 0.45, 2.5);
    table.receiveShadow = true;
    this.scene.add(table);

    const carton = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.55, 0.6),
      new THREE.MeshStandardMaterial({ color: '#b4864f', roughness: 0.85 })
    );
    carton.position.set(0, 1.18, 2.5);
    this.scene.add(carton);
  }

  private construireFaisceauLaserZebra(): void {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -6)]);
    const mat = new THREE.LineBasicMaterial({ color: '#ef4444', linewidth: 3 });
    this.faisceauLaser = new THREE.Line(geo, mat);
    this.faisceauLaser.position.set(0, -0.2, -0.3);
    this.faisceauLaser.visible = false;
    this.camera.add(this.faisceauLaser);
    this.scene.add(this.camera);
  }

  // ANIMATION DU TIROIR & TRANSITION VUE DU DESSUS
  public ouvrirTiroirInspection(): void {
    if (this.tiroirEstOuvert) return;
    this.audio.playDrawerOpen();
    this.tiroirEstOuvert = true;
    this.modeCamera = 'inspection_dessus';

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    // Position cible de la caméra : Bien plus haute et plongeante pour voir tout l'intérieur du tiroir avec ergonomie
    this.camPosCible.set(0, 2.85, -2.15); // Hauteur 2.85m et recul Z=-2.15m
    this.camLookAtCible.set(0, 1.05, -3.25); // Plongée directe à 65° sur les bacs et pièces inox
  }

  public refermerTiroir(): void {
    if (!this.tiroirEstOuvert) return;
    this.audio.playDrawerClose();
    this.tiroirEstOuvert = false;
    this.modeCamera = 'marche_fps';
  }

  // Détection du clic sur les pièces du tiroir (Vue du dessus)
  private attacherControlesInteractions(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('pointerdown', (e: MouseEvent) => {
      if (this.modeCamera === 'inspection_dessus') {
        const rect = dom.getBoundingClientRect();
        this.pointeurSouris.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointeurSouris.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.pointeurSouris, this.camera);
        const intersections = this.raycaster.intersectObjects(this.piecesDansTiroir, true);

        if (intersections.length > 0) {
          const pieceMesh = intersections[0].object as THREE.Mesh;
          this.audio.playMetalClink();

          // Animation de soulèvement de la pièce
          pieceMesh.position.y += 0.15;
          setTimeout(() => {
            pieceMesh.visible = false; // Retirée du tiroir
          }, 300);

          if (this.onPieceSaisieDansTiroir) {
            this.onPieceSaisieDansTiroir();
          }
        }
      } else {
        dom.requestPointerLock();
      }
    });

    window.addEventListener('keydown', e => {
      this.touchesEnfoncees[e.code] = true;
      if (e.code === 'Escape' && this.modeCamera === 'inspection_dessus') {
        this.refermerTiroir();
      }
    });

    window.addEventListener('keyup', e => {
      this.touchesEnfoncees[e.code] = false;
    });

    document.addEventListener('pointerlockchange', () => {
      this.estEnPointerLock = document.pointerLockElement === dom;
    });

    window.addEventListener('mousemove', e => {
      if (this.modeCamera === 'marche_fps' && this.estEnPointerLock) {
        this.angleCameraY -= e.movementX * 0.0022;
        this.angleCameraX -= e.movementY * 0.0022;
        this.angleCameraX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.angleCameraX));
      }
    });
  }

  public declencherScanLaser(): { type: 'emplacement' | 'etagere' | 'rien'; id: string } {
    this.audio.playScanner();
    this.faisceauLaser.visible = true;
    setTimeout(() => {
      this.faisceauLaser.visible = false;
    }, 250);

    for (const loc of this.emplacements) {
      const dist = this.camera.position.distanceTo(loc.position);
      if (dist < 3.8) {
        if (loc.id === 'LOC-B01-T03') {
          // Ouvre automatiquement le tiroir en grand avec zoom vue du dessus !
          this.ouvrirTiroirInspection();
        }
        if (this.onEmplacementVise) this.onEmplacementVise(loc.id);
        return { type: 'emplacement', id: loc.id };
      }
    }

    for (const etagere of this.etageresLivraison) {
      const dist = this.camera.position.distanceTo(etagere.position);
      if (dist < 3.2) {
        if (this.onEtagereLivraisonVisee) this.onEtagereLivraisonVisee(etagere.id);
        return { type: 'etagere', id: etagere.id };
      }
    }

    return { type: 'rien', id: '' };
  }

  public allerVers(positionCible: THREE.Vector3): void {
    this.positionOperateur.set(positionCible.x, 1.7, positionCible.z + 1.8);
    this.camera.lookAt(positionCible);
  }

  public update(deltaSec: number): void {
    // 1. Animation fluide d'ouverture / fermeture du tiroir (coulissement Z)
    if (this.tiroirEstOuvert && this.progressionOuvertureTiroir < 1) {
      this.progressionOuvertureTiroir = Math.min(1, this.progressionOuvertureTiroir + deltaSec * 3.0);
    } else if (!this.tiroirEstOuvert && this.progressionOuvertureTiroir > 0) {
      this.progressionOuvertureTiroir = Math.max(0, this.progressionOuvertureTiroir - deltaSec * 3.5);
    }
    this.tiroirCibleMesh.position.z = this.progressionOuvertureTiroir * 0.85; // Glisse de 85cm vers l'avant !

    // 2. Gestion de la caméra
    if (this.modeCamera === 'inspection_dessus') {
      // Transition douce (Lerp) vers la vue plongeante du tiroir
      this.camera.position.lerp(this.camPosCible, 0.12);
      this.camera.lookAt(this.camLookAtCible);
    } else {
      // Déplacement FPS classique
      const dir = new THREE.Vector3();
      if (this.touchesEnfoncees['KeyW'] || this.touchesEnfoncees['KeyZ'] || this.touchesEnfoncees['ArrowUp']) dir.z -= 1;
      if (this.touchesEnfoncees['KeyS'] || this.touchesEnfoncees['ArrowDown']) dir.z += 1;
      if (this.touchesEnfoncees['KeyA'] || this.touchesEnfoncees['KeyQ'] || this.touchesEnfoncees['ArrowLeft']) dir.x -= 1;
      if (this.touchesEnfoncees['KeyD'] || this.touchesEnfoncees['ArrowRight']) dir.x += 1;

      if (dir.lengthSq() > 0) {
        dir.normalize();
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.angleCameraY);
        this.positionOperateur.addScaledVector(dir, this.vitesseMarche * deltaSec);
        this.positionOperateur.x = Math.max(-10, Math.min(10, this.positionOperateur.x));
        this.positionOperateur.z = Math.max(-7.5, Math.min(7.5, this.positionOperateur.z));
      }

      this.camera.position.copy(this.positionOperateur);
      this.camera.rotation.set(0, 0, 0);
      this.camera.rotation.y = this.angleCameraY;
      this.camera.rotation.x = this.angleCameraX;
    }

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
