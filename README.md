# CEA GRENOBLE • WMS & ERP LOGISTIQUE 25 ANS
### Animation Interactive "Vis ma vie de logisticien" avec scanner / douchette

Application Web moderne et réactive conçue pour animer l'événement des 25 ans du CEA Grenoble.
Les clients et invités tiennent une vraie douchette (USB ou Bluetooth) ou un terminal Zebra, et réalisent des missions logistiques réelles en scannant des cartons, tiroirs et pièces physiques disposés sur la table d'exposition.

---

## 🚀 Démarrage Rapide

Double-cliquez simplement sur :
```
LANCER_WMS_25ANS.bat
```
L'application démarre et s'ouvre automatiquement dans votre navigateur sur `http://localhost:3000`.

---

## 🏗️ Architecture Modulaire (Non-monolithique)

Le code est structuré selon les standards modernes du génie logiciel :

```
c:\Users\jerem\Documents\Jeux 25 ANS\
├── src/
│   ├── types/
│   │   └── index.ts                 # Modèles de données typés (InventoryItem, Mission, ScanLog)
│   ├── services/
│   │   ├── barcodeListener.ts       # Écoute globale et filtrage matériel des douchettes USB / Zebra
│   │   └── soundService.ts          # Synthétiseur audio Web Audio API (bips Zebra, carillons, buzzers)
│   ├── data/
│   │   ├── initialData.ts           # Catalogue matériel CEA (Brides KF40, Wafers 300mm, Edwards)
│   │   └── missions.ts              # Scénarios de missions gamifiées
│   ├── components/
│   │   ├── Header.tsx               # Barre d'état, chrono de shift, score, toggles son/plein écran
│   │   ├── PosteOperateurView.tsx   # Écran principal du poste opérateur (réceptacle de douchette)
│   │   ├── StockERPView.tsx         # Tableau de bord ERP en temps réel (quantités, casiers, lots)
│   │   ├── PlancheEtiquettesView.tsx# Planche A4 prête à imprimer avec vrais codes-barres Code-128
│   │   ├── PodiumView.tsx           # Classement des invités et enregistrement des participants
│   │   └── DiplomeModal.tsx         # Remise de diplôme souvenir avec confettis et impression
│   ├── App.tsx                      # Routeur applicatif et gestion d'état réactive
│   ├── main.tsx                     # Point d'entrée React 19
│   └── index.css                    # Thème Tailwind CSS industriel et animations
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── LANCER_WMS_25ANS.bat
```

---

## 🎯 Les 3 Missions Réelles du Challenge

1. **Préparation d'Urgence LETI Bâtiment 17** : Picking de pièces ultra-vide (Brides KF40 inox, joint viton, mise en carton sécurisé, quai LETI).
2. **Conditionnement Critique Wafers Salle Blanche Minatec** : Manipulation sous protocole hermétique (Cassette FOSB, double ensachage antistatique ESD, scellé IATA, quai export international).
3. **Réception Fournisseur & Entrée en Stock** : Contrôle du bon de livraison, scan de conformité et ré-incrémentation du stock ERP en direct.

---

## 🏷️ Planche d'Étiquettes à Imprimer

Rendez-vous sur l'onglet **"Étiquettes à Imprimer"** dans l'application, ou pressez `Ctrl+P` pour imprimer la planche A4 de codes-barres Code-128 à coller sur vos vrais cartons et tiroirs.
