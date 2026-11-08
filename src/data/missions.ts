import { Mission } from '../types';

export const MISSIONS: Mission[] = [
  {
    id: 'mission-urgente-leti',
    title: 'Préparation Urgente Bâtiment 17 - LETI',
    code: 'ORD-LETI-2026-601',
    client: 'CEA LETI • Laboratoire Nano-Caractérisation (Bât. 17)',
    priority: 'URGENCE CRITIQUE',
    description: 'Bâti de dépôt sous vide à l\'arrêt. Le chef d\'équipe réclame 2 brides KF40 inox et 1 joint Viton de toute urgence.',
    timeLimitSeconds: 120,
    basePoints: 1000,
    steps: [
      {
        id: 'step-1-1',
        instruction: 'Rendez-vous devant l\'armoire d\'outillage B01 et scannez l\'étiquette de l\'emplacement.',
        expectedBarcode: 'LOC-B01-T03',
        barcodeType: 'location',
        targetLabel: 'LOC-B01-T03 (Allée B - Tiroir T03)',
        lrCode: 'LOC_B01_T03',
        crLabel: 'ARMOIRE ALLEE B TIROIR T03',
        completed: false,
        hint: 'Visez l\'étiquette jaune sur le tiroir T03.'
      },
      {
        id: 'step-1-2',
        instruction: 'Prélevez et scannez la 1ère Bride KF40 Inox.',
        expectedBarcode: 'ART-KF40-INOX',
        barcodeType: 'article',
        targetLabel: 'Bride KF40 Inox [1/2]',
        lrCode: 'BRD_KF40',
        crLabel: 'BRIDE A VIDE KF40 INOX 316L',
        completed: false,
        hint: 'Scannez le code-barres fixé sur la première bride en inox.'
      },
      {
        id: 'step-1-3',
        instruction: 'Prélevez et scannez la 2ème Bride KF40 Inox.',
        expectedBarcode: 'ART-KF40-INOX',
        barcodeType: 'article',
        targetLabel: 'Bride KF40 Inox [2/2]',
        lrCode: 'BRD_KF40',
        crLabel: 'BRIDE A VIDE KF40 INOX 316L',
        completed: false,
        hint: 'Scannez à nouveau pour valider la deuxième quantité.'
      },
      {
        id: 'step-1-4',
        instruction: 'Déposez les pièces dans le carton d\'expédition et scannez le code colis.',
        expectedBarcode: 'ART-CARTON-EXP',
        barcodeType: 'package',
        targetLabel: 'Carton Double Cannelure CEA',
        lrCode: 'CTN_DBL1',
        crLabel: 'CARTON DOUBLE CANNELURE CEA',
        completed: false,
        hint: 'Visez l\'étiquette du carton d\'expédition sur la table.'
      },
      {
        id: 'step-1-5',
        instruction: 'Acheminez le colis au Quai d\'Expédition Bâtiment 17 et validez le scan.',
        expectedBarcode: 'DOCK-LETI-17',
        barcodeType: 'dock',
        targetLabel: 'Quai Expédition Bât. 17 - LETI',
        lrCode: 'QAI_BAT17',
        crLabel: 'QUAI EXPEDITION BATIMENT 17',
        completed: false,
        hint: 'Scannez le panneau du Quai Bât. 17 pour clore la mission.'
      }
    ]
  },
  {
    id: 'mission-wafers-minatec',
    title: 'Conditionnement Critique Wafers 300mm Salle Blanche',
    code: 'EXP-MINATEC-INTL-88',
    client: 'Minatec / Plateforme Silicium Pur (Export International)',
    priority: 'EXPÉDITION INTERNATIONALE',
    description: 'Expédition ultra-fragile de plaquettes silicium 300mm vers un centre de recherche partenaire. Protocole antistatique et scellé obligatoire.',
    timeLimitSeconds: 150,
    basePoints: 1400,
    steps: [
      {
        id: 'step-2-1',
        instruction: 'Scannez l\'emplacement de l\'armoire hermétique de Salle Blanche.',
        expectedBarcode: 'LOC-SB-C01',
        barcodeType: 'location',
        targetLabel: 'LOC-SB-C01 (Armoire Salle Blanche)',
        lrCode: 'LOC_SB_C01',
        crLabel: 'SALLE BLANCHE ARMOIRE C01',
        completed: false,
        hint: 'Visez l\'armoire propre ISO 5 étiquetée LOC-SB-C01.'
      },
      {
        id: 'step-2-2',
        instruction: 'Scannez la boîte de transport hermétique FOSB contenant les Wafers 300mm.',
        expectedBarcode: 'ART-WAFER-300MM',
        barcodeType: 'article',
        targetLabel: 'Lot Wafers Silicium 300mm',
        lrCode: 'WFR_S300',
        crLabel: 'LOT WAFERS SILICIUM PUR 300MM',
        completed: false,
        hint: 'Visez le code-barres de la cassette transparente de wafers.'
      },
      {
        id: 'step-2-3',
        instruction: 'Effectuez le double ensachage et scannez le Sachet Antistatique ESD.',
        expectedBarcode: 'ART-SACHET-ESD',
        barcodeType: 'article',
        targetLabel: 'Sachet Double Ensachage ESD',
        lrCode: 'SAC_ESD2',
        crLabel: 'SACHET DOUBLE ENSACHAGE ESD',
        completed: false,
        hint: 'Scannez le sachet de protection électrostatique.'
      },
      {
        id: 'step-2-4',
        instruction: 'Scellez le conteneur et scannez le Scellé Numéroté Inviolable IATA.',
        expectedBarcode: 'ART-SCEL-SECURITE',
        barcodeType: 'seal',
        targetLabel: 'Scellé Inviolable IATA',
        lrCode: 'SCL_IATA',
        crLabel: 'SCELLE INVIOLABLE IATA SECURISE',
        completed: false,
        hint: 'Visez l\'étiquette rouge du scellé de sécurité.'
      },
      {
        id: 'step-2-5',
        instruction: 'Validez le transfert vers le Quai Fret Aérien International.',
        expectedBarcode: 'DOCK-INTL-FRET',
        barcodeType: 'dock',
        targetLabel: 'Quai Fret International',
        lrCode: 'QAI_INTL',
        crLabel: 'QUAI FRET INTERNATIONAL',
        completed: false,
        hint: 'Scannez l\'étiquette de destination Quai International.'
      }
    ]
  },
  {
    id: 'mission-reception-fournisseur',
    title: 'Réception Fournisseur & Ré-incrémentation du Stock',
    code: 'REC-EDWARDS-2026-44',
    client: 'Magasin Central CEA • Entrée de Matériel Cryogénique',
    priority: 'STANDARD',
    description: 'Le transporteur vient de livrer un réassort de matériel pour l\'ultra-vide. Réceptionnez, contrôlez et réincrémentez le stock.',
    timeLimitSeconds: 110,
    basePoints: 900,
    steps: [
      {
        id: 'step-3-1',
        instruction: 'Scannez le Bon de Livraison papier du fournisseur transporteur.',
        expectedBarcode: 'BL-EDWARDS-9941',
        barcodeType: 'package',
        targetLabel: 'BL Fournisseur Edwards n°9941',
        lrCode: 'BL_EDW41',
        crLabel: 'BON DE LIVRAISON FOURNISSEUR',
        completed: false,
        hint: 'Visez le document du bon de livraison.'
      },
      {
        id: 'step-3-2',
        instruction: 'Contrôlez et scannez le premier article livré (Brides KF40 Inox).',
        expectedBarcode: 'ART-KF40-INOX',
        barcodeType: 'article',
        targetLabel: 'Bride à Vide KF40 Inox',
        lrCode: 'BRD_KF40',
        crLabel: 'BRIDE A VIDE KF40 INOX 316L',
        completed: false,
        hint: 'Scannez le code sur la pièce livrée pour vérifier la conformité.'
      },
      {
        id: 'step-3-3',
        instruction: 'Ranger la pièce dans le casier B01-T03 pour valider l\'entrée en stock (+5 pcs).',
        expectedBarcode: 'LOC-B01-T03',
        barcodeType: 'location',
        targetLabel: 'Emplacement de rangement LOC-B01-T03',
        lrCode: 'LOC_B01_T03',
        crLabel: 'ARMOIRE ALLEE B TIROIR T03',
        completed: false,
        hint: 'Scannez le tiroir de destination pour mettre à jour l\'ERP.'
      }
    ]
  }
];
