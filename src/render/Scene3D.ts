import * as THREE from 'three';
import { ColisObjet3D, InfoColis, ZoneDepot, DestinationLabo } from '../types/game';
import { GenerateurTextures } from './TextureGenerator';
import { AudioEffets } from '../audio/SoundEffects';
import confetti from 'canvas-confetti';

export class Scene3D {
  private container: HTMLElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private audio: AudioEffets;

  public colisActifs: ColisObjet3D[] = [];
  public zonesDepot: ZoneDepot[] = [];

  // Interaction & Drag and Drop 3D
  private raycaster = new THREE.Raycaster();
  private pointeur = new THREE.Vector2();
  private planInteraction = new THREE.Plane(new THREE.Vector3(0, 1, 0), -2.0); // Hauteur de lévitation
  private colisSelectionne: ColisObjet3D | null = null;
  private decalagePrise = new THREE.Vector3();
  private estEnTrainDeGlisser = false;

  // Callback quand un colis est scanné / sélectionné
  public onColisInspecte: ((info: InfoColis) => void) | null = null;
  public onColisValide: ((succes: boolean, message: string, bonus: number) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.audio = new AudioEffets();

    // 1. Scène et Brouillard
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0c1222');
    this.scene.fog = new THREE.FogExp2('#0c1222', 0.025);

    // 2. Caméra
    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 7.5, 9.5);
    this.camera.lookAt(0, 0, 0.5);

    // 3. Renderer WebGL
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // 4. Éclairage
    this.initialiserLumieres();

    // 5. Décor Quai CEA & Zones de tri
    this.construireDecorQuai();

    // 6. Événements Souris / Touch
    this.attacherControles();

    window.addEventListener('resize', () => this.onResize());
  }

  private initialiserLumieres(): void {
    const ambiante = new THREE.AmbientLight('#94a3b8', 0.8);
    this.scene.add(ambiante);

    const projecteurPlafond = new THREE.DirectionalLight('#ffffff', 1.8);
    projecteurPlafond.position.set(5, 12, 6);
    projecteurPlafond.castShadow = true;
    projecteurPlafond.shadow.mapSize.width = 2048;
    projecteurPlafond.shadow.mapSize.height = 2048;
    projecteurPlafond.shadow.camera.near = 0.5;
    projecteurPlafond.shadow.camera.far = 25;
    projecteurPlafond.shadow.camera.left = -8;
    projecteurPlafond.shadow.camera.right = 8;
    projecteurPlafond.shadow.camera.top = 8;
    projecteurPlafond.shadow.camera.bottom = -8;
    this.scene.add(projecteurPlafond);

    // Lumières d'ambiance bleutées typiques salle blanche
    const spotBleu = new THREE.PointLight('#38bdf8', 1.2, 15);
    spotBleu.position.set(-4, 3, 2);
    this.scene.add(spotBleu);
  }

  private construireDecorQuai(): void {
    // Sol du quai CEA
    const solGeo = new THREE.PlaneGeometry(24, 20);
    const solMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.3,
      metalness: 0.2,
    });
    const sol = new THREE.Mesh(solGeo, solMat);
    sol.rotation.x = -Math.PI / 2;
    sol.receiveShadow = true;
    this.scene.add(sol);

    // Tapis roulant mécanique à rouleaux à gauche
    const tapisGroupe = new THREE.Group();
    const cadreGeo = new THREE.BoxGeometry(2.6, 0.4, 7);
    const cadreMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.8, roughness: 0.2 });
    const cadre = new THREE.Mesh(cadreGeo, cadreMat);
    cadre.position.set(-4.5, 0.2, 0);
    cadre.receiveShadow = true;
    tapisGroupe.add(cadre);

    // Rouleaux métalliques
    for (let z = -3.2; z <= 3.2; z += 0.4) {
      const rouleauGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.3, 16);
      const rouleauMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.9, roughness: 0.1 });
      const rouleau = new THREE.Mesh(rouleauGeo, rouleauMat);
      rouleau.rotation.z = Math.PI / 2;
      rouleau.position.set(-4.5, 0.45, z);
      rouleau.castShadow = true;
      tapisGroupe.add(rouleau);
    }
    this.scene.add(tapisGroupe);

    // Table centrale d'inspection
    const tableGeo = new THREE.BoxGeometry(3.5, 0.5, 4);
    const tableMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.4, metalness: 0.4 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(-0.5, 0.25, 0);
    table.receiveShadow = true;
    this.scene.add(table);

    // Les 4 zones de destination (Étagères / Casiers à droite)
    this.creerZoneDepot('nanotech', '🧪 Minatec Nanotech', '#f59e0b', 'var(--accent-amber)', 3.5, -2.0);
    this.creerZoneDepot('cryogenie', '❄️ SBT Cryogénie', '#0284c7', 'var(--accent-cyan)', 3.5, -0.6);
    this.creerZoneDepot('quantique', '⚛️ Labo Quantique', '#8b5cf6', '#8b5cf6', 3.5, 0.8);
    this.creerZoneDepot('decontamination', '🛑 Sas Rejet / Décontam.', '#ef4444', 'var(--accent-red)', 3.5, 2.2);
  }

  private creerZoneDepot(
    id: DestinationLabo,
    nom: string,
    couleurHexStr: string,
    couleurCss: string,
    x: number,
    z: number
  ): void {
    const couleurHex = parseInt(couleurHexStr.replace('#', '0x'));
    const groupeZone = new THREE.Group();

    // Socle lumineux
    const socleGeo = new THREE.BoxGeometry(3.0, 0.15, 1.15);
    const socleMat = new THREE.MeshStandardMaterial({
      color: couleurHex,
      emissive: couleurHex,
      emissiveIntensity: 0.25,
      roughness: 0.5,
    });
    const socle = new THREE.Mesh(socleGeo, socleMat);
    socle.position.set(x, 0.08, z);
    socle.receiveShadow = true;
    groupeZone.add(socle);

    // Bordure lumineuse
    const bordGeo = new THREE.BoxGeometry(3.1, 0.3, 1.25);
    const bordMat = new THREE.MeshBasicMaterial({ color: couleurHex, wireframe: true });
    const bord = new THREE.Mesh(bordGeo, bordMat);
    bord.position.set(x, 0.15, z);
    groupeZone.add(bord);

    this.scene.add(groupeZone);

    const boiteEnglobante = new THREE.Box3(
      new THREE.Vector3(x - 1.5, 0, z - 0.6),
      new THREE.Vector3(x + 1.5, 2.5, z + 0.6)
    );

    this.zonesDepot.push({
      id,
      nom,
      couleurHex,
      couleurCss,
      boiteEnglobante,
      mesh: socle,
    });
  }

  public ajouterColis(info: InfoColis, forme: 'boite' | 'cylindre' | 'mallette'): ColisObjet3D {
    const groupe = new THREE.Group();
    let meshPrincipal: THREE.Mesh;

    if (forme === 'cylindre') {
      const geo = new THREE.CylinderGeometry(0.38, 0.38, 1.1, 32);
      const mat = new THREE.MeshStandardMaterial({
        map: GenerateurTextures.creerTextureCylindre(info),
        metalness: 0.8,
        roughness: 0.2,
      });
      meshPrincipal = new THREE.Mesh(geo, mat);
    } else if (forme === 'mallette') {
      const geo = new THREE.BoxGeometry(1.0, 0.35, 0.7);
      const mat = new THREE.MeshStandardMaterial({
        color: '#1e293b',
        metalness: 0.6,
        roughness: 0.3,
      });
      meshPrincipal = new THREE.Mesh(geo, mat);

      // Poignée
      const poignGeo = new THREE.TorusGeometry(0.12, 0.03, 8, 16, Math.PI);
      const poignMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.9 });
      const poign = new THREE.Mesh(poignGeo, poignMat);
      poign.rotation.x = -Math.PI / 2;
      poign.position.set(0, 0, 0.4);
      groupe.add(poign);
    } else {
      // Boîte carton classique
      const geo = new THREE.BoxGeometry(0.9, 0.8, 0.9);
      const mat = new THREE.MeshStandardMaterial({
        map: GenerateurTextures.creerTextureBoite(info),
        roughness: 0.8,
        metalness: 0.05,
      });
      meshPrincipal = new THREE.Mesh(geo, mat);
    }

    meshPrincipal.castShadow = true;
    meshPrincipal.receiveShadow = true;
    groupe.add(meshPrincipal);

    // Positionnement initial sur le tapis roulant d'arrivée
    const zInitial = -2.5 + (this.colisActifs.length % 4) * 1.5;
    groupe.position.set(-4.5, 0.9, zInitial);

    this.scene.add(groupe);

    const objetColis: ColisObjet3D = {
      info,
      mesh: groupe,
      forme,
      estPris: false,
      estPoseCorrectement: false,
      positionCibleY: 0.9,
      velociteY: 0,
      rotationVitesseY: 0,
    };

    this.colisActifs.push(objetColis);
    return objetColis;
  }

  private attacherControles(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('pointerdown', (e: PointerEvent) => {
      this.actualiserCoordonneesPointeur(e);
      this.raycaster.setFromCamera(this.pointeur, this.camera);

      // Chercher l'intersection avec les colis
      const objetsMesh = this.colisActifs.map(c => c.mesh);
      const intersections = this.raycaster.intersectObjects(objetsMesh, true);

      if (intersections.length > 0) {
        // Retrouver le colis parent
        let objetParent = intersections[0].object;
        while (objetParent.parent && !(objetParent.parent instanceof THREE.Scene)) {
          objetParent = objetParent.parent;
        }

        const colisTrouve = this.colisActifs.find(c => c.mesh === objetParent);
        if (colisTrouve && !colisTrouve.estPoseCorrectement) {
          this.colisSelectionne = colisTrouve;
          this.colisSelectionne.estPris = true;
          this.estEnTrainDeGlisser = true;
          this.audio.playScanner();

          if (this.onColisInspecte) {
            this.onColisInspecte(colisTrouve.info);
          }

          // Ajuster le plan d'interaction à la hauteur de levage (Y = 1.8)
          this.planInteraction.constant = -1.8;
          const pointIntersection = new THREE.Vector3();
          this.raycaster.ray.intersectPlane(this.planInteraction, pointIntersection);
          this.decalagePrise.copy(this.colisSelectionne.mesh.position).sub(pointIntersection);
        }
      }
    });

    dom.addEventListener('pointermove', (e: PointerEvent) => {
      this.actualiserCoordonneesPointeur(e);

      if (this.estEnTrainDeGlisser && this.colisSelectionne) {
        this.raycaster.setFromCamera(this.pointeur, this.camera);
        const pointIntersection = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.planInteraction, pointIntersection)) {
          this.colisSelectionne.mesh.position.x = pointIntersection.x + this.decalagePrise.x;
          this.colisSelectionne.mesh.position.z = pointIntersection.z + this.decalagePrise.z;
          this.colisSelectionne.mesh.position.y = 1.8; // Hauteur de transport
        }
      }
    });

    window.addEventListener('pointerup', () => {
      if (this.colisSelectionne) {
        this.relacherColis(this.colisSelectionne);
        this.colisSelectionne.estPris = false;
        this.colisSelectionne = null;
        this.estEnTrainDeGlisser = false;
      }
    });

    // Rotation au clavier (Touches A et E) ou molette
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.colisSelectionne) return;
      if (e.key === 'a' || e.key === 'A') {
        this.colisSelectionne.mesh.rotation.y += Math.PI / 8;
      } else if (e.key === 'e' || e.key === 'E') {
        this.colisSelectionne.mesh.rotation.y -= Math.PI / 8;
      }
    });
  }

  private relacherColis(colis: ColisObjet3D): void {
    const pos = colis.mesh.position;
    this.audio.playDrop();

    // Vérifier si le colis est au-dessus d'une des zones cibles
    let zoneDetectee: ZoneDepot | null = null;
    for (const zone of this.zonesDepot) {
      if (zone.boiteEnglobante.containsPoint(pos)) {
        zoneDetectee = zone;
        break;
      }
    }

    if (zoneDetectee) {
      if (zoneDetectee.id === colis.info.destination) {
        // Succès ! Validé dans la bonne zone
        colis.estPoseCorrectement = true;
        colis.positionCibleY = 0.5;
        this.audio.playSuccess();
        confetti({ particleCount: 50, spread: 60, origin: { x: 0.7, y: 0.5 } });

        if (this.onColisValide) {
          this.onColisValide(true, `✅ ${colis.info.nom} livré au ${zoneDetectee.nom} !`, 250);
        }

        // Faire disparaître le colis après 1.5s
        setTimeout(() => {
          this.retirerColis(colis);
        }, 1500);
      } else {
        // Mauvaise zone !
        this.audio.playError();
        colis.positionCibleY = 0.5;
        if (this.onColisValide) {
          this.onColisValide(
            false,
            `❌ ERREUR ZONE : Ce colis était destiné à [${colis.info.destinationNom}], pas à [${zoneDetectee.nom}] !`,
            -100
          );
        }
      }
    } else {
      // Déposé sur la table ou le sol
      colis.positionCibleY = pos.x > -2 && pos.x < 1.5 && Math.abs(pos.z) < 2 ? 0.75 : 0.45;
    }
  }

  public retirerColis(colis: ColisObjet3D): void {
    this.scene.remove(colis.mesh);
    const index = this.colisActifs.indexOf(colis);
    if (index > -1) {
      this.colisActifs.splice(index, 1);
    }
  }

  private actualiserCoordonneesPointeur(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointeur.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointeur.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  public update(): void {
    // Physique douce de descente des colis relâchés
    for (const c of this.colisActifs) {
      if (!c.estPris) {
        if (c.mesh.position.y > c.positionCibleY) {
          c.mesh.position.y = Math.max(c.positionCibleY, c.mesh.position.y - 0.08);
        }
      }
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
