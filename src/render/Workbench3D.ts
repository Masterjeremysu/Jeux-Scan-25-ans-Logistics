import * as THREE from 'three';
import { PieceLogistique, MissionWMS, CouleurFOSB } from '../types/game';
import { CATALOGUE_PIECES_STOCK } from '../core/MissionsData';
import { AudioEffets } from '../audio/SoundEffects';

export class EtabliPreparation3D {
  private container: HTMLElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private audio: AudioEffets;

  // Objets 3D du poste de travail
  public piecesDisponibles: PieceLogistique[] = [];
  public cartonMesh!: THREE.Group;
  public paletteLourdeMesh!: THREE.Group;
  public palanGroupe!: THREE.Group;
  public crochetPalan!: THREE.Group;
  public sanglesMesh!: THREE.Group;
  public rabatsMesh: THREE.Mesh[] = [];
  public bandeScotchMesh!: THREE.Mesh;
  public etiquetteMesh!: THREE.Mesh;
  public chipsCalageGroupe!: THREE.Group;
  public doubleEmballageMesh!: THREE.Mesh;

  // Statuts d'atelier
  public missionEnCours: MissionWMS | null = null;
  public pompeLourdeMesh: THREE.Group | null = null;
  public palanEnPositionHaute: boolean = false;
  public pompeSurPalette: boolean = false;
  public sanglesFixees: boolean = false;
  public chipsVersees: boolean = false;
  public doubleEmballageApplique: boolean = false;

  public estFerme: boolean = false;
  public estScotche: boolean = false;
  public estEtiquete: boolean = false;

  // Raycasting & Drag and Drop 3D
  private raycaster = new THREE.Raycaster();
  private pointeur = new THREE.Vector2();
  private planTravail = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.8);
  private piecePrise: PieceLogistique | null = null;
  private decalagePrise = new THREE.Vector3();

  // Callbacks
  public onPieceScaneeEtInjectee: ((piece: PieceLogistique) => void) | null = null;
  public onCartonScotche: (() => void) | null = null;

  constructor(container: HTMLElement, audio: AudioEffets) {
    this.container = container;
    this.audio = audio;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#080d1a');
    this.scene.fog = new THREE.FogExp2('#080d1a', 0.025);

    this.camera = new THREE.PerspectiveCamera(44, container.clientWidth / container.clientHeight, 0.1, 50);
    this.camera.position.set(0, 5.2, 6.2);
    this.camera.lookAt(0, 0.6, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.initialiserLumieres();
    this.construireEnvironnement();
    this.construirePalanAtelier();
    this.construirePaletteEurope();
    this.construireCartonEtChips();
    this.attacherControles();

    window.addEventListener('resize', () => this.onResize());
  }

  private initialiserLumieres(): void {
    const ambiante = new THREE.AmbientLight('#94a3b8', 0.85);
    this.scene.add(ambiante);

    // Éclairage zénithal néon de quai
    const projecteurZénith = new THREE.SpotLight('#ffffff', 2.8, 12, Math.PI / 3, 0.25);
    projecteurZénith.position.set(0, 7, 1);
    projecteurZénith.castShadow = true;
    projecteurZénith.shadow.mapSize.width = 2048;
    projecteurZénith.shadow.mapSize.height = 2048;
    this.scene.add(projecteurZénith);

    // Lumière rasante industrielle orange et bleue
    const spotJaune = new THREE.PointLight('#f59e0b', 1.2, 8);
    spotJaune.position.set(3, 3, 1);
    this.scene.add(spotJaune);

    const spotBleu = new THREE.PointLight('#38bdf8', 1.0, 8);
    spotBleu.position.set(-3, 3, 1);
    this.scene.add(spotBleu);
  }

  private construireEnvironnement(): void {
    // Sol de l'atelier logistique CEA
    const solGeo = new THREE.PlaneGeometry(16, 12);
    const solMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.5, metalness: 0.2 });
    const sol = new THREE.Mesh(solGeo, solMat);
    sol.rotation.x = -Math.PI / 2;
    sol.receiveShadow = true;
    this.scene.add(sol);

    // Établi d'emballage au sol
    const tableGeo = new THREE.BoxGeometry(6.5, 0.35, 3.8);
    const tableMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.4, metalness: 0.3 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(0, 0, 0);
    table.receiveShadow = true;
    this.scene.add(table);
  }

  // 1. Modélisation du Palan 3D pour la pompe de 300 kg
  private construirePalanAtelier(): void {
    this.palanGroupe = new THREE.Group();

    // Poutre IPN jaune sécurité au plafond
    const ipnGeo = new THREE.BoxGeometry(7, 0.25, 0.3);
    const jauneSecuMat = new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.7, roughness: 0.3 });
    const ipn = new THREE.Mesh(ipnGeo, jauneSecuMat);
    ipn.position.set(0, 4.2, 0);
    this.palanGroupe.add(ipn);

    // Chariot motorisé suspendu
    const chariotGeo = new THREE.BoxGeometry(0.8, 0.4, 0.5);
    const chariotMat = new THREE.MeshStandardMaterial({ color: '#18181b', metalness: 0.8 });
    const chariot = new THREE.Mesh(chariotGeo, chariotMat);
    chariot.position.set(0, 3.9, 0);
    this.palanGroupe.add(chariot);

    // Crochet et câble de levage
    this.crochetPalan = new THREE.Group();
    const cableGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.8, 8);
    const cableMat = new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.9 });
    const cable = new THREE.Mesh(cableGeo, cableMat);
    cable.position.set(0, 2.9, 0);
    this.crochetPalan.add(cable);

    // Crochet acier avec linguet de sécurité
    const crochetGeo = new THREE.TorusGeometry(0.12, 0.04, 8, 16, Math.PI * 1.5);
    const crochetMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.95 });
    const crochet = new THREE.Mesh(crochetGeo, crochetMat);
    crochet.rotation.z = Math.PI / 4;
    crochet.position.set(0, 1.9, 0);
    this.crochetPalan.add(crochet);

    // Boîte de commande pendulaire jaune avec câble pendant
    const boiteGeo = new THREE.BoxGeometry(0.12, 0.3, 0.08);
    const boite = new THREE.Mesh(boiteGeo, jauneSecuMat);
    boite.position.set(0.6, 2.1, 0.4);
    this.crochetPalan.add(boite);

    this.palanGroupe.add(this.crochetPalan);
    this.scene.add(this.palanGroupe);
  }

  // 2. Modélisation de la Palette Europe en bois
  private construirePaletteEurope(): void {
    this.paletteLourdeMesh = new THREE.Group();
    const boisMat = new THREE.MeshStandardMaterial({ color: '#c29b68', roughness: 0.9 });

    // Semelles inférieures
    for (let x = -0.7; x <= 0.7; x += 0.7) {
      const semelle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 1.6), boisMat);
      semelle.position.set(x, 0.2, 0);
      this.paletteLourdeMesh.add(semelle);
    }

    // Dés en bois aggloméré
    for (let x = -0.7; x <= 0.7; x += 0.7) {
      for (let z = -0.65; z <= 0.65; z += 0.65) {
        const dé = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.18), boisMat);
        dé.position.set(x, 0.29, z);
        this.paletteLourdeMesh.add(dé);
      }
    }

    // Planches supérieures
    for (let z = -0.7; z <= 0.7; z += 0.28) {
      const planche = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.2), boisMat);
      planche.position.set(0, 0.38, z);
      planche.castShadow = true;
      planche.receiveShadow = true;
      this.paletteLourdeMesh.add(planche);
    }

    // Sangles d'arrimage à cliquet orange 5T (initialement invisibles)
    this.sanglesMesh = new THREE.Group();
    const sangleMat = new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.5 }); // Orange vif
    const sangle1 = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.95, 0.08), sangleMat);
    sangle1.position.set(0, 0.85, -0.3);
    this.sanglesMesh.add(sangle1);

    const sangle2 = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.95, 0.08), sangleMat);
    sangle2.position.set(0, 0.85, 0.3);
    this.sanglesMesh.add(sangle2);

    this.sanglesMesh.visible = false;
    this.paletteLourdeMesh.add(this.sanglesMesh);

    this.paletteLourdeMesh.position.set(0, 0, 0);
    this.paletteLourdeMesh.visible = false;
    this.scene.add(this.paletteLourdeMesh);
  }

  // 3. Modélisation du Carton, des Chips et du Double Emballage
  private construireCartonEtChips(): void {
    this.cartonMesh = new THREE.Group();
    const epaisseur = 0.04;
    const largeur = 1.4;
    const hauteur = 0.9;
    const profondeur = 1.1;

    const cartonMat = new THREE.MeshStandardMaterial({ color: '#b4864f', roughness: 0.9 });

    // Fond & Parois
    const fond = new THREE.Mesh(new THREE.BoxGeometry(largeur, epaisseur, profondeur), cartonMat);
    fond.position.set(0, 0.19, 0);
    this.cartonMesh.add(fond);

    const avant = new THREE.Mesh(new THREE.BoxGeometry(largeur, hauteur, epaisseur), cartonMat);
    avant.position.set(0, 0.19 + hauteur / 2, profondeur / 2);
    this.cartonMesh.add(avant);

    const arriere = new THREE.Mesh(new THREE.BoxGeometry(largeur, hauteur, epaisseur), cartonMat);
    arriere.position.set(0, 0.19 + hauteur / 2, -profondeur / 2);
    this.cartonMesh.add(arriere);

    const gauche = new THREE.Mesh(new THREE.BoxGeometry(epaisseur, hauteur, profondeur), cartonMat);
    gauche.position.set(-largeur / 2, 0.19 + hauteur / 2, 0);
    this.cartonMesh.add(gauche);

    const droite = new THREE.Mesh(new THREE.BoxGeometry(epaisseur, hauteur, profondeur), cartonMat);
    droite.position.set(largeur / 2, 0.19 + hauteur / 2, 0);
    this.cartonMesh.add(droite);

    // Rabats
    const rabatGauche = new THREE.Mesh(new THREE.BoxGeometry(largeur / 2 + 0.02, epaisseur, profondeur), cartonMat);
    rabatGauche.position.set(-largeur / 4, 0.19 + hauteur, 0);
    rabatGauche.rotation.z = Math.PI / 4;
    this.rabatsMesh.push(rabatGauche);
    this.cartonMesh.add(rabatGauche);

    const rabatDroit = new THREE.Mesh(new THREE.BoxGeometry(largeur / 2 + 0.02, epaisseur, profondeur), cartonMat);
    rabatDroit.position.set(largeur / 4, 0.19 + hauteur, 0);
    rabatDroit.rotation.z = -Math.PI / 4;
    this.rabatsMesh.push(rabatDroit);
    this.cartonMesh.add(rabatDroit);

    // Chips de calage polystyrène 3D (petits cylindres blancs en grappe)
    this.chipsCalageGroupe = new THREE.Group();
    const chipMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.95 });
    for (let i = 0; i < 35; i++) {
      const chipGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.12, 8);
      const chip = new THREE.Mesh(chipGeo, chipMat);
      chip.position.set((Math.random() - 0.5) * 1.1, 0.45 + Math.random() * 0.35, (Math.random() - 0.5) * 0.8);
      chip.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this.chipsCalageGroupe.add(chip);
    }
    this.chipsCalageGroupe.visible = false;
    this.cartonMesh.add(this.chipsCalageGroupe);

    // Double emballage sachet scellé transparent pour salle blanche
    const sachetGeo = new THREE.BoxGeometry(1.2, 0.7, 0.9);
    const sachetMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      metalness: 0.2,
    });
    this.doubleEmballageMesh = new THREE.Mesh(sachetGeo, sachetMat);
    this.doubleEmballageMesh.position.set(0, 0.55, 0);
    this.doubleEmballageMesh.visible = false;
    this.cartonMesh.add(this.doubleEmballageMesh);

    // Bande de scotch
    const scotchGeo = new THREE.BoxGeometry(1.42, 0.02, 0.18);
    const scotchMat = new THREE.MeshStandardMaterial({ color: '#854d0e', roughness: 0.3 });
    this.bandeScotchMesh = new THREE.Mesh(scotchGeo, scotchMat);
    this.bandeScotchMesh.position.set(0, 0.19 + hauteur + 0.01, 0);
    this.bandeScotchMesh.visible = false;
    this.cartonMesh.add(this.bandeScotchMesh);

    // Étiquette logistique
    const etiquetteGeo = new THREE.PlaneGeometry(0.5, 0.35);
    const etiquetteMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    this.etiquetteMesh = new THREE.Mesh(etiquetteGeo, etiquetteMat);
    this.etiquetteMesh.rotation.x = -Math.PI / 2;
    this.etiquetteMesh.position.set(0.2, 0.19 + hauteur + 0.02, 0.2);
    this.etiquetteMesh.visible = false;
    this.cartonMesh.add(this.etiquetteMesh);

    this.scene.add(this.cartonMesh);
  }

  public chargerMission(mission: MissionWMS): void {
    this.missionEnCours = mission;
    for (const p of this.piecesDisponibles) {
      if (p.mesh) this.scene.remove(p.mesh);
    }
    this.piecesDisponibles = [];

    // Réinitialisation des états
    this.estFerme = false;
    this.estScotche = false;
    this.estEtiquete = false;
    this.chipsVersees = false;
    this.doubleEmballageApplique = false;
    this.sanglesFixees = false;
    this.pompeSurPalette = false;

    this.rabatsMesh[0].rotation.z = Math.PI / 4;
    this.rabatsMesh[1].rotation.z = -Math.PI / 4;
    this.bandeScotchMesh.visible = false;
    this.etiquetteMesh.visible = false;
    this.chipsCalageGroupe.visible = false;
    this.doubleEmballageMesh.visible = false;
    this.sanglesMesh.visible = false;

    // Basculer l'agencement selon le type de mission
    if (mission.conditionnement === 'palette_lourde_palan') {
      this.cartonMesh.visible = false;
      this.paletteLourdeMesh.visible = true;
      this.palanGroupe.visible = true;
      this.camera.position.set(0, 4.8, 6.4);
    } else {
      this.cartonMesh.visible = true;
      this.paletteLourdeMesh.visible = false;
      this.palanGroupe.visible = false;
      this.camera.position.set(0, 4.6, 5.2);
    }

    // Charger les pièces 3D
    let indexX = 0;
    for (const refDem of mission.references) {
      const modele = CATALOGUE_PIECES_STOCK.find(p => p.reference === refDem.reference);
      if (!modele) continue;

      const groupe = this.creerMeshPieceFidele(modele.categorie, modele.couleurFosb);
      let posX = -2.4 + (indexX % 3) * 0.95;
      let posZ = -0.6 + Math.floor(indexX / 3) * 0.9;
      let posY = 0.35;

      if (modele.categorie === 'pompe_300kg') {
        posX = -2.2;
        posY = 0.55;
        this.pompeLourdeMesh = groupe;
      }

      groupe.position.set(posX, posY, posZ);
      this.scene.add(groupe);

      const piece: PieceLogistique = {
        ...modele,
        mesh: groupe,
        estEmballee: false,
        positionInitiale: new THREE.Vector3(posX, posY, posZ),
      };

      this.piecesDisponibles.push(piece);
      indexX++;
    }
  }

  // Création haute fidélité des pièces techniques CEA
  private creerMeshPieceFidele(categorie: string, couleurFosb?: CouleurFOSB): THREE.Group {
    const grp = new THREE.Group();

    if (categorie === 'pompe_300kg') {
      // Énorme pompe sèche industrielle de 300 kg en fonte et inox
      const corpsGeo = new THREE.BoxGeometry(0.9, 0.75, 1.2);
      const corpsMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.8, roughness: 0.3 });
      const corps = new THREE.Mesh(corpsGeo, corpsMat);
      corps.castShadow = true;
      grp.add(corps);

      // Bride d'aspiration DN100 supérieure
      const brideGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.15, 32);
      const brideMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.9 });
      const bride = new THREE.Mesh(brideGeo, brideMat);
      bride.position.set(0, 0.42, -0.2);
      grp.add(bride);

      // Moteur électrique à ailettes arrière
      const motGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.65, 24);
      const mot = new THREE.Mesh(motGeo, corpsMat);
      mot.rotation.x = Math.PI / 2;
      mot.position.set(0, 0, 0.65);
      grp.add(mot);

      // Anneau de levage pour le crochet de palan
      const anneauGeo = new THREE.TorusGeometry(0.08, 0.025, 8, 16);
      const anneau = new THREE.Mesh(anneauGeo, brideMat);
      anneau.position.set(0, 0.48, 0.1);
      grp.add(anneau);
    } else if (categorie === 'wafer_fosb_300') {
      // FOSB 300mm (Front Opening Shipping Box) avec porte frontale et rainures
      let couleurHex = '#ffffff';
      if (couleurFosb === 'vert') couleurHex = '#10b981';
      else if (couleurFosb === 'rouge') couleurHex = '#ef4444';

      const caisseGeo = new THREE.BoxGeometry(0.68, 0.68, 0.65);
      const caisseMat = new THREE.MeshStandardMaterial({
        color: couleurHex,
        roughness: 0.2,
        metalness: 0.1,
        transparent: couleurFosb === 'blanc',
        opacity: 0.88,
      });
      const caisse = new THREE.Mesh(caisseGeo, caisseMat);
      caisse.castShadow = true;
      grp.add(caisse);

      // Porte frontale et poignée supérieure robotique
      const poignGeo = new THREE.BoxGeometry(0.3, 0.06, 0.12);
      const poignMat = new THREE.MeshStandardMaterial({ color: '#1e293b' });
      const poign = new THREE.Mesh(poignGeo, poignMat);
      poign.position.set(0, 0.36, 0);
      grp.add(poign);
    } else if (categorie === 'wafer_200') {
      // Boîte ronde wafers 200mm en polycarbonate avec disque miroir
      const boiteGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.12, 32);
      const boiteMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', transparent: true, opacity: 0.7 });
      const boite = new THREE.Mesh(boiteGeo, boiteMat);
      boite.castShadow = true;
      grp.add(boite);
    } else if (categorie === 'jauge') {
      // Jauge Pirani sensible
      const corps = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.45, 16), new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.9 }));
      corps.castShadow = true;
      grp.add(corps);
    } else {
      // Bride KF40 Inox
      const anneau = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 16, 32), new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.95 }));
      anneau.rotation.x = Math.PI / 2;
      anneau.castShadow = true;
      grp.add(anneau);
    }

    return grp;
  }

  // Action Palan : Lever la pompe 300 kg et la déposer sur la palette
  public actionnerPalan300kg(): boolean {
    if (!this.pompeLourdeMesh || this.pompeSurPalette) return false;

    this.audio.playPalanMoteur();

    // Déplacement animé du palan au-dessus de la pompe
    this.crochetPalan.position.set(-2.2, 0, 0);

    setTimeout(() => {
      // Levage
      this.pompeLourdeMesh!.position.set(0, 1.4, 0);
      this.crochetPalan.position.set(0, 0, 0);

      setTimeout(() => {
        // Descente douce sur la palette
        this.audio.playDrop();
        this.pompeLourdeMesh!.position.set(0, 0.85, 0);
        this.pompeSurPalette = true;

        const piecePompe = this.piecesDisponibles.find(p => p.categorie === 'pompe_300kg');
        if (piecePompe) {
          piecePompe.estEmballee = true;
          if (this.onPieceScaneeEtInjectee) this.onPieceScaneeEtInjectee(piecePompe);
        }
      }, 700);
    }, 600);

    return true;
  }

  // Action Sangler la pompe de 300 kg
  public sanglerPompe300kg(): boolean {
    if (!this.pompeSurPalette || this.sanglesFixees) return false;

    this.audio.playSangleCliquet();
    this.sanglesMesh.visible = true;
    this.sanglesFixees = true;
    return true;
  }

  // Action Verser les Chips de Calage
  public verserChipsCalage(): boolean {
    if (this.chipsVersees) return false;
    this.audio.playChipsCalage();
    this.chipsCalageGroupe.visible = true;
    this.chipsVersees = true;
    return true;
  }

  // Action Double Emballage Salle Blanche
  public appliquerDoubleEmballage(): boolean {
    if (this.doubleEmballageApplique) return false;
    this.audio.playDoubleEmballage();
    this.doubleEmballageMesh.visible = true;
    this.doubleEmballageApplique = true;
    return true;
  }

  public scotcherCarton(): boolean {
    if (!this.estFerme || this.estScotche) return false;

    this.audio.playScotch();
    this.estScotche = true;
    this.bandeScotchMesh.visible = true;
    if (this.onCartonScotche) this.onCartonScotche();
    return true;
  }

  public fermerRabatsCarton(): void {
    this.estFerme = true;
    this.rabatsMesh[0].rotation.z = 0;
    this.rabatsMesh[1].rotation.z = 0;
  }

  public poserEtiquetteExpedition(): void {
    if (this.estEtiquete) return;
    this.audio.playDrop();
    this.estEtiquete = true;
    this.etiquetteMesh.visible = true;
    this.audio.playSuccess();
  }

  private attacherControles(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('pointerdown', (e: PointerEvent) => {
      this.actualiserPointeur(e);
      this.raycaster.setFromCamera(this.pointeur, this.camera);

      // Si c'est la pompe 300kg, impossible à déplacer à la main (nécessite le palan !)
      const piecesManuelles = this.piecesDisponibles
        .filter(p => !p.estEmballee && p.categorie !== 'pompe_300kg' && p.mesh)
        .map(p => p.mesh!);

      const intersections = this.raycaster.intersectObjects(piecesManuelles, true);
      if (intersections.length > 0) {
        let parent = intersections[0].object;
        while (parent.parent && !(parent.parent instanceof THREE.Scene)) {
          parent = parent.parent;
        }

        const piece = this.piecesDisponibles.find(p => p.mesh === parent);
        if (piece) {
          this.piecePrise = piece;
          this.audio.playScanner();

          const pt = new THREE.Vector3();
          this.raycaster.ray.intersectPlane(this.planTravail, pt);
          this.decalagePrise.copy(piece.mesh!.position).sub(pt);
        }
      }
    });

    dom.addEventListener('pointermove', (e: PointerEvent) => {
      this.actualiserPointeur(e);

      if (this.piecePrise && this.piecePrise.mesh) {
        this.raycaster.setFromCamera(this.pointeur, this.camera);
        const pt = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.planTravail, pt)) {
          this.piecePrise.mesh.position.x = pt.x + this.decalagePrise.x;
          this.piecePrise.mesh.position.z = pt.z + this.decalagePrise.z;
          this.piecePrise.mesh.position.y = 1.6;
        }
      }
    });

    window.addEventListener('pointerup', () => {
      if (this.piecePrise && this.piecePrise.mesh) {
        const pos = this.piecePrise.mesh.position;
        if (Math.abs(pos.x) < 0.6 && Math.abs(pos.z) < 0.5) {
          // Pièce déposée dans le carton
          this.audio.playDrop();
          this.piecePrise.estEmballee = true;
          this.piecePrise.mesh.position.set((Math.random() - 0.5) * 0.4, 0.4, (Math.random() - 0.5) * 0.4);

          if (this.onPieceScaneeEtInjectee) this.onPieceScaneeEtInjectee(this.piecePrise);

          const toutEmballe = this.piecesDisponibles.every(p => p.estEmballee);
          if (toutEmballe) {
            this.fermerRabatsCarton();
          }
        } else {
          this.piecePrise.mesh.position.copy(this.piecePrise.positionInitiale);
          this.audio.playDrop();
        }

        this.piecePrise = null;
      }
    });
  }

  private actualiserPointeur(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointeur.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointeur.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  public render(): void {
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
