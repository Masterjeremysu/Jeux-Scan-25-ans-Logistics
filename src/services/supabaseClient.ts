import { createClient } from '@supabase/supabase-js';

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

// Fetch leaderboard ordered by score descending
export async function getRemoteLeaderboard(): Promise<RemoteScore[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .order('score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(20);

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
