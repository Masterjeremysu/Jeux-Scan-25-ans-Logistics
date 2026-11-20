// Toutes les données métier (emplacements, stock, codes-barres) sont désormais
// gérées 100 % dans Supabase (tables wms_locations, wms_inventory, wms_missions, app_config).
// Aucune donnée en dur n'est conservée côté code.

export interface BarcodeItemCatalog {
  code: string;
  label: string;
  type: 'article' | 'location' | 'package' | 'seal' | 'dock' | 'golden_ticket';
  quantity?: number;
  location?: string;
  lrCode?: string;
  crLabel?: string;
}
