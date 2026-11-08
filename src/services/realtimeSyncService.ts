import { AppConfig, InventoryItem, Mission, DuoStation } from '../types';

export type RealtimeEventType = 
  | 'CONFIG_UPDATED'
  | 'INVENTORY_UPDATED'
  | 'MISSIONS_UPDATED'
  | 'STATIONS_UPDATED'
  | 'SCORE_RECORDED'
  | 'FORCE_SYNC';

export interface RealtimeMessage {
  type: RealtimeEventType;
  payload: any;
  timestamp: number;
  senderId: string;
}

const CHANNEL_NAME = 'gt_cea_25ans_realtime_bus';
const SESSION_CLIENT_ID = `client_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// Initialisation du canal BroadcastChannel navigateur pour sync inter-onglets ultra-rapide (0ms)
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch (e) {
  console.warn('[RealtimeSync] BroadcastChannel non supporté, fallback storage activé.');
}

const listeners: Set<(msg: RealtimeMessage) => void> = new Set();

if (broadcastChannel) {
  broadcastChannel.onmessage = (event) => {
    const data = event.data as RealtimeMessage;
    if (data && data.senderId !== SESSION_CLIENT_ID) {
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (err) {
          console.error('[RealtimeSync] Erreur listener:', err);
        }
      });
    }
  };
}

// Fallback inter-onglets via Storage Event
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'cea_wms_realtime_event' && e.newValue) {
      try {
        const data = JSON.parse(e.newValue) as RealtimeMessage;
        if (data && data.senderId !== SESSION_CLIENT_ID) {
          listeners.forEach((listener) => {
            try {
              listener(data);
            } catch (err) {
              console.error('[RealtimeSync] Erreur fallback listener:', err);
            }
          });
        }
      } catch {}
    }
  });
}

/**
 * Diffuse un événement temps réel à tous les onglets ouverts en local instantanément (0 ms)
 */
export function broadcastLocalRealtime(type: RealtimeEventType, payload: any) {
  const msg: RealtimeMessage = {
    type,
    payload,
    timestamp: Date.now(),
    senderId: SESSION_CLIENT_ID
  };

  // 1. Envoi via BroadcastChannel
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(msg);
    } catch {}
  }

  // 2. Envoi via localStorage pour réveiller les autres onglets
  try {
    localStorage.setItem('cea_wms_realtime_event', JSON.stringify(msg));
  } catch {}
}

/**
 * Souscription aux événements temps réel émis par n'importe quel onglet de l'application
 */
export function subscribeToLocalRealtime(callback: (msg: RealtimeMessage) => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
