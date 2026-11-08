import { createClient } from '@supabase/supabase-js';
import { Mission, InventoryItem, AppConfig, DuoStation, Distraction, LiveHazard } from '../types';

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
  message: string;
  status: 'valid' | 'invalid' | 'warning';
  created_at?: string;
}

export interface StoredAppConfig {
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
  autoHazardsEnabled?: boolean;
  hazardIntervalSeconds?: number;
  clientsCatalog?: string[];
  missions: Mission[];
  inventory: InventoryItem[];
}

const LOCAL_STORAGE_KEY = 'cea_wms_custom_config_v2';

// Fetch leaderboard ordered by score descending (Real database rows only, no mock)
export async function getRemoteLeaderboard(): Promise<RemoteScore[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .order('score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.warn('[Supabase] Erreur récupération scores:', error.message);
      return [];
    }
    return (data as RemoteScore[]) || [];
  } catch (err) {
    console.warn('[Supabase] Exception getRemoteLeaderboard:', err);
    return [];
  }
}

// Reset all scores in Supabase
export async function resetAllScores(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('scores').delete().neq('score', -999999);
    return !error;
  } catch {
    return false;
  }
}

// Reset live activity logs in Supabase
export async function resetLiveActivity(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('live_activity').delete().neq('status', '___none___');
    return !error;
  } catch {
    return false;
  }
}

// Save score to Supabase
export async function submitScore(score: Omit<RemoteScore, 'id' | 'created_at'>): Promise<boolean> {
  if (!supabase) return false;
  try {
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

// Broadcast live scan activity for the multi-station / spectator screen
export async function broadcastScan(activity: Omit<LiveActivityEvent, 'id' | 'created_at'>): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('live_activity').insert([activity]);
  } catch {
    // Non-blocking
  }
}

const generateChannelId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Realtime subscription for scores table
export function subscribeToScores(onNewScore: (score: RemoteScore) => void) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(generateChannelId('scores'))
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'scores' },
      (payload) => {
        onNewScore(payload.new as RemoteScore);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Realtime subscription for live activity
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

// Load App Config (from Supabase first, fallback to localStorage)
export async function loadAppConfig(): Promise<StoredAppConfig | null> {
  let localData: StoredAppConfig | null = null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) localData = JSON.parse(raw);
  } catch {}

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (!error && data) {
        const remoteConfig: StoredAppConfig = {
          eventTitle: data.event_title || 'CEA GRENOBLE',
          eventSubtitle: data.event_subtitle || 'WMS Industrial Terminal • Shift Challenge',
          badgeLabel: data.badge_label || 'ÉDITION 25 ANS',
          shiftDurationSeconds: data.shift_duration_seconds || 300,
          comboBonusPoints: data.combo_bonus_points || 50,
          publicUrl: data.public_url || 'https://jeux-scan-25-ans-logistics.vercel.app',
          diplomaTitle: data.diploma_title || 'DIPLÔME D\'HONNEUR',
          diplomaDescription: data.diploma_description || 'Attribué pour l\'excellence des opérations de picking et traçabilité logistique.',
          diplomaSignatory: data.diploma_signatory || 'La Direction Logistique & Supply Chain',
          availableStations: Array.isArray(data.available_stations) ? data.available_stations : [
            { id: 'poste-1', name: 'Poste 1 (Scannette A)' },
            { id: 'poste-2', name: 'Poste 2 (Scannette B)' },
            { id: 'poste-3', name: 'Poste 3 (Zebra Scan)' }
          ],
          autoHazardsEnabled: data.auto_hazards_enabled ?? true,
          hazardIntervalSeconds: data.hazard_interval_seconds ?? 90,
          clientsCatalog: Array.isArray(data.clients_catalog) ? data.clients_catalog : [
            'CEA LETI - Bât. 17 (Nano)',
            'Minatec Salle Blanche ISO 5',
            'IRIG / Cryo Fondamentale',
            'Banc de Test Épitaxie MBE',
            'Plateforme Wafers Silicium',
            'Magasin Central Quai 3'
          ],
          missions: Array.isArray(data.missions) ? data.missions : [],
          inventory: Array.isArray(data.inventory) ? data.inventory : []
        };
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(remoteConfig));
        } catch {}
        return remoteConfig;
      }
    } catch (err) {
      console.warn('[Supabase] Exception loadAppConfig:', err);
    }
  }

  return localData;
}

// Save App Config (to Supabase and local storage)
export async function saveAppConfig(config: StoredAppConfig): Promise<boolean> {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
  } catch {}

  if (!supabase) return true;

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
        auto_hazards_enabled: config.autoHazardsEnabled ?? true,
        hazard_interval_seconds: config.hazardIntervalSeconds ?? 90,
        clients_catalog: config.clientsCatalog ?? [],
        missions: config.missions,
        inventory: config.inventory,
        updated_at: new Date().toISOString()
      });

    return !error;
  } catch (err) {
    console.warn('[Supabase] Exception saveAppConfig:', err);
    return false;
  }
}

// Subscribe to App Config changes in Realtime
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
          onConfigChanged({
            eventTitle: row.event_title || 'CEA GRENOBLE',
            eventSubtitle: row.event_subtitle || 'WMS Industrial Terminal • Shift Challenge',
            badgeLabel: row.badge_label || 'ÉDITION 25 ANS',
            shiftDurationSeconds: row.shift_duration_seconds || 300,
            comboBonusPoints: row.combo_bonus_points || 50,
            publicUrl: row.public_url || 'https://jeux-scan-25-ans-logistics.vercel.app',
            diplomaTitle: row.diploma_title || 'DIPLÔME D\'HONNEUR',
            diplomaDescription: row.diploma_description || 'Attribué pour l\'excellence des opérations de picking et traçabilité logistique.',
            diplomaSignatory: row.diploma_signatory || 'La Direction Logistique & Supply Chain',
            availableStations: Array.isArray(row.available_stations) ? row.available_stations : [
              { id: 'poste-1', name: 'Poste 1 (Scannette A)' },
              { id: 'poste-2', name: 'Poste 2 (Scannette B)' }
            ],
            autoHazardsEnabled: row.auto_hazards_enabled ?? true,
            hazardIntervalSeconds: row.hazard_interval_seconds ?? 90,
            clientsCatalog: Array.isArray(row.clients_catalog) ? row.clients_catalog : [],
            missions: Array.isArray(row.missions) ? row.missions : [],
            inventory: Array.isArray(row.inventory) ? row.inventory : []
          });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Fetch all live stations
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

// Update station progress and Duo in Supabase
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

// Subscribe to Live Stations updates (for TV Arena & Battle display)
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

// ----------------------------------------------------
// Distractions & Hazards System (Aléas en direct)
// ----------------------------------------------------

// Fetch all distraction templates
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

// Save or Update a Distraction template
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

// Delete a Distraction template
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

// Trigger a live hazard across stations or targeted to a single station
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

// Resolve a live hazard
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

// Mark a live hazard as expired
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

// Subscribe to Live Hazards in Realtime
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
