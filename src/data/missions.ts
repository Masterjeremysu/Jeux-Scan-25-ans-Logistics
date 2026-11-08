import { Mission } from '../types';

export const MISSIONS: Mission[] = [
  {
    id: 'mission-preparation-commande',
    title: 'Préparation de Commande Multi-Articles (Bât. 17)',
    code: 'ORD-LETI-2026-601',
    client: 'CEA LETI • Dr. Martin (Laboratoire Bât. 17 - Cde #601)',
    priority: 'URGENCE CRITIQUE',
    description: 'Demande urgente reçue pour le Dr. Martin : préparer 2 brides KF40 inox et 1 joint Kalrez, contrôler les quantités et livrer sur l\'étagère de livraison client.',
    timeLimitSeconds: 140,
    basePoints: 1200,
    steps: [
      {
        id: 'step-1-1',
        instruction: 'Rendez-vous devant l\'armoire B01 et scannez l\'étiquette d\'emplacement de stockage.',
        expectedBarcode: 'LOC-B01-T03',
        barcodeType: 'location',
        targetLabel: 'LOC-B01-T03 (Allée B - Tiroir T03)',
        lrCode: 'LOC_B01_T03',
        crLabel: 'ARMOIRE ALLEE B TIROIR T03',
        quantity: 1,
        completed: false,
        hint: 'Visez l\'étiquette d\'emplacement sur le tiroir T03.'
      },
      {
        id: 'step-1-2',
        instruction: 'Prélevez et scannez les 2 Brides KF40 Inox (quantité demandée : 2 pcs).',
        expectedBarcode: 'ART-KF40-INOX',
        barcodeType: 'article',
        targetLabel: 'Bride à Vide KF40 Inox 316L',
        lrCode: 'BRD_KF40',
        crLabel: 'BRIDE A VIDE KF40 INOX 316L',
        quantity: 2,
        scannedCount: 0,
        completed: false,
        hint: 'Scannez chaque pièce prélevée pour valider la quantité attendue.'
      },
      {
        id: 'step-1-3',
        instruction: 'Prélevez et scannez le Joint Torique Kalrez (quantité demandée : 1 pc).',
        expectedBarcode: 'REF191000007490',
        barcodeType: 'article',
        targetLabel: 'Joint Torique Kalrez (Tube)',
        lrCode: 'JNT_A001',
        crLabel: 'JOINT TORIQUE KALREZ (TUBE)',
        quantity: 1,
        scannedCount: 0,
        completed: false,
        hint: 'Scannez l\'étiquette code-barres REF191000007490.'
      },
      {
        id: 'step-1-4',
        instruction: 'Acheminez la commande vers l\'Étagère de Livraison Client et validez le scan final.',
        expectedBarcode: 'LOC-ETAGERE-LIVRAISON',
        barcodeType: 'location',
        targetLabel: 'Étagère de Livraison & Dépôt Client',
        lrCode: 'ETA_LIVR',
        crLabel: 'ETAGERE LIVRAISON CLIENT',
        quantity: 1,
        completed: false,
        hint: 'Scannez l\'étiquette de l\'Étagère de Livraison pour clôturer la commande.'
      }
    ]
  },
  {
    id: 'mission-collecte-reintegration',
    title: 'Collecte Client & Réintégration en Stock',
    code: 'COL-RET-2026-12',
    client: 'CEA INAC • Dr. Rousseau (Retour Pièce en Stock)',
    priority: 'STANDARD',
    description: 'Le client fait revenir une pièce en stock et l\'a déposée sur l\'Étagère de Collecte. Récupérez la pièce, imprimez son étiquette de stock et rangez-la à son emplacement d\'origine pour réincrémenter le stock ERP.',
    timeLimitSeconds: 130,
    basePoints: 1100,
    steps: [
      {
        id: 'step-2-1',
        instruction: 'Rendez-vous à l\'Étagère de Collecte et scannez l\'emplacement où le client a déposé la pièce.',
        expectedBarcode: 'LOC-ETAGERE-COLLECTE',
        barcodeType: 'location',
        targetLabel: 'Étagère de Collecte & Retours Clients',
        lrCode: 'ETA_COLLECT',
        crLabel: 'ETAGERE DE COLLECTE CLIENTS',
        quantity: 1,
        completed: false,
        hint: 'Scannez l\'étiquette de l\'Étagère de Collecte.'
      },
      {
        id: 'step-2-2',
        instruction: 'Imprimez et scannez l\'étiquette de stock de la pièce attendue (REF191000007490 - JOINT TORIQUE KALREZ).',
        expectedBarcode: 'REF191000007490',
        barcodeType: 'article',
        targetLabel: 'Joint Torique Kalrez (Réf: JNT_A001)',
        lrCode: 'JNT_A001',
        crLabel: 'JOINT TORIQUE KALREZ (TUBE)',
        quantity: 1,
        completed: false,
        hint: 'Scannez l\'étiquette éditée pour identifier la pièce retournée.'
      },
      {
        id: 'step-2-3',
        instruction: 'Déposez la pièce sur son emplacement d\'origine en stock et scannez l\'étiquette Zone Pompe Grille 41.',
        expectedBarcode: 'ZONE_POMPE_GRILLE_41',
        barcodeType: 'location',
        targetLabel: 'Emplacement Stock : Zone Pompe Grille 41',
        lrCode: 'ZONE_PMP_41',
        crLabel: 'ZONE POMPE GRILLE 41',
        quantity: 1,
        completed: false,
        hint: 'Scannez l\'emplacement d\'origine pour réincrémenter le stock ERP (+1).'
      }
    ]
  },
  {
    id: 'mission-manutention-etranger',
    title: 'Manutention & Expédition vers l\'Étranger',
    code: 'MANUT-EXP-INTL-99',
    client: 'CEA MINATEC • Prof. Laurent (Fret International Japon)',
    priority: 'EXPÉDITION INTERNATIONALE',
    description: 'Demande de manutention : récupérer le colis avec document de transport sur l\'étagère de prise, contrôler le colis et le déposer à La Réception Centrale pour départ immédiat à l\'étranger.',
    timeLimitSeconds: 140,
    basePoints: 1300,
    steps: [
      {
        id: 'step-3-1',
        instruction: 'Rendez-vous sur l\'étagère de prise où le client a déposé le colis et scannez l\'emplacement.',
        expectedBarcode: 'LOC-ETA1-NIV1',
        barcodeType: 'location',
        targetLabel: 'Étagère 1 • Niveau 1 (Prise Colis)',
        lrCode: 'ETA_1_N1',
        crLabel: 'ETAGERE 1 NIVEAU BAS',
        quantity: 1,
        completed: false,
        hint: 'Scannez l\'étiquette de l\'étagère de prise client.'
      },
      {
        id: 'step-3-2',
        instruction: 'Contrôlez le document de transport rempli par le client et scannez le bordereau.',
        expectedBarcode: 'DOC-TRANSPORT-INTL',
        barcodeType: 'package',
        targetLabel: 'Document de Transport International',
        lrCode: 'DOC_TRP',
        crLabel: 'DOCUMENT TRANSPORT EXPEDITION',
        quantity: 1,
        completed: false,
        hint: 'Visez le document de transport fixé sur le colis.'
      },
      {
        id: 'step-3-3',
        instruction: 'Vérifiez la conformité du colis et scannez le code-barres du carton sécurisé.',
        expectedBarcode: 'ART-CARTON-EXP',
        barcodeType: 'package',
        targetLabel: 'Colis Carton Double Cannelure CEA',
        lrCode: 'CTN_DBL1',
        crLabel: 'CARTON DOUBLE CANNELURE CEA',
        quantity: 1,
        completed: false,
        hint: 'Scannez le carton d\'expédition homologué.'
      },
      {
        id: 'step-3-4',
        instruction: 'Déposez le colis à l\'emplacement officiel « La Réception Centrale » et validez le départ.',
        expectedBarcode: 'ZONE_RECEPTION_CENTRALE',
        barcodeType: 'dock',
        targetLabel: 'La Réception Centrale (Départs Étranger)',
        lrCode: 'REC_CENT',
        crLabel: 'LA RECEPTION CENTRALE DEPARTS',
        quantity: 1,
        completed: false,
        hint: 'Scannez le panneau « La Réception Centrale » pour avertir le client que son colis est expédié.'
      }
    ]
  }
];
