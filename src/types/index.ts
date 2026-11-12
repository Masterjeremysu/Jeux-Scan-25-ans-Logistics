export type ViewMode = 'home' | 'kiosk' | 'erp' | 'print' | 'podium' | 'arena' | 'admin' | 'play';

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

export interface WarehouseLocation {
  id: string;
  barcode: string; // e.g. "LOC-B01-T03" ou "ZONE_POMPE_GRILLE_41"
  label: string; // e.g. "Armoire B01 (Allée B - Tiroir T03)"
  lrCode?: string; // e.g. "LOC_B01_T03"
  crLabel?: string; // e.g. "ARMOIRE ALLEE B TIROIR T03"
  zone?: string; // e.g. "Magasin Central", "Quai Expédition", "Poste 1", "Poste 2"
  description?: string;
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
  customLogoUrl?: string;
  autoHazardsEnabled?: boolean;
  hazardIntervalSeconds?: number;
  clientsCatalog?: string[];
  locations?: WarehouseLocation[]; // Emplacements personnalisés configurables par l'utilisateur
}

export interface Distraction {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  expected_barcode: string;
  barcode_label: string;
  time_limit_seconds: number;
  points_bonus: number;
  is_active: boolean;
  created_at?: string;
}

export interface LiveHazard {
  id: string;
  target_station_id: string; // 'all' or station_id e.g. 'poste-1'
  title: string;
  message: string;
  expected_barcode: string;
  time_limit_seconds: number;
  points_bonus: number;
  status: 'active' | 'resolved' | 'expired';
  created_at?: string;
}

export interface InventoryItem {
  id: string;
  sku: string; // e.g. "REF191000007490" ou "ART-KF40-INOX"
  name: string; // Désignation (e.g. "JOINT TORIQUE KALREZ (TUBE)")
  category: string;
  location: string; // e.g. "ZONE_POMPE_GRILLE_41" ou "LOC-B01-T03"
  quantity: number;
  unit: string;
  critical: boolean;
  batch: string;
  description: string;
  lrCode?: string; // Réf article (e.g. "JNT_A001")
  crLabel?: string; // Désignation complète (e.g. "JOINT TORIQUE KALREZ (TUBE)")
  gestionnaire?: string; // Gestionnaire de stock (e.g. "GT Logistics", "CEA LETI")
  machinePdt?: string; // Machine / Poste de travail (e.g. "Bâti Dépôt PVD", "Épitaxie MBE")
  refEquipementier?: string; // Réf équipementier / Fournisseur (e.g. "KLZ-4079-USA", "EDW-9941")
}

export interface MissionStep {
  id: string;
  instruction: string;
  expectedBarcode: string;
  barcodeType: 'location' | 'article' | 'package' | 'seal' | 'dock';
  targetLabel: string;
  lrCode?: string; // L/R : Référence courte pour l'étiquette physique
  crLabel?: string; // C/R : Désignation industrielle en majuscules
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
