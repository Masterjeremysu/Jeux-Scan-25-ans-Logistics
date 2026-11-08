import { createClient } from '@supabase/supabase-js';
import { Mission, InventoryItem, AppConfig } from '../types';

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
  missions: Mission[];
  inventory: InventoryItem[];
}

const LOCAL_STORAGE_KEY = 'cea_wms_custom_config_v1';

// Fetch leaderboard ordered by score descending
export async function getRemoteLeaderboard(): Promise<RemoteScore[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .order('score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(30);

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
    const { error } = await supabase.from('scores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    return !error;
  } catch {
    return false;
  }
}

// Save score to Supabase with local fallback
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
  } catch (err) {
    // Silent fail for non-blocking live broadcast
  }
}

// Realtime subscription for scores table
export function subscribeToScores(onNewScore: (score: RemoteScore) => void) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('scores-realtime')
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
    .channel('activity-realtime')
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
  // 1. Try local storage first as quick cache
  let localData: StoredAppConfig | null = null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) localData = JSON.parse(raw);
  } catch {}

  // 2. Try Supabase for source of truth
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (!error && data && Array.isArray(data.missions) && data.missions.length > 0) {
        const remoteConfig: StoredAppConfig = {
          eventTitle: data.event_title || 'CEA GRENOBLE',
          eventSubtitle: data.event_subtitle || 'WMS Industrial Terminal • Shift Challenge',
          badgeLabel: data.badge_label || 'ÉDITION 25 ANS',
          shiftDurationSeconds: data.shift_duration_seconds || 300,
          missions: data.missions,
          inventory: Array.isArray(data.inventory) ? data.inventory : []
        };
        // Update local cache
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
  // Always update local storage
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
    .channel('config-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'app_config' },
      (payload) => {
        const row = payload.new as any;
        if (row && Array.isArray(row.missions) && row.missions.length > 0) {
          onConfigChanged({
            eventTitle: row.event_title || 'CEA GRENOBLE',
            eventSubtitle: row.event_subtitle || 'WMS Industrial Terminal • Shift Challenge',
            badgeLabel: row.badge_label || 'ÉDITION 25 ANS',
            shiftDurationSeconds: row.shift_duration_seconds || 300,
            missions: row.missions,
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
