# 📦 CEA GRENOBLE • NanoDock 3D
### Quai de Réception, Inspection & Tri Haute Sécurité des Colis Scientifiques

Un jeu 3D physique et tactile développé avec **Three.js** et **TypeScript**, situé au cœur de la Presqu'île scientifique de Grenoble (CEA / Minatec / CNRS / ESRF).

---

## 🎮 Concept & Gameplay

Vous incarnez le responsable du quai de réception et du sas de sécurité du **CEA Grenoble**.
Les laboratoires de pointe reçoivent des cargaisons hautement sensibles :

* 🧪 **Minatec Nanotech (Zone Jaune) :** Wafers de silicium pour puces 2nm, micro-capteurs spatiaux infrarouges. *Chocs interdits, maintien vertical impératif.*
* ❄️ **SBT Cryogénie (Zone Bleue) :** Cuves Dewar d'azote liquide (-196°C), cryostats à dilution hélium. *Risque de fuite si renversé.*
* ⚛️ **IRIG Labo Quantique (Zone Violette) :** Processeurs qubits à spin de silicium, blindages magnétiques.
* 🛑 **Sas Décontamination / Rejet (Zone Rouge) :** Filtres ioniques usagés, colis défectueux.

### 🕹️ Commandes :
* **Clic gauche maintenu + glisser :** Saisir un colis 3D sur le tapis roulant et le déplacer dans l'espace vers son casier de destination.
* **Touches `A` et `E` :** Faire pivoter le colis à 360° pour inspecter les étiquettes de sécurité et le code-barres.
* **Tablette d'inspection :** Scanne automatiquement les spécifications (température, masse, protocole, fragilité) au clic.

---

## 📂 Architecture du Projet

```text
Jeux 25 ANS/
├── src/
│   ├── audio/
│   │   └── SoundEffects.ts      # Bruitages synthétiques Web Audio (scanner, pose, validation, erreur)
│   ├── core/
│   │   └── ParcelData.ts        # Modèles de colis CEA Grenoble et contraintes physiques
│   ├── render/
│   │   ├── Scene3D.ts           # Moteur Three.js (quai, éclairage studio, ombres douces, Drag & Drop 3D)
│   │   └── TextureGenerator.ts  # Générateur procédural d'étiquettes réalistes CEA (code-barres, logos)
│   ├── ui/
│   │   └── UIManager.ts         # HUD tablette d'inspection, score de conformité et alertes
│   ├── types/
│   │   └── game.ts              # Définitions TypeScript
│   ├── style.css                # Interface moderne sombre & tactile
│   └── main.ts                  # Point d'entrée et boucle Three.js
├── index.html
├── package.json
└── tsconfig.json
```

---

## 🚀 Démarrer le jeu

```bash
npm run dev
```
Ouvrez le lien local (ex: `http://localhost:5173`) dans votre navigateur.
