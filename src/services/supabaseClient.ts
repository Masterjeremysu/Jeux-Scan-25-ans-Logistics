import { createClient } from '@supabase/supabase-js';
import { Mission, InventoryItem, AppConfig, DuoStation, Distraction, LiveHazard, WarehouseLocation } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface RemoteScore {
  id?: string;
  name: string;
  company: string;
  score: number;
  time_spent: string;
  completed_missions: number;
  accuracy: number;
  created_at?: string;
}

export interface LiveActivityEvent {
  id?: string;
  station_name: string;
  operator_name: string;
  barcode: string;
  action_type: string;
  points_delta?: number;
  message: string;
  status: 'valid' | 'invalid' | 'warning';
  created_at?: string;
}

export type StoredAppConfig = Omit<AppConfig, 'locations'>;

const generateChannelId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// =========================================================================
// MAPPERS (Supabase snake_case <-> App camelCase)
// =========================================================================

function mapLocationRow(row: any): WarehouseLocation {
  return {
    id: row.id,
    barcode: row.barcode,
    label: row.label,
    lrCode: row.lr_code || '',
    crLabel: row.cr_label || '',
    zone: row.zone || 'Magasin Central',
    description: row.description || '',
    aliases: Array.isArray(row.aliases) ? row.aliases : [],
    sortOrder: typeof row.sort_order === 'number' ? row.sort_order : 0
  };
}

function mapLocationToRow(loc: WarehouseLocation, index: number) {
  return {
    id: loc.id,
    barcode: loc.barcode.trim(),
    label: loc.label.trim() || loc.barcode.trim(),
    lr_code: loc.lrCode || '',
    cr_label: loc.crLabel || loc.label.toUpperCase(),
    zone: loc.zone || 'Magasin Central',
    description: loc.description || '',
    aliases: Array.isArray(loc.aliases) ? loc.aliases : [],
    sort_order: typeof loc.sortOrder === 'number' ? loc.sortOrder : index,
    updated_at: new Date().toISOString()
  };
}

function mapInventoryRow(row: any): InventoryItem {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category || 'Consommables',
    itemType: row.item_type || 'article',
    location: row.location_barcode || '',
    quantity: typeof row.quantity === 'number' ? row.quantity : 0,
    nominalQuantity: typeof row.nominal_quantity === 'number' ? row.nominal_quantity : (typeof row.quantity === 'number' ? row.quantity : 0),
    onTableQty: typeof row.on_table_qty === 'number' ? row.on_table_qty : 0,
    unit: row.unit || 'pcs',
    critical: Boolean(row.critical),
    batch: row.batch || '',
    description: row.description || '',
    lrCode: row.lr_code || '',
    crLabel: row.cr_label || (row.name || '').toUpperCase(),
    gestionnaire: row.gestionnaire || '',
    machinePdt: row.machine_pdt || '',
    refEquipementier: row.ref_equipementier || '',
    aliases: Array.isArray(row.aliases) ? row.aliases : []
  };
}

function mapInventoryToRow(item: InventoryItem) {
  return {
    id: item.id,
    sku: item.sku.trim(),
    name: item.name.trim() || item.sku.trim(),
    category: item.category || 'Consommables',
    item_type: item.itemType || 'article',
    location_barcode: item.location || '',
    quantity: Number.isFinite(item.quantity) ? Math.max(0, Math.round(item.quantity)) : 0,
    nominal_quantity: Number.isFinite(item.nominalQuantity)
      ? Math.max(0, Math.round(item.nominalQuantity!))
      : (Number.isFinite(item.quantity) ? Math.max(0, Math.round(item.quantity)) : 0),
    on_table_qty: Number.isFinite(item.onTableQty) ? Math.max(0, Math.round(item.onTableQty!)) : 0,
    unit: item.unit || 'pcs',
    critical: Boolean(item.critical),
    batch: item.batch || '',
    description: item.description || '',
    lr_code: item.lrCode || '',
    cr_label: item.crLabel || item.name.toUpperCase(),
    gestionnaire: item.gestionnaire || '',
    machine_pdt: item.machinePdt || '',
    ref_equipementier: item.refEquipementier || '',
    aliases: Array.isArray(item.aliases) ? item.aliases : [],
    updated_at: new Date().toISOString()
  };
}

function mapMissionRow(row: any): Mission {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    client: row.client || '',
    priority: row.priority || 'STANDARD',
    description: row.description || '',
    timeLimitSeconds: typeof row.time_limit_seconds === 'number' ? row.time_limit_seconds : 150,
    basePoints: typeof row.base_points === 'number' ? row.base_points : 1200,
    steps: Array.isArray(row.steps) ? row.steps : [],
    stockDirection: (row.stock_direction === 'in' || row.stock_direction === 'none' || row.stock_direction === 'out') ? row.stock_direction : 'out',
    isActive: row.is_active !== false,
    sortOrder: typeof row.sort_order === 'number' ? row.sort_order : 0
  };
}

function mapMissionToRow(mission: Mission, index: number) {
  return {
    id: mission.id,
    code: mission.code || `MIS-${index + 1}`,
    title: mission.title || 'Nouvelle Mission',
    client: mission.client || '',
    priority: mission.priority || 'STANDARD',
    description: mission.description || '',
    time_limit_seconds: Number.isFinite(mission.timeLimitSeconds) ? mission.timeLimitSeconds : 150,
    base_points: Number.isFinite(mission.basePoints) ? mission.basePoints : 1200,
    steps: Array.isArray(mission.steps)
      ? mission.steps.map((s) => ({ ...s, completed: false, scannedCount: 0 }))
      : [],
    stock_direction: mission.stockDirection || 'out',
    is_active: mission.isActive !== false,
    sort_order: index,
    updated_at: new Date().toISOString()
  };
}

function mapAppConfigRow(row: any): StoredAppConfig {
  return {
    eventTitle: row.event_title || 'GT LOGISTICS',
    eventSubtitle: row.event_subtitle || 'WMS Industrial Terminal',
    badgeLabel: row.badge_label || 'ÉDITION 25 ANS',
    shiftDurationSeconds: row.shift_duration_seconds || 180,
    comboBonusPoints: row.combo_bonus_points ?? 50,
    publicUrl: row.public_url || (typeof window !== 'undefined' ? window.location.origin : ''),
    diplomaTitle: row.diploma_title || 'DIPLÔME D\'HONNEUR',
    diplomaDescription: row.diploma_description || '',
    diplomaSignatory: row.diploma_signatory || '',
    availableStations: Array.isArray(row.available_stations) ? row.available_stations : [],
    customLogoUrl: row.custom_logo_url || '',
    goldenTicketBarcode: row.golden_ticket_barcode || 'ART-GT25-VIP',
    deliveryTableBarcode: row.delivery_table_barcode || 'LOC-ETAGERE-LIVRAISON',
    collectTableBarcode: row.collect_table_barcode || 'LOC-ETAGERE-COLLECTE',
    autoLoopEnabled: row.auto_loop_enabled ?? true,
    autoHazardsEnabled: row.auto_hazards_enabled ?? true,
    hazardIntervalSeconds: row.hazard_interval_seconds ?? 90,
    strictScanOnly: row.strict_scan_only ?? false,
    clientsCatalog: Array.isArray(row.clients_catalog) ? row.clients_catalog : []
  };
}

// =========================================================================
// 1. WMS LOCATIONS (Table: public.wms_locations)
// =========================================================================

export async function fetchLocations(): Promise<WarehouseLocation[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('wms_locations')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('barcode', { ascending: true });

    if (error) {
      console.warn('[Supabase] Erreur fetchLocations:', error.message);
      return [];
    }
    return (data || []).map(mapLocationRow);
  } catch (err) {
    console.warn('[Supabase] Exception fetchLocations:', err);
    return [];
  }
}

export async function syncLocations(locations: WarehouseLocation[]): Promise<boolean> {
  if (!supabase) return false;
  try {
    const rows = locations
      .filter((l) => l.barcode && l.barcode.trim() !== '')
      .map((l, idx) => mapLocationToRow(l, idx));

    const { data: existing, error: fetchErr } = await supabase
      .from('wms_locations')
      .select('id');

    if (fetchErr) {
      console.warn('[Supabase] Erreur syncLocations (select):', fetchErr.message);
      return false;
    }

    const keepIds = new Set(rows.map((r) => r.id));
    const toDelete = (existing || []).map((r: any) => r.id).filter((id: string) => !keepIds.has(id));

    if (toDelete.length > 0) {
      const { error: delErr } = await supabase.from('wms_locations').delete().in('id', toDelete);
      if (delErr) {
        console.warn('[Supabase] Erreur syncLocations (delete):', delErr.message);
        return false;
      }
    }

    if (rows.length > 0) {
      const { error: upsertErr } = await supabase
        .from('wms_locations')
        .upsert(rows, { onConflict: 'id' });

      if (upsertErr) {
        console.warn('[Supabase] Erreur syncLocations (upsert):', upsertErr.message);
        return false;
      }
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Exception syncLocations:', err);
    return false;
  }
}

export function subscribeToLocations(onChanged: (locations: WarehouseLocation[]) => void) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(generateChannelId('wms-locations'))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'wms_locations' },
      async () => {
        const fresh = await fetchLocations();
        onChanged(fresh);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// =========================================================================
// 2. WMS INVENTORY (Table: public.wms_inventory)
// =========================================================================

export async function fetchInventory(): Promise<InventoryItem[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('wms_inventory')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('[Supabase] Erreur fetchInventory:', error.message);
      return [];
    }
    return (data || []).map(mapInventoryRow);
  } catch (err) {
    console.warn('[Supabase] Exception fetchInventory:', err);
    return [];
  }
}

export async function syncInventory(items: InventoryItem[]): Promise<boolean> {
  if (!supabase) return false;
  try {
    const rows = items
      .filter((it) => it.sku && it.sku.trim() !== '')
      .map((it) => mapInventoryToRow(it));

    const { data: existing, error: fetchErr } = await supabase
      .from('wms_inventory')
      .select('id');

    if (fetchErr) {
      console.warn('[Supabase] Erreur syncInventory (select):', fetchErr.message);
      return false;
    }

    const keepIds = new Set(rows.map((r) => r.id));
    const toDelete = (existing || []).map((r: any) => r.id).filter((id: string) => !keepIds.has(id));

    if (toDelete.length > 0) {
      const { error: delErr } = await supabase.from('wms_inventory').delete().in('id', toDelete);
      if (delErr) {
        console.warn('[Supabase] Erreur syncInventory (delete):', delErr.message);
        return false;
      }
    }

    if (rows.length > 0) {
      const { error: upsertErr } = await supabase
        .from('wms_inventory')
        .upsert(rows, { onConflict: 'id' });

      if (upsertErr) {
        console.warn('[Supabase] Erreur syncInventory (upsert):', upsertErr.message);
        return false;
      }
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Exception syncInventory:', err);
    return false;
  }
}

export async function adjustInventoryQuantity(itemId: string, delta: number): Promise<InventoryItem | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('adjust_wms_inventory_quantity', {
      p_item_id: itemId,
      p_delta: delta
    });

    if (error) {
      console.warn('[Supabase] Erreur adjustInventoryQuantity:', error.message);
      return null;
    }
    return data ? mapInventoryRow(data) : null;
  } catch (err) {
    console.warn('[Supabase] Exception adjustInventoryQuantity:', err);
    return null;
  }
}

export async function moveStockLoop(itemId: string, direction: 'out' | 'in' | 'none'): Promise<InventoryItem | null> {
  if (!supabase || direction === 'none') return null;
  try {
    const { data, error } = await supabase.rpc('move_wms_stock_loop', {
      p_item_id: itemId,
      p_direction: direction
    });

    if (error) {
      console.warn('[Supabase] Erreur moveStockLoop:', error.message);
      return null;
    }
    return data ? mapInventoryRow(data) : null;
  } catch (err) {
    console.warn('[Supabase] Exception moveStockLoop:', err);
    return null;
  }
}

export async function setInventoryItemQuantity(itemId: string, quantity: number): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('wms_inventory')
      .update({
        quantity: Math.max(0, Math.round(quantity)),
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId);

    if (error) {
      console.warn('[Supabase] Erreur setInventoryItemQuantity:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Exception setInventoryItemQuantity:', err);
    return false;
  }
}

export async function resetInventoryToNominal(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.rpc('reset_wms_inventory_to_nominal');
    if (error) {
      console.warn('[Supabase] Erreur resetInventoryToNominal:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Exception resetInventoryToNominal:', err);
    return false;
  }
}

export function subscribeToInventory(onChanged: (items: InventoryItem[]) => void) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(generateChannelId('wms-inventory'))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'wms_inventory' },
      async () => {
        const fresh = await fetchInventory();
        onChanged(fresh);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// =========================================================================
// 3. WMS MISSIONS (Table: public.wms_missions)
// =========================================================================

export async function fetchMissions(): Promise<Mission[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('wms_missions')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      console.warn('[Supabase] Erreur fetchMissions:', error.message);
      return [];
    }
    return (data || []).map(mapMissionRow);
  } catch (err) {
    console.warn('[Supabase] Exception fetchMissions:', err);
    return [];
  }
}

export async function syncMissions(missions: Mission[]): Promise<boolean> {
  if (!supabase) return false;
  try {
    const rows = missions.map((m, idx) => mapMissionToRow(m, idx));

    const { data: existing, error: fetchErr } = await supabase
      .from('wms_missions')
      .select('id');

    if (fetchErr) {
      console.warn('[Supabase] Erreur syncMissions (select):', fetchErr.message);
      return false;
    }

    const keepIds = new Set(rows.map((r) => r.id));
    const toDelete = (existing || []).map((r: any) => r.id).filter((id: string) => !keepIds.has(id));

    if (toDelete.length > 0) {
      const { error: delErr } = await supabase.from('wms_missions').delete().in('id', toDelete);
      if (delErr) {
        console.warn('[Supabase] Erreur syncMissions (delete):', delErr.message);
        return false;
      }
    }

    if (rows.length > 0) {
      const { error: upsertErr } = await supabase
        .from('wms_missions')
        .upsert(rows, { onConflict: 'id' });

      if (upsertErr) {
        console.warn('[Supabase] Erreur syncMissions (upsert):', upsertErr.message);
        return false;
      }
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Exception syncMissions:', err);
    return false;
  }
}

export function subscribeToMissions(onChanged: (missions: Mission[]) => void) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(generateChannelId('wms-missions'))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'wms_missions' },
      async () => {
        const fresh = await fetchMissions();
        onChanged(fresh);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// =========================================================================
// 4. SCORES & LEADERBOARD (Table: public.scores)
// =========================================================================

export async function getRemoteLeaderboard(): Promise<RemoteScore[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .order('score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.warn('[Supabase] Erreur récupération scores:', error.message);
      return [];
    }
    const rawScores = (data as RemoteScore[]) || [];

    const seenNames = new Set<string>();
    const deduplicated: RemoteScore[] = [];

    for (const sc of rawScores) {
      const cleanKey = (sc.name || '').trim().toLowerCase();
      if (!cleanKey) continue;
      if (seenNames.has(cleanKey)) continue;
      seenNames.add(cleanKey);
      deduplicated.push(sc);
    }

    return deduplicated;
  } catch (err) {
    console.warn('[Supabase] Exception getRemoteLeaderboard:', err);
    return [];
  }
}

export async function resetAllScores(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('scores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    return !error;
  } catch {
    return false;
  }
}

export async function deleteScoreById(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('scores').delete().eq('id', id);
    if (error) {
      console.warn('[Supabase] Erreur suppression score:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Exception deleteScoreById:', err);
    return false;
  }
}

export async function submitScore(score: Omit<RemoteScore, 'id' | 'created_at'>): Promise<boolean> {
  if (!supabase) return false;
  try {
    const cleanName = (score.name || '').trim();
    if (!cleanName) return false;

    const { data: existingRows } = await supabase
      .from('scores')
      .select('id, score')
      .eq('name', cleanName)
      .limit(1);

    if (existingRows && existingRows.length > 0) {
      const existing = existingRows[0];
      if (score.score >= existing.score) {
        const { error: updateError } = await supabase
          .from('scores')
          .update({
            score: score.score,
            company: score.company,
            time_spent: score.time_spent,
            completed_missions: score.completed_missions,
            accuracy: score.accuracy
          })
          .eq('id', existing.id);

        if (updateError) {
          console.warn('[Supabase] Erreur mise à jour score existant:', updateError.message);
          return false;
        }
        return true;
      }
      return true;
    }

    const { error } = await supabase.from('scores').insert([score]);
    if (error) {
      console.warn('[Supabase] Erreur enregistrement score:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Exception submitScore:', err);
    return false;
  }
}

export function subscribeToScores(onChanged: () => void) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(generateChannelId('scores'))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'scores' },
      () => {
        onChanged();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// =========================================================================
// 5. LIVE ACTIVITY (Table: public.live_activity)
// =========================================================================

export async function resetLiveActivity(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('live_activity').delete().neq('status', '___none___');
    return !error;
  } catch {
    return false;
  }
}

export async function getRecentLiveActivities(limit: number = 8): Promise<LiveActivityEvent[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('live_activity')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[Supabase] Erreur getRecentLiveActivities:', error.message);
      return [];
    }
    return (data as LiveActivityEvent[]) || [];
  } catch (err) {
    console.warn('[Supabase] Exception getRecentLiveActivities:', err);
    return [];
  }
}

export async function broadcastScan(activity: Omit<LiveActivityEvent, 'id' | 'created_at'>): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('live_activity').insert([activity]);
  } catch {
    // Non-blocking
  }
}

export function subscribeToLiveActivity(onActivity: (activity: LiveActivityEvent) => void) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(generateChannelId('activity'))
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'live_activity' },
      (payload) => {
        onActivity(payload.new as LiveActivityEvent);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// =========================================================================
// 6. APP CONFIG (Table: public.app_config — paramètres globaux uniquement)
// =========================================================================

export async function loadAppConfig(): Promise<StoredAppConfig | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error) {
      console.warn('[Supabase] Erreur loadAppConfig:', error.message);
      return null;
    }
    if (!data) return null;
    return mapAppConfigRow(data);
  } catch (err) {
    console.warn('[Supabase] Exception loadAppConfig:', err);
    return null;
  }
}

export async function saveAppConfig(config: StoredAppConfig): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('app_config')
      .upsert({
        id: 'default',
        event_title: config.eventTitle,
        event_subtitle: config.eventSubtitle,
        badge_label: config.badgeLabel,
        shift_duration_seconds: config.shiftDurationSeconds,
        combo_bonus_points: config.comboBonusPoints,
        public_url: config.publicUrl,
        diploma_title: config.diplomaTitle,
        diploma_description: config.diplomaDescription,
        diploma_signatory: config.diplomaSignatory,
        available_stations: config.availableStations,
        custom_logo_url: config.customLogoUrl || '',
        golden_ticket_barcode: config.goldenTicketBarcode || 'ART-GT25-VIP',
        delivery_table_barcode: config.deliveryTableBarcode || 'LOC-ETAGERE-LIVRAISON',
        collect_table_barcode: config.collectTableBarcode || 'LOC-ETAGERE-COLLECTE',
        auto_loop_enabled: config.autoLoopEnabled ?? true,
        auto_hazards_enabled: config.autoHazardsEnabled ?? true,
        hazard_interval_seconds: config.hazardIntervalSeconds ?? 90,
        strict_scan_only: config.strictScanOnly ?? false,
        clients_catalog: config.clientsCatalog ?? [],
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.warn('[Supabase] Erreur saveAppConfig:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Exception saveAppConfig:', err);
    return false;
  }
}

export function subscribeToAppConfig(onConfigChanged: (config: StoredAppConfig) => void) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(generateChannelId('config'))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'app_config' },
      (payload) => {
        const row = payload.new as any;
        if (row) {
          onConfigChanged(mapAppConfigRow(row));
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// =========================================================================
// 7. LIVE STATIONS (Table: public.stations_live)
// =========================================================================

export async function getStationsLive(): Promise<DuoStation[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('stations_live')
      .select('*')
      .order('station_id', { ascending: true });
    if (error) return [];
    return (data as DuoStation[]) || [];
  } catch {
    return [];
  }
}

export async function updateStationLive(station: Partial<DuoStation> & { station_id: string }): Promise<void> {
  if (!supabase) return;
  try {
    await supabase
      .from('stations_live')
      .upsert({
        ...station,
        updated_at: new Date().toISOString()
      });
  } catch {
    // Non-blocking
  }
}

export async function resetAllLiveStations(availableStations?: { id: string; name: string }[]): Promise<boolean> {
  if (!supabase) return false;
  try {
    if (availableStations && availableStations.length > 0) {
      const resets = availableStations.map((st, idx) => ({
        station_id: st.id,
        station_name: st.name,
        operator_cea: `Collaborateur ${idx + 1}`,
        client_guest: 'En attente...',
        team_name: `Duo ${idx + 1}`,
        current_mission_title: 'En attente du départ...',
        progress_percent: 0,
        current_step_index: 0,
        total_steps: 0,
        score: 0,
        combo: 0,
        status: 'idle' as const,
        last_scan_code: null,
        last_scan_status: null,
        updated_at: new Date().toISOString()
      }));
      const { error } = await supabase.from('stations_live').upsert(resets, { onConflict: 'station_id' });
      return !error;
    }

    const { error } = await supabase
      .from('stations_live')
      .update({
        client_guest: 'En attente...',
        current_mission_title: 'En attente du départ...',
        progress_percent: 0,
        current_step_index: 0,
        score: 0,
        combo: 0,
        status: 'idle',
        last_scan_code: null,
        last_scan_status: null,
        updated_at: new Date().toISOString()
      })
      .neq('station_id', '___none___');

    return !error;
  } catch {
    return false;
  }
}

export function subscribeToStationsLive(onStationUpdate: (station: DuoStation) => void) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(generateChannelId('stations'))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'stations_live' },
      (payload) => {
        if (payload.new) {
          onStationUpdate(payload.new as DuoStation);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// =========================================================================
// 8. DISTRACTIONS & LIVE HAZARDS (Tables: public.distractions, public.live_hazards)
// =========================================================================

export async function fetchDistractions(): Promise<Distraction[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('distractions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] Erreur fetchDistractions:', error.message);
      return [];
    }
    return (data as Distraction[]) || [];
  } catch {
    return [];
  }
}

export async function saveDistraction(distraction: Partial<Distraction>): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('distractions')
      .upsert(distraction);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteDistraction(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('distractions')
      .delete()
      .eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export function subscribeToDistractions(onChanged: (list: Distraction[]) => void) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(generateChannelId('distractions'))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'distractions' },
      async () => {
        const fresh = await fetchDistractions();
        onChanged(fresh);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function fetchActiveHazardForStation(stationId: string): Promise<LiveHazard | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('live_hazards')
      .select('*')
      .eq('status', 'active')
      .in('target_station_id', ['all', stationId])
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    return data[0] as LiveHazard;
  } catch {
    return null;
  }
}

export async function triggerLiveHazard(hazard: Omit<LiveHazard, 'id' | 'created_at'>): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('live_hazards')
      .insert([hazard])
      .select('id')
      .single();

    if (error) {
      console.warn('[Supabase] Erreur triggerLiveHazard:', error.message);
      return null;
    }
    return data?.id || null;
  } catch {
    return null;
  }
}

export async function resolveLiveHazard(hazardId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('live_hazards')
      .update({ status: 'resolved' })
      .eq('id', hazardId);
    return !error;
  } catch {
    return false;
  }
}

export async function expireLiveHazard(hazardId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('live_hazards')
      .update({ status: 'expired' })
      .eq('id', hazardId);
    return !error;
  } catch {
    return false;
  }
}

export function subscribeToLiveHazards(onHazardEvent: (hazard: LiveHazard, eventType: 'INSERT' | 'UPDATE') => void) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(generateChannelId('hazards'))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'live_hazards' },
      (payload) => {
        if (payload.new) {
          onHazardEvent(payload.new as LiveHazard, payload.eventType as 'INSERT' | 'UPDATE');
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
