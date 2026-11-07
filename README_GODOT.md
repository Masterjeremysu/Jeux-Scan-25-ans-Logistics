# 🎮 CEA GRENOBLE • Logistique 3D - Version Native GODOT 4

> Le simulateur d'entrepôt du CEA Grenoble est désormais entièrement configuré pour **Godot Engine 4** !
> Vrai moteur 3D natif, physique Jolt intégrée, éclairage SSAO/Glow, glissières de tiroirs animées et terminal Zebra WMS.

---

## 🚀 Comment lancer et tester le jeu en 1 minute :

### 1. Télécharger Godot 4 (Ultra-léger, sans installation) :
* Rendez-vous sur **[godotengine.org/download](https://godotengine.org/download)**.
* Téléchargez **Godot Engine 4.x (Standard)** (le fichier pèse seulement **60 Mo**).
* Dézippez le fichier où vous voulez (aucun installeur, aucun prérequis, aucun SDK .NET lourd).

### 2. Ouvrir le projet :
1. Lancez `Godot_v4.x.exe`.
2. Cliquez sur **« Importer »** en haut à droite.
3. Sélectionnez le dossier du projet : `C:\Users\jerem\Documents\Jeux 25 ANS`.
4. Cliquez sur **« Importer et Éditer »**.

### 3. Jouer :
* Appuyez simplement sur **`F5`** (ou l'icône Play ▶️ en haut à droite) !

---

## 🕹️ Commandes & Gameplay dans Godot 4 :

* **`Z / Q / S / D`** (ou `W / A / S / D` et Flèches) : Marcher dans les allées de l'entrepôt.
* **Souris** : Tourner la tête à 360° (curseur capturé automatiquement).
* **`ESPACE` ou Clic Gauche :** Tirer le faisceau laser rouge du Zebra.
* **Viser l'étiquette EAN-128 du meuble `LOC-B01-T03` et appuyer sur `ESPACE` :**
  1. Le tiroir s'ouvre avec une animation fluide en glissant vers l'avant.
  2. La caméra effectue une transition douce en **vue du dessus (plongeante à 65°)** pour inspecter les bacs.
  3. Cliquez sur les **Brides KF40 Inox** au centre pour les prélever !
  4. Une fois prélevées, le tiroir se referme et vous reprenez votre marche.
* **Touche `Échap` :** Libérer la souris ou quitter l'inspection.

---

## 📂 Architecture des Fichiers Godot 4 :

```text
Jeux 25 ANS/
├── project.godot                # Configuration du projet Godot 4 (Render Forward+, InputMap)
├── icon.svg                     # Icône officielle CEA Grenoble Logistique
├── scenes/
│   ├── MainWarehouse.tscn       # Scène principale (Entrepôt, sol résine, lumières, SSAO, Glow)
│   ├── Player.tscn              # Contrôleur première personne (Collision, caméra, laser Zebra)
│   └── DrawerCabinet.tscn       # Armoire d'atelier avec tiroir coulissant et pièces KF40
├── scripts/
│   ├── PlayerController.gd      # Déplacement FPS, gestion caméra et scan laser
│   ├── DrawerCabinet.gd         # Glissière animée du tiroir et ramassage des pièces
│   ├── ZebraPDA.gd              # Interface et étapes du terminal WMS Zebra
│   └── WarehouseManager.gd      # Gestionnaire des ordres WMS et des livraisons
└── README_GODOT.md
```
