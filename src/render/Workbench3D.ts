import * as THREE from 'three';
import { PieceLogistique, MissionWMS } from '../types/game';
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
  public rabatsMesh: THREE.Mesh[] = [];
  public bandeScotchMesh!: THREE.Mesh;
  public etiquetteMesh!: THREE.Mesh;

  // Statut du carton en cours
  public estFerme: boolean = false;
  public estScotche: boolean = false;
  public estEtiquete: boolean = false;

  // Raycasting & Drag and Drop 3D des pièces
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
    this.scene.background = new THREE.Color('#0a0f1d');
    this.scene.fog = new THREE.FogExp2('#0a0f1d', 0.03);

    this.camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.1,
      50
    );
    this.camera.position.set(0, 4.6, 5.2);
    this.camera.lookAt(0, 0.4, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.initialiserLumieres();
    this.construireEtabli();
    this.construireCarton();
    this.attacherControles();

    window.addEventListener('resize', () => this.onResize());
  }

  private initialiserLumieres(): void {
    const ambiante = new THREE.AmbientLight('#cbd5e1', 0.9);
    this.scene.add(ambiante);

    // Néon d'atelier au-dessus du plan de travail
    const neon = new THREE.SpotLight('#ffffff', 3.2, 10, Math.PI / 3, 0.3);
    neon.position.set(0, 5, 1);
    neon.castShadow = true;
    neon.shadow.mapSize.width = 2048;
    neon.shadow.mapSize.height = 2048;
    this.scene.add(neon);

    // Lumière rasante bleue tech
    const spotBleu = new THREE.PointLight('#38bdf8', 1.4, 8);
    spotBleu.position.set(-3, 2, 1);
    this.scene.add(spotBleu);
  }

  private construireEtabli(): void {
    // Plateau de l'établi
    const plateauGeo = new THREE.BoxGeometry(7, 0.3, 4);
    const plateauMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.4,
      metalness: 0.3,
    });
    const plateau = new THREE.Mesh(plateauGeo, plateauMat);
    plateau.position.set(0, 0, 0);
    plateau.receiveShadow = true;
    this.scene.add(plateau);

    // Tapis de découpe vert antistatique au centre
    const tapisGeo = new THREE.PlaneGeometry(2.4, 1.8);
    const tapisMat = new THREE.MeshStandardMaterial({
      color: '#064e3b',
      roughness: 0.8,
      metalness: 0.1,
    });
    const tapis = new THREE.Mesh(tapisGeo, tapisMat);
    tapis.rotation.x = -Math.PI / 2;
    tapis.position.set(0, 0.16, 0.2);
    tapis.receiveShadow = true;
    this.scene.add(tapis);

    // Dévidoir de scotch d'emballage posé sur le côté droit
    const devidoirGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.15, 24);
    const devidoirMat = new THREE.MeshStandardMaterial({ color: '#ea580c', metalness: 0.5 });
    const devidoir = new THREE.Mesh(devidoirGeo, devidoirMat);
    devidoir.position.set(1.8, 0.25, 0.6);
    devidoir.castShadow = true;
    this.scene.add(devidoir);
  }

  private construireCarton(): void {
    this.cartonMesh = new THREE.Group();

    // Fond et parois du carton kraft
    const epaisseur = 0.04;
    const largeur = 1.4;
    const hauteur = 0.9;
    const profondeur = 1.1;

    const cartonMat = new THREE.MeshStandardMaterial({
      color: '#b4864f', // Kraft
      roughness: 0.9,
      metalness: 0.05,
    });

    // Fond
    const fond = new THREE.Mesh(new THREE.BoxGeometry(largeur, epaisseur, profondeur), cartonMat);
    fond.position.set(0, 0.17, 0);
    fond.receiveShadow = true;
    this.cartonMesh.add(fond);

    // Paroi Avant
    const avant = new THREE.Mesh(new THREE.BoxGeometry(largeur, hauteur, epaisseur), cartonMat);
    avant.position.set(0, 0.17 + hauteur / 2, profondeur / 2);
    avant.castShadow = true;
    avant.receiveShadow = true;
    this.cartonMesh.add(avant);

    // Paroi Arrière
    const arriere = new THREE.Mesh(new THREE.BoxGeometry(largeur, hauteur, epaisseur), cartonMat);
    arriere.position.set(0, 0.17 + hauteur / 2, -profondeur / 2);
    arriere.castShadow = true;
    arriere.receiveShadow = true;
    this.cartonMesh.add(arriere);

    // Paroi Gauche
    const gauche = new THREE.Mesh(new THREE.BoxGeometry(epaisseur, hauteur, profondeur), cartonMat);
    gauche.position.set(-largeur / 2, 0.17 + hauteur / 2, 0);
    gauche.castShadow = true;
    gauche.receiveShadow = true;
    this.cartonMesh.add(gauche);

    // Paroi Droite
    const droite = new THREE.Mesh(new THREE.BoxGeometry(epaisseur, hauteur, profondeur), cartonMat);
    droite.position.set(largeur / 2, 0.17 + hauteur / 2, 0);
    droite.castShadow = true;
    droite.receiveShadow = true;
    this.cartonMesh.add(droite);

    // Les 2 rabats supérieurs (inclinés ouverts au début)
    const rabatGauche = new THREE.Mesh(new THREE.BoxGeometry(largeur / 2 + 0.02, epaisseur, profondeur), cartonMat);
    rabatGauche.position.set(-largeur / 4, 0.17 + hauteur, 0);
    rabatGauche.rotation.z = Math.PI / 4; // Ouvert
    this.rabatsMesh.push(rabatGauche);
    this.cartonMesh.add(rabatGauche);

    const rabatDroit = new THREE.Mesh(new THREE.BoxGeometry(largeur / 2 + 0.02, epaisseur, profondeur), cartonMat);
    rabatDroit.position.set(largeur / 4, 0.17 + hauteur, 0);
    rabatDroit.rotation.z = -Math.PI / 4; // Ouvert
    this.rabatsMesh.push(rabatDroit);
    this.cartonMesh.add(rabatDroit);

    // Bande de scotch marron (initialement invisible)
    const scotchGeo = new THREE.BoxGeometry(1.42, 0.02, 0.18);
    const scotchMat = new THREE.MeshStandardMaterial({
      color: '#854d0e', // Marron adhésif havane
      roughness: 0.3,
      metalness: 0.4,
    });
    this.bandeScotchMesh = new THREE.Mesh(scotchGeo, scotchMat);
    this.bandeScotchMesh.position.set(0, 0.17 + hauteur + 0.01, 0);
    this.bandeScotchMesh.visible = false;
    this.cartonMesh.add(this.bandeScotchMesh);

    // Étiquette logistique (initialement invisible)
    const etiquetteGeo = new THREE.PlaneGeometry(0.5, 0.35);
    const etiquetteMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    this.etiquetteMesh = new THREE.Mesh(etiquetteGeo, etiquetteMat);
    this.etiquetteMesh.rotation.x = -Math.PI / 2;
    this.etiquetteMesh.position.set(0.2, 0.17 + hauteur + 0.02, 0.2);
    this.etiquetteMesh.visible = false;
    this.cartonMesh.add(this.etiquetteMesh);

    this.scene.add(this.cartonMesh);
  }

  public chargerPiecesPourMission(mission: MissionWMS): void {
    // Nettoyer les pièces précédentes
    for (const p of this.piecesDisponibles) {
      if (p.mesh) this.scene.remove(p.mesh);
    }
    this.piecesDisponibles = [];
    this.estFerme = false;
    this.estScotche = false;
    this.estEtiquete = false;

    // Réinitialiser le carton
    this.rabatsMesh[0].rotation.z = Math.PI / 4;
    this.rabatsMesh[1].rotation.z = -Math.PI / 4;
    this.bandeScotchMesh.visible = false;
    this.etiquetteMesh.visible = false;

    // Générer les pièces requises sur l'établi
    let indexX = 0;
    for (const refDem of mission.references) {
      const modele = CATALOGUE_PIECES_STOCK.find(p => p.reference === refDem.reference);
      if (!modele) continue;

      const groupe = this.creerMeshPiece(modele.categorie);
      const posX = -2.4 + (indexX % 3) * 0.9;
      const posZ = -0.7 + Math.floor(indexX / 3) * 0.9;
      groupe.position.set(posX, 0.35, posZ);
      this.scene.add(groupe);

      const piece: PieceLogistique = {
        ...modele,
        mesh: groupe,
        estEmballee: false,
        positionInitiale: new THREE.Vector3(posX, 0.35, posZ),
      };

      this.piecesDisponibles.push(piece);
      indexX++;
    }
  }

  private creerMeshPiece(categorie: string): THREE.Group {
    const grp = new THREE.Group();

    if (categorie === 'pompe') {
      // Corps cylindrique turbomoléculaire en alu brossé
      const corpsGeo = new THREE.CylinderGeometry(0.25, 0.22, 0.55, 32);
      const corpsMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.9, roughness: 0.15 });
      const corps = new THREE.Mesh(corpsGeo, corpsMat);
      corps.castShadow = true;
      grp.add(corps);

      // Bride supérieure KF
      const brideGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 32);
      const bride = new THREE.Mesh(brideGeo, corpsMat);
      bride.position.y = 0.3;
      grp.add(bride);
    } else if (categorie === 'raccord_vide') {
      // Anneau bride inox
      const torusGeo = new THREE.TorusGeometry(0.18, 0.05, 16, 32);
      const mat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.95, roughness: 0.1 });
      const anneau = new THREE.Mesh(torusGeo, mat);
      anneau.rotation.x = Math.PI / 2;
      anneau.castShadow = true;
      grp.add(anneau);
    } else if (categorie === 'jauge') {
      // Petite jauge Pirani avec connecteur
      const tubeGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 16);
      const mat = new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.7 });
      const tube = new THREE.Mesh(tubeGeo, mat);
      tube.castShadow = true;
      grp.add(tube);
    } else {
      // Boîte wafers 300mm stérile
      const boiteGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.12, 32);
      const mat = new THREE.MeshStandardMaterial({ color: '#0284c7', transparent: true, opacity: 0.85 });
      const boite = new THREE.Mesh(boiteGeo, mat);
      boite.castShadow = true;
      grp.add(boite);
    }

    return grp;
  }

  private attacherControles(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('pointerdown', (e: PointerEvent) => {
      this.actualiserPointeur(e);
      this.raycaster.setFromCamera(this.pointeur, this.camera);

      // Vérifier si on clique sur une pièce disponible
      const meshesPieces = this.piecesDisponibles
        .filter(p => !p.estEmballee && p.mesh)
        .map(p => p.mesh!);

      const intersections = this.raycaster.intersectObjects(meshesPieces, true);

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
          this.piecePrise.mesh.position.y = 1.5; // Soulevée
        }
      }
    });

    window.addEventListener('pointerup', () => {
      if (this.piecePrise && this.piecePrise.mesh) {
        const pos = this.piecePrise.mesh.position;
        // Vérifier si la pièce est relâchée à l'intérieur du carton (au centre)
        if (Math.abs(pos.x) < 0.6 && Math.abs(pos.z) < 0.5) {
          // Pièce injectée dans le carton !
          this.audio.playDrop();
          this.piecePrise.estEmballee = true;
          this.piecePrise.mesh.position.set(
            (Math.random() - 0.5) * 0.4,
            0.4,
            (Math.random() - 0.5) * 0.4
          );

          if (this.onPieceScaneeEtInjectee) {
            this.onPieceScaneeEtInjectee(this.piecePrise);
          }

          // Vérifier si toutes les pièces de la commande sont emballées
          const toutesEmballees = this.piecesDisponibles.every(p => p.estEmballee);
          if (toutesEmballees) {
            this.fermerRabatsCarton();
          }
        } else {
          // Remettre à la position initiale sur l'établi
          this.piecePrise.mesh.position.copy(this.piecePrise.positionInitiale);
          this.audio.playDrop();
        }

        this.piecePrise = null;
      }
    });
  }

  public fermerRabatsCarton(): void {
    this.estFerme = true;
    this.rabatsMesh[0].rotation.z = 0; // Rabattu à plat
    this.rabatsMesh[1].rotation.z = 0;
  }

  public scotcherCarton(): boolean {
    if (!this.estFerme || this.estScotche) return false;

    this.audio.playScotch();
    this.estScotche = true;
    this.bandeScotchMesh.visible = true;

    if (this.onCartonScotche) {
      this.onCartonScotche();
    }
    return true;
  }

  public poserEtiquetteExpedition(): void {
    if (!this.estScotche || this.estEtiquete) return;
    this.audio.playDrop();
    this.estEtiquete = true;
    this.etiquetteMesh.visible = true;
    this.audio.playSuccess();
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
