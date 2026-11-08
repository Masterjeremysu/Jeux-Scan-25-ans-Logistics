export type ViewMode = 'kiosk' | 'erp' | 'print' | 'podium' | 'arena' | 'admin';

export interface DuoStation {
  station_id: string;
  station_name: string;
  operator_cea: string;
  client_guest: string;
  team_name: string;
  current_mission_title: string;
  progress_percent: number;
  current_step_index: number;
  total_steps: number;
  score: number;
  combo: number;
  status: 'idle' | 'in_progress' | 'completed';
  last_scan_code?: string;
  last_scan_status?: string;
  updated_at?: string;
}

export interface AppConfig {
  eventTitle: string;
  eventSubtitle: string;
  badgeLabel: string;
  shiftDurationSeconds: number;
  comboBonusPoints: number;
  publicUrl: string;
  diplomaTitle: string;
  diplomaDescription: string;
  diplomaSignatory: string;
  availableStations: { id: string; name: string }[];
}

export interface InventoryItem {
  id: string;
  sku: string; // e.g. "ART-KF40-INOX"
  name: string;
  category: string;
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
