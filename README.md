# 📦 CEA GRENOBLE • Logistique 3D & WMS ZEBRA
### Établi de Préparation de Commandes, Scotchage 3D & Mode Phygital / Réel

Un simulateur de logistique industrielle et scientifique haute précision, inspiré des opérations réelles du **CEA Grenoble** (Minatec, LETI, IRIG, Bâtiments de recherche).

---

## 🎮 Nouveautés Majeures

### 1. 🔀 Le Switch : Mode Virtuel (3D) vs Mode Réel (Phygital)
* **🖥️ Mode Virtuel (100% 3D) :** L'intégralité du workflow se déroule dans le jumeau numérique : carton 3D, calage, fermeture des rabats, scotchage sonore et pose de l'étiquette virtuelle.
* **🖨️ Mode Réel (Phygital - Entraînement sur Carton Réel) :**
  * Dès que le carton est scotché, le jeu génère une **véritable étiquette de transport thermique CEA Grenoble** (format 100x150 mm) avec un vrai code-barres Code 128.
  * Cliquez sur **« Imprimer Réel »** pour lancer l'impression sur votre imprimante thermique ou bureau.
  * Collez-la sur votre vrai carton sur votre bureau et **scannez-la avec votre douchette USB / PDA** pour valider l'expédition dans le jeu !

---

### 2. 📱 Le Terminal ZEBRA TC5x Virtuel
* Interface WMS d'atelier affichant l'ordre de mission en direct :
  * Numéro de commande CEA (ex: `CMD-CEA-2026-401`).
  * Bâtiment destinataire (`LETI Bât. 17`, `IRIG Bât. 51A`, `Minatec Bât. 22`).
  * Checklist dynamique des références à prélever : les cases se cochent en vert au dépôt dans le carton.
  * Bouton tactile **« 📦 SCOTCHER CARTON »** avec bruitage réaliste de dévidoir d'adhésif.
  * Bouton tactile **« 🏷️ EXPÉDIER COLIS »**.

---

### 3. ⚙️ Les Références Logistiques du CEA Grenoble
* **Pompes à vide turbomoléculaires** pour bâtis de dépôt sous vide (`CEA-VAC-P900`).
* **Brides et raccords inox KF40 / KF25** (`CEA-KF40-INX`).
* **Jauges à vide Pirani actives** (`CEA-JAU-PIR5`).
* **Pompes à palettes primaires** de 28 kg (`CEA-POM-ALC20`).
* **Boîtiers hermétiques de transfert de wafers silicium 300mm** (`CEA-WAF-300C`).

---

## 🚀 Lancer le jeu

```powershell
npm run dev
```
Ouvrez ensuite le lien local (ex: `http://localhost:5173`) dans votre navigateur.
