export type ViewMode = 'kiosk' | 'erp' | 'print' | 'podium' | 'admin';

export interface AppConfig {
  eventTitle: string;
  eventSubtitle: string;
  badgeLabel: string;
  shiftDurationSeconds: number;
}

export interface InventoryItem {
  id: string;
  sku: string; // e.g. "ART-KF40-INOX"
  name: string;
  category: 'Vide & Cryo' | 'Microélectronique' | 'Consommables' | 'Mécanique';
  location: string; // e.g. "LOC-B01-T03"
  quantity: number;
  unit: string;
  critical: boolean;
  batch: string;
  description: string;
}

export interface MissionStep {
  id: string;
  instruction: string;
  expectedBarcode: string;
  barcodeType: 'location' | 'article' | 'package' | 'seal' | 'dock';
  targetLabel: string;
  quantity?: number;
  scannedCount?: number;
  completed: boolean;
  hint: string;
}

export interface Mission {
  id: string;
  title: string;
  code: string;
  client: string; // e.g. "CEA LETI - Bâtiment 17 (Nano-Caractérisation)"
  priority: 'URGENCE CRITIQUE' | 'STANDARD' | 'EXPÉDITION INTERNATIONALE';
  description: string;
  timeLimitSeconds: number;
  basePoints: number;
  steps: MissionStep[];
}

export interface ScanLog {
  id: string;
  timestamp: string;
  barcode: string;
  status: 'valid' | 'invalid' | 'warning';
  message: string;
}

export interface OperatorProfile {
  name: string;
  companyOrRole: string;
  score: number;
  completedMissions: number;
  accuracy: number;
  shiftDurationSeconds: number;
}
