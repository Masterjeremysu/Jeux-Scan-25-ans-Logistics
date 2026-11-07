# 📦 LogiFlux 2026 - Simulateur de Logistique & Réseau de Fret Multimodal

> Un jeu de gestion et de stratégie logistique moderne en temps réel, conçu avec une architecture modulaire TypeScript, un moteur de simulation par graphes et un rendu canvas 60 FPS.

---

## 🧭 Concept du Jeu

Dans **LogiFlux 2026**, vous prenez la tête d'un opérateur de fret national :
* **Développement du Réseau :** Reliez les ports maritimes, aéroports et plateformes logistiques (Le Havre, Paris, Lyon, Marseille, etc.).
* **Flotte Multimodale :** Affectez des semi-remorques électriques, des trains de fret, des barges et des drones express selon l'urgence et l'empreinte carbone.
* **Gestion des Crises :** Affrontez des pannes d'automatisation, des intempéries hivernales et des hausses tarifaires de l'énergie.
* **Économie & Réputation :** Honorez les délais de livraison pour maximiser votre satisfaction client et éviter les pénalités de retard.

---

## 📂 Arborescence du Projet

```text
Jeux 25 ANS/
├── docs/
│   └── ROADMAP.md          # Feuille de route et évolutions futures (Agents IA, multijoueur)
├── src/
│   ├── core/
│   │   ├── Simulation.ts   # Boucle de simulation des flux, mouvements et dispatching
│   │   ├── Economy.ts      # Gestion de la trésorerie, réputation et bilan carbone
│   │   └── CrisisManager.ts# Événements imprévus et aléas logistiques
│   ├── data/
│   │   └── scenarioFrance.ts # Coordonnées des hubs et catalogue des véhicules
│   ├── render/
│   │   └── CanvasRenderer.ts # Moteur de rendu Canvas 2D stylisé (glow, pulse, particules)
│   ├── ui/
│   │   └── UIManager.ts    # Contrôle de l'interface, commandes, modales et alertes
│   ├── types/
│   │   └── game.ts         # Définitions TypeScript complètes
│   ├── style.css           # Thème sombre glassmorphic & responsive
│   └── main.ts             # Point d'entrée de l'application
├── index.html              # Structure de l'interface
├── package.json
└── tsconfig.json
```

---

## 🚀 Démarrage Rapide

### 1. Lancer le serveur local de développement :
```bash
npm run dev
```
Ouvrez le lien affiché (par défaut `http://localhost:5173`) dans votre navigateur.

### 2. Compiler pour la production :
```bash
npm run build
```

---

## 🐙 Comment publier sur GitHub

1. **Créer un nouveau dépôt sur GitHub :**
   * Rendez-vous sur [github.com/new](https://github.com/new).
   * Nommez le dépôt (ex: `logiflux-2026`).
   * Laissez le dépôt vide (sans cocher README ou .gitignore, car ils sont déjà créés ici).

2. **Lier le dépôt local et pousser le code :**
   Dans votre terminal, exécutez les commandes suivantes :
   ```bash
   git branch -M main
   git remote add origin https://github.com/<VOTRE_NOM_UTILISATEUR>/logiflux-2026.git
   git push -u origin main
   ```
