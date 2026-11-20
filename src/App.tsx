import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ViewMode, InventoryItem, Mission, ScanLog, OperatorProfile, AppConfig, DuoStation, Distraction, LiveHazard, WarehouseLocation } from './types';
import { Header } from './components/Header';
import { PosteOperateurView } from './components/PosteOperateurView';
import { StockERPView } from './components/StockERPView';
import { PlancheEtiquettesView } from './components/PlancheEtiquettesView';
import { PodiumView } from './components/PodiumView';
import { ArenaTvView } from './components/ArenaTvView';
import { AdminConfigView } from './components/AdminConfigView';
import { DiplomeModal } from './components/DiplomeModal';
import { GoldenTicketModal } from './components/GoldenTicketModal';
import { ZebraPlayView } from './components/ZebraPlayView';
import { HomeLauncherView } from './components/HomeLauncherView';
import { ToastContainer, showToast } from './components/ToastNotification';
import { barcodeListener } from './services/barcodeListener';
import { soundService } from './services/soundService';
import { broadcastLocalRealtime, subscribeToLocalRealtime } from './services/realtimeSyncService';
import { 
  submitScore, 
  broadcastScan, 
  loadAppConfig, 
  saveAppConfig,
  subscribeToAppConfig,
  fetchLocations,
  syncLocations,
  subscribeToLocations,
  fetchInventory,
  syncInventory,
  adjustInventoryQuantity,
  moveStockLoop,
  setInventoryItemQuantity,
  subscribeToInventory,
  fetchMissions,
  syncMissions,
  subscribeToMissions,
  getStationsLive,
  updateStationLive,
  subscribeToStationsLive,
  fetchDistractions,
  subscribeToDistractions,
  fetchActiveHazardForStation,
  triggerLiveHazard,
  resolveLiveHazard,
  expireLiveHazard,
  subscribeToLiveHazards
} from './services/supabaseClient';

let logCounter = 0;
const generateUniqueLogId = () => `log-${Date.now()}-${++logCounter}-${Math.random().toString(36).slice(2, 7)}`;

const getStationMissions = (baseMissions: Mission[], stId: string, preferredMissionIndex?: number): Mission[] => {
  if (!baseMissions || baseMissions.length === 0) return [];
  if (typeof preferredMissionIndex === 'number' && preferredMissionIndex >= 0 && preferredMissionIndex < baseMissions.length) {
    const chosen = baseMissions[preferredMissionIndex];
    return [chosen, ...baseMissions.filter((m) => m.id !== chosen.id)];
  }
  if (stId === 'poste-2') {
    // Reverse order for Poste 2 so both duos target different physical shelves during duel
    return baseMissions.slice().reverse();
  }
  return baseMissions;
};

// Clean, 100% DB-driven barcode comparator (supports scanner prefixes, L/R codes, and DB aliases)
const normalizeBarcode = (raw: string): string =>
  raw.replace(/^\][a-zA-Z0-9]{2}/, '').replace(/[\r\n\t]/g, '').trim().toUpperCase();

const stripBarcode = (raw: string): string =>
  normalizeBarcode(raw).replace(/[^A-Z0-9]/g, '');

const isBarcodeMatching = (
  scanned: string,
  expected: string,
  lrCode?: string,
  aliases?: string[]
): boolean => {
  const cleanS = normalizeBarcode(scanned);
  const cleanE = normalizeBarcode(expected);
  if (!cleanS || !cleanE) return false;
  if (cleanS === cleanE) return true;

  if (lrCode && cleanS === normalizeBarcode(lrCode)) return true;

  const strippedS = stripBarcode(cleanS);
  const strippedE = stripBarcode(cleanE);
  if (strippedS && strippedS === strippedE) return true;

  if (lrCode) {
    const strippedLr = stripBarcode(lrCode);
    if (strippedLr && strippedS === strippedLr) return true;
  }

  if (Array.isArray(aliases) && aliases.length > 0) {
    for (const alias of aliases) {
      const cleanA = normalizeBarcode(alias);
      if (!cleanA) continue;
      if (cleanS === cleanA || strippedS === stripBarcode(cleanA)) return true;
    }
  }

  return false;
};

const parseInitialRoute = (): { view: ViewMode; stationId?: string; stationName?: string } => {
  const rawHash = window.location.hash.replace('#', '');
  const hash = rawHash.split('?')[0].toLowerCase();
  
  // Extract search params from either window.location.search or inside hash (e.g. #play?station=poste-1)
  const hashQuery = rawHash.includes('?') ? rawHash.split('?')[1] : '';
  const search = new URLSearchParams(window.location.search || hashQuery);
  const qView = (search.get('view') || '').toLowerCase();
  const qStation = (search.get('station') || '').toLowerCase();

  const isPlay = hash.includes('play') || qView === 'play' || hash.startsWith('zebra');
  if (isPlay) {
    const targetStation = qStation || (hash.includes('poste-2') || hash.includes('zebra-2') ? 'poste-2' : hash.includes('poste-3') ? 'poste-3' : 'poste-1');
    return {
      view: 'play',
      stationId: targetStation,
      stationName: targetStation === 'poste-2' ? 'Poste 2 (Scannette B)' : targetStation === 'poste-3' ? 'Poste 3 (Zebra Scan)' : 'Poste 1 (Scannette A)'
    };
  }

  const target = hash || qView || qStation;

  if (target === 'tv' || target === 'arena') return { view: 'arena' };
  if (target === 'admin') return { view: 'admin' };
  if (target === 'podium') return { view: 'podium' };
  if (target === 'erp') return { view: 'erp' };
  if (target === 'print') return { view: 'print' };
  if (target === 'home') return { view: 'home' };

  if (target === 'kiosk') return { view: 'kiosk' };
  if (target === 'poste-1') return { view: 'kiosk', stationId: 'poste-1', stationName: 'Poste 1 (Scannette A)' };
  if (target === 'poste-2') return { view: 'kiosk', stationId: 'poste-2', stationName: 'Poste 2 (Scannette B)' };
  if (target === 'poste-3') return { view: 'kiosk', stationId: 'poste-3', stationName: 'Poste 3 (Zebra Scan)' };

  return { view: 'home' };
};

export const App: React.FC = () => {
  const initialRoute = parseInitialRoute();
  const initialStationId = initialRoute.stationId || (typeof window !== 'undefined' ? localStorage.getItem('cea_station_id') : null) || 'poste-1';
  const initialStationName = initialRoute.stationName || (typeof window !== 'undefined' ? localStorage.getItem('cea_station_name') : null) || (initialStationId === 'poste-2' ? 'Poste 2 (Scannette B)' : 'Poste 1 (Scannette A)');

  const [currentView, setCurrentView] = useState<ViewMode>(initialRoute.view);
  const [stationId, setStationId] = useState<string>(initialStationId);
  const [stationName, setStationName] = useState<string>(initialStationName);
  const [isDbLoading, setIsDbLoading] = useState<boolean>(true);
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig>({
    eventTitle: 'GT LOGISTICS',
    eventSubtitle: 'WMS Industrial Terminal',
    badgeLabel: 'ÉDITION 25 ANS',
    shiftDurationSeconds: 180,
    comboBonusPoints: 50,
    publicUrl: typeof window !== 'undefined' ? window.location.origin : '',
    diplomaTitle: 'DIPLÔME D\'HONNEUR',
    diplomaDescription: '',
    diplomaSignatory: '',
    availableStations: [],
    goldenTicketBarcode: 'ART-GT25-VIP',
    locations: []
  });
  const [currentMissionIndex, setCurrentMissionIndex] = useState<number>(0);
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [lastScanStatus, setLastScanStatus] = useState<'valid' | 'invalid' | null>(null);
  const [flashState, setFlashState] = useState<'green' | 'red' | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [shiftSecondsRemaining, setShiftSecondsRemaining] = useState<number>(180);
  const [isShiftTimerRunning, setIsShiftTimerRunning] = useState<boolean>(false);
  const [isDiplomeOpen, setIsDiplomeOpen] = useState<boolean>(false);
  const [isGoldenTicketOpen, setIsGoldenTicketOpen] = useState<boolean>(false);
  const [hasFoundGoldenTicket, setHasFoundGoldenTicket] = useState<boolean>(false);

  // Duo & Multi-station States
  const [operatorCea, setOperatorCea] = useState<string>(() => localStorage.getItem('gt_collab_name') || 'Jeremy (GT)');
  const [clientGuest, setClientGuest] = useState<string>(() => localStorage.getItem('gt_guest_name') || 'Thomas (Invité)');
  const [combo, setCombo] = useState<number>(0);
  const [liveStations, setLiveStations] = useState<DuoStation[]>([]);

  // Hazards & Distractions States
  const [distractions, setDistractions] = useState<Distraction[]>([]);
  const [activeHazard, setActiveHazard] = useState<LiveHazard | null>(null);
  const [hazardSecondsRemaining, setHazardSecondsRemaining] = useState<number>(0);
  const activeHazardRef = useRef<LiveHazard | null>(null);
  activeHazardRef.current = activeHazard;

  // Keep fresh references to avoid closure race conditions
  const missionsRef = useRef(missions);
  missionsRef.current = missions;
  const locationsRef = useRef(locations);
  locationsRef.current = locations;
  const inventoryRef = useRef(inventory);
  inventoryRef.current = inventory;
  const appConfigRef = useRef(appConfig);
  appConfigRef.current = appConfig;
  const currentMissionIndexRef = useRef(currentMissionIndex);
  currentMissionIndexRef.current = currentMissionIndex;
  const comboRef = useRef(combo);
  comboRef.current = combo;
  const stationIdRef = useRef(stationId);
  stationIdRef.current = stationId;
  const stationNameRef = useRef(stationName);
  stationNameRef.current = stationName;
  const operatorCeaRef = useRef(operatorCea);
  operatorCeaRef.current = operatorCea;
  const clientGuestRef = useRef(clientGuest);
  clientGuestRef.current = clientGuest;

  // Real-time Scoring Intelligence (Speed bonus, Accuracy & Zebra anti-bounce tracking)
  const lastStepStartTimeRef = useRef<number>(Date.now());
  const shiftSecondsRemainingRef = useRef<number>(shiftSecondsRemaining);
  shiftSecondsRemainingRef.current = shiftSecondsRemaining;
  const lastProcessedScanRef = useRef<{ code: string; time: number; wasValid: boolean }>({
    code: '',
    time: 0,
    wasValid: false
  });
  const validScansCountRef = useRef<number>(0);
  const errorScansCountRef = useRef<number>(0);

  const [operator, setOperator] = useState<OperatorProfile>({
    name: 'Duo ' + clientGuest,
    companyOrRole: 'GT Logistics • 25 Ans',
    score: 0,
    completedMissions: 0,
    accuracy: 100,
    shiftDurationSeconds: 300
  });

  // Load 100% of data from Supabase relational tables on startup + subscribe to Realtime
  useEffect(() => {
    async function initFromSupabase() {
      try {
        const [storedCfg, dbLocations, dbInventory, dbMissions, stList, distList] = await Promise.all([
          loadAppConfig(),
          fetchLocations(),
          fetchInventory(),
          fetchMissions(),
          getStationsLive(),
          fetchDistractions()
        ]);

        setLocations(dbLocations);
        setInventory(dbInventory);

        // Align initial mission order if this station already has an assigned mission in stations_live
        const myInitialStation = stList.find((s) => s.station_id === stationIdRef.current);
        let initialPreferredIdx: number | undefined = undefined;
        if (myInitialStation?.current_mission_title) {
          const foundIdx = dbMissions.findIndex(
            (m) => m.title.toLowerCase() === myInitialStation.current_mission_title.toLowerCase()
          );
          if (foundIdx !== -1) initialPreferredIdx = foundIdx;
        }
        let orderedMissions = getStationMissions(dbMissions, stationIdRef.current, initialPreferredIdx);

        // Restore active match progress from sessionStorage if the Zebra was accidentally refreshed mid-match
        try {
          const savedRaw = sessionStorage.getItem(`zebra_match_${stationIdRef.current}`);
          if (savedRaw && myInitialStation?.status === 'in_progress') {
            const saved = JSON.parse(savedRaw);
            if (saved && typeof saved.score === 'number' && saved.score > 0) {
              setOperator((prev) => ({
                ...prev,
                score: saved.score,
                completedMissions: saved.completedMissions || 0,
                accuracy: saved.accuracy ?? 100
              }));
              setCombo(saved.combo || 0);
              if (typeof saved.currentMissionIndex === 'number' && saved.currentMissionIndex < orderedMissions.length) {
                setCurrentMissionIndex(saved.currentMissionIndex);
              }
              if (typeof saved.shiftSecondsRemaining === 'number' && saved.shiftSecondsRemaining > 0) {
                setShiftSecondsRemaining(saved.shiftSecondsRemaining);
              }
              if (saved.stepProgress && typeof saved.stepProgress === 'object') {
                orderedMissions = orderedMissions.map((m) => ({
                  ...m,
                  steps: m.steps.map((st) => {
                    const sp = saved.stepProgress[st.id];
                    return sp ? { ...st, completed: Boolean(sp.completed), scannedCount: sp.scannedCount || 0 } : st;
                  })
                }));
              }
            }
          }
        } catch {}

        setMissions(orderedMissions);

        if (storedCfg) {
          setAppConfig((prev) => ({
            ...prev,
            ...storedCfg,
            locations: dbLocations
          }));
          setShiftSecondsRemaining(storedCfg.shiftDurationSeconds || 180);
        } else {
          setAppConfig((prev) => ({ ...prev, locations: dbLocations }));
        }

        if (stList.length > 0) {
          setLiveStations(stList);
          if (myInitialStation) {
            if (myInitialStation.operator_cea) setOperatorCea(myInitialStation.operator_cea);
            if (myInitialStation.client_guest) setClientGuest(myInitialStation.client_guest);
            setIsShiftTimerRunning(myInitialStation.status === 'in_progress');
            setOperator((prev) => ({
              ...prev,
              name: myInitialStation.team_name || `Duo ${myInitialStation.client_guest}`
            }));
          }
        }

        if (distList.length > 0) {
          setDistractions(distList);
        }

        // Vérifier s'il y a déjà un aléa actif en cours pour ce poste (en cas de reload / reconnexion)
        const pendingHazard = await fetchActiveHazardForStation(stationIdRef.current);
        if (pendingHazard) {
          setActiveHazard(pendingHazard);
          setHazardSecondsRemaining(pendingHazard.time_limit_seconds || 45);
        }
      } finally {
        setIsDbLoading(false);
      }
    }
    initFromSupabase();

    // Realtime: app_config
    const unsubConfig = subscribeToAppConfig((newCfg) => {
      setAppConfig((prev) => ({
        ...prev,
        ...newCfg,
        locations: locationsRef.current
      }));
    });

    // Realtime: wms_locations
    const unsubLocations = subscribeToLocations((freshLocations) => {
      setLocations(freshLocations);
      setAppConfig((prev) => ({ ...prev, locations: freshLocations }));
    });

    // Realtime: wms_inventory
    const unsubInventory = subscribeToInventory((freshInventory) => {
      setInventory(freshInventory);
    });

    // Realtime: wms_missions (préserve la progression locale si une mission est en cours)
    const unsubMissions = subscribeToMissions((freshMissions) => {
      const prevPool = missionsRef.current || [];
      const hasLocalProgress = prevPool.some((m) => m.steps.some((st) => st.completed || (st.scannedCount || 0) > 0));
      if (!hasLocalProgress) {
        setMissions(getStationMissions(freshMissions, stationIdRef.current));
        return;
      }
      const prevById = new Map(prevPool.map((m) => [m.id, m]));
      const merged = getStationMissions(freshMissions, stationIdRef.current).map((m) => {
        const oldM = prevById.get(m.id);
        if (!oldM) return m;
        const oldStepsById = new Map(oldM.steps.map((s) => [s.id, s]));
        return {
          ...m,
          steps: m.steps.map((st) => {
            const oldSt = oldStepsById.get(st.id);
            return oldSt ? { ...st, completed: oldSt.completed, scannedCount: oldSt.scannedCount } : st;
          })
        };
      });
      setMissions(merged);
    });

    // Realtime: distractions (synchronise instantanément les aléas & la planche d'étiquettes)
    const unsubDistractions = subscribeToDistractions((freshDistractions) => {
      setDistractions(freshDistractions);
    });

    // Subscribe to live stations updates
    const unsubStations = subscribeToStationsLive((updatedStation) => {
      setLiveStations((prev) => {
        const idx = prev.findIndex((s) => s.station_id === updatedStation.station_id);
        if (idx !== -1) {
          const clone = [...prev];
          clone[idx] = updatedStation;
          return clone;
        }
        return [...prev, updatedStation];
      });

      // If this update is for this terminal, sync identity, assigned mission and match reset
      if (updatedStation.station_id === stationIdRef.current) {
        if (updatedStation.operator_cea) setOperatorCea(updatedStation.operator_cea);
        if (updatedStation.client_guest) setClientGuest(updatedStation.client_guest);
        
        // Detect BOTH idle reset AND TV Arena "Top Départ Duel" (in_progress with score=0, step=0, no last_scan_code)
        const isIdleReset = updatedStation.status === 'idle';
        const isFreshTvDuelLaunch =
          updatedStation.status === 'in_progress' &&
          (updatedStation.score || 0) === 0 &&
          (updatedStation.current_step_index || 0) === 0 &&
          (updatedStation.progress_percent || 0) === 0 &&
          !updatedStation.last_scan_code;

        if (isIdleReset || isFreshTvDuelLaunch) {
          try {
            sessionStorage.removeItem(`zebra_match_${stationIdRef.current}`);
          } catch {}
          setCurrentMissionIndex(0);
          setCombo(0);
          setLastScannedCode(null);
          setLastScanStatus(null);
          setIsDiplomeOpen(false);
          validScansCountRef.current = 0;
          errorScansCountRef.current = 0;
          lastStepStartTimeRef.current = Date.now();
          setShiftSecondsRemaining(appConfigRef.current.shiftDurationSeconds || 180);
          setIsShiftTimerRunning(isFreshTvDuelLaunch);

          const pool = missionsRef.current || [];
          let preferredIdx: number | undefined = undefined;
          if (updatedStation.current_mission_title) {
            const foundIdx = pool.findIndex(
              (m) => m.title.toLowerCase() === updatedStation.current_mission_title.toLowerCase()
            );
            if (foundIdx !== -1) preferredIdx = foundIdx;
          }

          setMissions(
            getStationMissions(pool, stationIdRef.current, preferredIdx).map((m) => ({
              ...m,
              steps: m.steps.map((st) => ({ ...st, completed: false, scannedCount: 0 }))
            }))
          );
          setOperator((prev) => ({
            ...prev,
            score: 0,
            completedMissions: 0,
            accuracy: 100,
            name: updatedStation.team_name || `Duo ${updatedStation.client_guest}`
          }));

          if (isFreshTvDuelLaunch) {
            soundService.playSuccessJingle();
            showToast({
              title: '🚀 TOP DÉPART DUEL !',
              message: `Mission assignée : ${updatedStation.current_mission_title}`,
              type: 'success',
              duration: 4000
            });
          }
        }
      }
    });

    // Subscribe to live hazards & unannounced emergencies
    const unsubHazards = subscribeToLiveHazards((hazard) => {
      const isForMe = hazard.target_station_id === 'all' || hazard.target_station_id === stationIdRef.current;
      if (!isForMe) return;

      if (hazard.status === 'active') {
        setActiveHazard(hazard);
        setHazardSecondsRemaining(hazard.time_limit_seconds || 45);
        soundService.playEmergencyAlarm();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate([250, 100, 250, 100, 400]);
          } catch {}
        }
        showToast({
          title: '🚨 ALÉA DÉCLENCHÉ EN DIRECT !',
          message: `${hazard.title} (+${hazard.points_bonus} pts)`,
          type: 'hazard',
          duration: 5000
        });
        broadcastScan({
          station_name: stationNameRef.current,
          operator_name: `${clientGuestRef.current} (avec ${operatorCeaRef.current})`,
          barcode: hazard.expected_barcode,
          action_type: 'HAZARD_TRIGGERED',
          message: `🚨 ALÉA EN COURS : ${hazard.title}`,
          status: 'warning'
        }).catch(() => {});
      } else if (hazard.status === 'resolved' || hazard.status === 'expired') {
        setActiveHazard((curr) => (curr?.id === hazard.id ? null : curr));
      }
    });

    // Subscribe to instant local inter-tab bus (0ms)
    const unsubLocal = subscribeToLocalRealtime((msg) => {
      if (msg.type === 'INVENTORY_UPDATED' && Array.isArray(msg.payload)) {
        setInventory(msg.payload);
      } else if (msg.type === 'LOCATIONS_UPDATED' && Array.isArray(msg.payload)) {
        setLocations(msg.payload);
        setAppConfig((prev) => ({ ...prev, locations: msg.payload }));
      } else if (msg.type === 'MISSIONS_UPDATED' && Array.isArray(msg.payload)) {
        setMissions(msg.payload);
      } else if (msg.type === 'CONFIG_UPDATED' && msg.payload) {
        setAppConfig((prev) => ({ ...prev, ...msg.payload }));
      } else if (msg.type === 'STATIONS_UPDATED' && Array.isArray(msg.payload)) {
        setLiveStations(msg.payload);
      }
    });

    // Auto-resync Supabase data when Wi-Fi reconnects or Zebra screen wakes up
    const handleResyncOnReconnect = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      try {
        const [freshStations, freshInv, pendingHazard] = await Promise.all([
          getStationsLive(),
          fetchInventory(),
          fetchActiveHazardForStation(stationIdRef.current)
        ]);
        if (freshStations.length > 0) setLiveStations(freshStations);
        if (freshInv.length > 0) setInventory(freshInv);
        if (pendingHazard && activeHazardRef.current?.id !== pendingHazard.id) {
          setActiveHazard(pendingHazard);
          setHazardSecondsRemaining(pendingHazard.time_limit_seconds || 45);
        }
      } catch {}
    };
    window.addEventListener('online', handleResyncOnReconnect);
    document.addEventListener('visibilitychange', handleResyncOnReconnect);

    return () => {
      unsubConfig();
      unsubLocations();
      unsubInventory();
      unsubMissions();
      unsubDistractions();
      unsubStations();
      unsubHazards();
      unsubLocal();
      window.removeEventListener('online', handleResyncOnReconnect);
      document.removeEventListener('visibilitychange', handleResyncOnReconnect);
    };
  }, []);

  // Persist active match progress in sessionStorage to survive accidental Zebra refresh
  useEffect(() => {
    if (isDbLoading) return;
    try {
      const stepProgress: Record<string, { completed: boolean; scannedCount: number }> = {};
      missions.forEach((m) => {
        m.steps.forEach((st) => {
          if (st.completed || (st.scannedCount || 0) > 0) {
            stepProgress[st.id] = { completed: st.completed, scannedCount: st.scannedCount || 0 };
          }
        });
      });
      sessionStorage.setItem(
        `zebra_match_${stationId}`,
        JSON.stringify({
          score: operator.score,
          completedMissions: operator.completedMissions,
          accuracy: operator.accuracy,
          combo,
          currentMissionIndex,
          shiftSecondsRemaining,
          stepProgress
        })
      );
    } catch {}
  }, [isDbLoading, stationId, operator.score, operator.completedMissions, operator.accuracy, combo, currentMissionIndex, shiftSecondsRemaining, missions]);

  // Hazard countdown timer
  useEffect(() => {
    if (!activeHazard) return;

    const timer = setInterval(() => {
      setHazardSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (activeHazardRef.current) {
            expireLiveHazard(activeHazardRef.current.id).catch(() => {});
            soundService.playErrorBuzz();
            setCombo(0);
            broadcastScan({
              station_name: stationNameRef.current,
              operator_name: `${clientGuestRef.current} (avec ${operatorCeaRef.current})`,
              barcode: activeHazardRef.current.expected_barcode,
              action_type: 'HAZARD_EXPIRED',
              message: `⏰ Aléa expiré ! (${activeHazardRef.current.title})`,
              status: 'invalid'
            }).catch(() => {});
          }
          setActiveHazard(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeHazard]);

  // Handler to trigger sudden unplanned client order
  const handleTriggerSurpriseOrder = async () => {
    const clients = appConfig.clientsCatalog && appConfig.clientsCatalog.length > 0
      ? appConfig.clientsCatalog
      : [appConfig.eventTitle || 'Client Urgent'];
    const randomClient = clients[Math.floor(Math.random() * clients.length)];
    if (inventory.length === 0) {
      showToast({
        title: 'Stock vide',
        message: 'Ajoutez au moins un article dans l\'ERP ou l\'Admin pour déclencher une commande urgente.',
        type: 'warning'
      });
      return;
    }
    const randomItem = inventory[Math.floor(Math.random() * inventory.length)];

    await triggerLiveHazard({
      target_station_id: stationIdRef.current,
      title: `🚨 COMMANDE CLIENT URGENTE : ${randomClient}`,
      message: `ENLÈVEMENT IMMÉDIAT : Scanner l'article ${randomItem.name} (${randomItem.sku}) !`,
      expected_barcode: randomItem.sku,
      time_limit_seconds: 60,
      points_bonus: 750,
      status: 'active'
    });
  };

  // Shift Timer Countdown (ne décrémente que lorsqu'un match/shift est actif)
  useEffect(() => {
    if (!isShiftTimerRunning) return;
    const timer = setInterval(() => {
      setShiftSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isShiftTimerRunning]);

  // Open Diploma at the end of the shift (3 minutes) if the team was active and scored
  useEffect(() => {
    if (shiftSecondsRemaining === 0 && operator.score > 0 && !isDiplomeOpen) {
      soundService.playMissionComplete();
      showToast({
        title: '🏁 FIN DU QUART DE TRAVAIL (3 MIN) !',
        message: `Félicitations au binôme pour les commandes expédiées !`,
        type: 'success',
        duration: 5000
      });
      setIsDiplomeOpen(true);
    }
  }, [shiftSecondsRemaining, operator.score, isDiplomeOpen]);

  // Flash reset helper
  const triggerFlash = (color: 'green' | 'red') => {
    setFlashState(color);
    setTimeout(() => setFlashState(null), 400);
  };

  // Hash Routing Listener (for multi-screen / multi-window setup)
  useEffect(() => {
    const handleHashChange = () => {
      const route = parseInitialRoute();
      setCurrentView(route.view);
      if (route.stationId && route.stationName) {
        setStationId(route.stationId);
        setStationName(route.stationName);
        stationIdRef.current = route.stationId;
        stationNameRef.current = route.stationName;
        const pool = missionsRef.current || [];
        setMissions(getStationMissions(pool, route.stationId));
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSelectView = (view: ViewMode) => {
    setCurrentView(view);
    if (view === 'home') window.location.hash = '';
    else if (view === 'arena') window.location.hash = 'tv';
    else if (view === 'admin') window.location.hash = 'admin';
    else if (view === 'podium') window.location.hash = 'podium';
    else if (view === 'erp') window.location.hash = 'erp';
    else if (view === 'print') window.location.hash = 'print';
    else if (view === 'kiosk') window.location.hash = stationId;
  };

  // Station Select Handler
  const handleSelectStation = (id: string, name: string) => {
    setStationId(id);
    setStationName(name);
    const activeMissionsPool = missionsRef.current || [];
    setMissions(getStationMissions(activeMissionsPool, id));
    localStorage.setItem('cea_station_id', id);
    localStorage.setItem('cea_station_name', name);
    if (currentView === 'kiosk') {
      window.location.hash = id;
    }
  };

  // Duo Update Handler
  const handleUpdateDuo = (cea: string, client: string) => {
    setOperatorCea(cea);
    setClientGuest(client);
    localStorage.setItem('gt_collab_name', cea);
    localStorage.setItem('gt_guest_name', client);
    setOperator((prev) => ({
      ...prev,
      name: `Duo ${client}`,
      companyOrRole: `GT Logistics (avec ${cea})`
    }));

    updateStationLive({
      station_id: stationIdRef.current,
      station_name: stationNameRef.current,
      operator_cea: cea,
      client_guest: client,
      team_name: `Duo ${client}`
    });

    showToast({
      title: 'Binôme Enregistré',
      message: `${client} & ${cea}`,
      type: 'success'
    });
  };

  // Advance to next mission or trigger fresh wave of orders
  const advanceToNextMission = useCallback(() => {
    const activeIdx = currentMissionIndexRef.current;
    const currentMissions = missionsRef.current || missions;
    const nextIdx = activeIdx + 1;

    if (nextIdx < currentMissions.length) {
      setCurrentMissionIndex(nextIdx);
      lastStepStartTimeRef.current = Date.now();
      const nextMission = currentMissions[nextIdx];
      updateStationLive({
        station_id: stationIdRef.current,
        station_name: stationNameRef.current,
        operator_cea: operatorCeaRef.current,
        client_guest: clientGuestRef.current,
        team_name: `Duo ${clientGuestRef.current}`,
        current_mission_title: nextMission.title,
        progress_percent: 0,
        current_step_index: 0,
        total_steps: nextMission.steps.length,
        status: 'in_progress'
      });
      showToast({
        title: `📦 COMMANDE SUIVANTE : ${nextMission.title}`,
        message: 'Prenez connaissance de la consigne et préparez les pièces !',
        type: 'info'
      });
    } else {
      // Loop a fresh wave of missions with all steps refreshed, keeping accumulated score!
      setMissions((prev) =>
        prev.map((m) => ({
          ...m,
          steps: m.steps.map((st) => ({ ...st, completed: false, scannedCount: 0 }))
        }))
      );
      setCurrentMissionIndex(0);
      const firstMission = currentMissions[0];
      updateStationLive({
        station_id: stationIdRef.current,
        station_name: stationNameRef.current,
        operator_cea: operatorCeaRef.current,
        client_guest: clientGuestRef.current,
        team_name: `Duo ${clientGuestRef.current}`,
        current_mission_title: firstMission.title,
        progress_percent: 0,
        current_step_index: 0,
        total_steps: firstMission.steps.length,
        status: 'in_progress'
      });
      showToast({
        title: '⚡ NOUVELLE VAGUE DE COMMANDES DÉCLENCHÉE !',
        message: 'Bravo pour votre rapidité ! Continuez à engranger des points !',
        type: 'success'
      });
    }
  }, [missions]);

  // Handle barcode scanned by hardware douchette or simulated button
  const handleBarcodeScanned = useCallback((code: string) => {
    const cleanedCode = code.trim();
    if (!cleanedCode) return;

    const now = Date.now();
    const normCode = normalizeBarcode(cleanedCode);
    const prevScan = lastProcessedScanRef.current;

    // 1. Protection matérielle anti-double-déclenchement Zebra (< 250ms sur le même code)
    if (prevScan.code === normCode && now - prevScan.time < 250) {
      return;
    }

    // 2. Protection anti-rebond de gâchette (< 800ms sur un code qui vient juste de valider l'étape précédente
    //    et qui n'est PAS le code attendu par la nouvelle étape active)
    if (prevScan.wasValid && prevScan.code === normCode && now - prevScan.time < 800) {
      const curMission = missionsRef.current[currentMissionIndexRef.current];
      const curStep = curMission?.steps.find((s) => !s.completed);
      if (curStep && !isBarcodeMatching(cleanedCode, curStep.expectedBarcode, curStep.lrCode)) {
        return;
      }
    }

    // Démarre le chrono du shift automatiquement dès le premier scan actif
    setIsShiftTimerRunning(true);
    setLastScannedCode(cleanedCode);
    soundService.playScanBeep();

    const timestamp = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // ========================================================
    // EASTER EGG : LE TICKET D'OR (Code configurable dans app_config)
    // ========================================================
    const configuredGoldenCode = appConfigRef.current.goldenTicketBarcode || 'ART-GT25-VIP';
    const isGoldenTicketScan = isBarcodeMatching(cleanedCode, configuredGoldenCode, 'GT_25ANS', ['GT-25-ANS', 'GT25ANS']);

    if (isGoldenTicketScan) {
      lastProcessedScanRef.current = { code: normCode, time: now, wasValid: true };
      setLastScanStatus('valid');
      triggerFlash('green');
      const bonusGolden = 2500;
      setOperator((prev) => ({
        ...prev,
        score: prev.score + bonusGolden
      }));

      setHasFoundGoldenTicket(true);
      setIsGoldenTicketOpen(true);

      showToast({
        title: '🎟️ TICKET D\'OR 25 ANS DÉCOUVERT (+2 500 PTS) !',
        message: 'Incroyable trouvaille en rayon ! Vous avez déniché l\'Archive Secrète !',
        type: 'success',
        duration: 9000
      });

      broadcastScan({
        station_name: stationNameRef.current,
        operator_name: `${clientGuestRef.current} (avec ${operatorCeaRef.current})`,
        barcode: configuredGoldenCode,
        action_type: 'GOLDEN_TICKET',
        message: `🎟️ TICKET D'OR 25 ANS ! ${clientGuestRef.current} a déniché le Ticket d'Or (+2 500 pts) !`,
        status: 'valid'
      }).catch(() => {});

      setLogs((prev) => [
        {
          id: generateUniqueLogId(),
          timestamp,
          barcode: cleanedCode,
          status: 'valid',
          message: `🎟️ TICKET D'OR 25 ANS : Archive Historique découverte en rayon ! (+2 500 pts Bonus)`
        },
        ...prev
      ]);
      return;
    }

    // 0. PRIORITY CHECK: Is there an ongoing active Hazard / Distraction?
    if (activeHazardRef.current) {
      const currentHazard = activeHazardRef.current;
      if (isBarcodeMatching(cleanedCode, currentHazard.expected_barcode)) {
        // HAZARD RESOLVED!
        lastProcessedScanRef.current = { code: normCode, time: now, wasValid: true };
        setLastScanStatus('valid');
        triggerFlash('green');
        soundService.playHazardSuccess();
        const bonusPoints = currentHazard.points_bonus || 600;
        const newCombo = comboRef.current + 2;
        setCombo(newCombo);

        validScansCountRef.current += 1;
        const totalScansH = validScansCountRef.current + errorScansCountRef.current;
        const accH = Math.max(50, Math.round((validScansCountRef.current / totalScansH) * 100));

        setOperator((prev) => {
          const nextScore = prev.score + bonusPoints;
          updateStationLive({
            station_id: stationIdRef.current,
            score: nextScore,
            combo: newCombo,
            last_scan_code: cleanedCode,
            last_scan_status: 'valid'
          });
          return {
            ...prev,
            score: nextScore,
            accuracy: accH
          };
        });

        resolveLiveHazard(currentHazard.id).catch(() => {});
        setActiveHazard(null);

        broadcastScan({
          station_name: stationNameRef.current,
          operator_name: `${clientGuestRef.current} (avec ${operatorCeaRef.current})`,
          barcode: cleanedCode,
          action_type: 'HAZARD_RESOLVED',
          message: `⚡ ALÉA RÉSOLU : ${currentHazard.title} (+${bonusPoints} pts)`,
          status: 'valid'
        }).catch(() => {});

        setLogs((prev) => [
          {
            id: generateUniqueLogId(),
            timestamp,
            barcode: cleanedCode,
            status: 'valid',
            message: `⚡ ALÉA RÉSOLU : ${currentHazard.title} (+${bonusPoints} pts !)`
          },
          ...prev
        ]);
        return;
      } else {
        // MISMATCH during hazard
        lastProcessedScanRef.current = { code: normCode, time: now, wasValid: false };
        setLastScanStatus('invalid');
        triggerFlash('red');
        soundService.playErrorBuzz();
        setCombo(0);

        errorScansCountRef.current += 1;
        const totalScansH = validScansCountRef.current + errorScansCountRef.current;
        const accH = Math.max(40, Math.round((validScansCountRef.current / totalScansH) * 100));
        setOperator((prev) => ({ ...prev, accuracy: accH }));

        updateStationLive({
          station_id: stationIdRef.current,
          combo: 0,
          last_scan_code: cleanedCode,
          last_scan_status: 'invalid'
        });

        broadcastScan({
          station_name: stationNameRef.current,
          operator_name: `${clientGuestRef.current} (avec ${operatorCeaRef.current})`,
          barcode: cleanedCode,
          action_type: 'HAZARD_MISMATCH',
          message: `✗ Erreur scan aléa (${cleanedCode})`,
          status: 'invalid'
        }).catch(() => {});

        setLogs((prev) => [
          {
            id: generateUniqueLogId(),
            timestamp,
            barcode: cleanedCode,
            status: 'invalid',
            message: `✗ ALÉA PRIORITAIRE ! Code physique attendu : ${currentHazard.expected_barcode}`
          },
          ...prev
        ]);
        return;
      }
    }

    const activeIndex = currentMissionIndexRef.current;
    const currentMissions = missionsRef.current;
    const activeMission = currentMissions[activeIndex];
    if (!activeMission || !activeMission.steps || activeMission.steps.length === 0) {
      showToast({
        title: 'Aucune mission active',
        message: 'Créez ou activez une mission dans l\'Admin pour démarrer les scans.',
        type: 'warning'
      });
      return;
    }
    const activeStepIndex = activeMission.steps.findIndex((s) => !s.completed);

    if (activeStepIndex === -1) {
      setLogs((prev) => [
        {
          id: generateUniqueLogId(),
          timestamp,
          barcode: cleanedCode,
          status: 'valid',
          message: 'Mission déjà achevée ! Sélectionnez une autre mission.'
        },
        ...prev
      ]);
      return;
    }

    const activeStep = activeMission.steps[activeStepIndex];

    // Helper to resolve aliases from DB (wms_inventory & wms_locations) for a given expectedBarcode
    const getDbAliasesForStep = (expectedCode: string): string[] => {
      const inv = inventoryRef.current.find((it) => normalizeBarcode(it.sku) === normalizeBarcode(expectedCode));
      if (inv) return [...(inv.aliases || []), ...(inv.lrCode ? [inv.lrCode] : [])];
      const loc = locationsRef.current.find((l) => normalizeBarcode(l.barcode) === normalizeBarcode(expectedCode));
      if (loc) return [...(loc.aliases || []), ...(loc.lrCode ? [loc.lrCode] : [])];
      return [];
    };

    // Check direct match on active step, or flexible match on any remaining step of this mission
    let targetStepIndex = activeStepIndex;
    let isMatch = isBarcodeMatching(
      cleanedCode,
      activeStep.expectedBarcode,
      activeStep.lrCode,
      getDbAliasesForStep(activeStep.expectedBarcode)
    );

    if (!isMatch) {
      // Find if another uncompleted step of this mission matches the scanned code
      const altStepIndex = activeMission.steps.findIndex(
        (s, idx) =>
          !s.completed &&
          idx !== activeStepIndex &&
          isBarcodeMatching(cleanedCode, s.expectedBarcode, s.lrCode, getDbAliasesForStep(s.expectedBarcode))
      );

      if (altStepIndex !== -1) {
        const altStep = activeMission.steps[altStepIndex];
        const isDeliveryStep = altStep.barcodeType === 'dock' || altStep.expectedBarcode.includes('LIVRAISON');
        const hasUncompletedArticles = activeMission.steps.some(
          (s, idx) => !s.completed && idx !== altStepIndex && s.barcodeType === 'article'
        );

        if (isDeliveryStep && hasUncompletedArticles) {
          triggerFlash('red');
          soundService.playErrorBuzz();
          showToast({
            title: '📦 Étagère de Livraison Détectée',
            message: 'Prélevez d\'abord les articles de la commande avant de finaliser la livraison !',
            type: 'warning'
          });
          return;
        }

        targetStepIndex = altStepIndex;
        isMatch = true;
      }
    }

    const currentTargetStep = activeMission.steps[targetStepIndex];

    if (isMatch) {
      // MATCH! Valid scan
      lastProcessedScanRef.current = { code: normCode, time: now, wasValid: true };
      setLastScanStatus('valid');
      triggerFlash('green');
      soundService.playSuccessChime();

      // Update Combo
      const newCombo = comboRef.current + 1;
      setCombo(newCombo);

      // Multi-quantity progression
      const requiredQty = currentTargetStep.quantity && currentTargetStep.quantity > 1 ? currentTargetStep.quantity : 1;
      const currentScanned = (currentTargetStep.scannedCount || 0) + 1;
      const isStepCompleted = currentScanned >= requiredQty;

      // Update step status
      const updatedSteps = [...activeMission.steps];
      updatedSteps[targetStepIndex] = { 
        ...currentTargetStep, 
        scannedCount: currentScanned,
        completed: isStepCompleted 
      };

      const updatedMission = { ...activeMission, steps: updatedSteps };
      const updatedMissions = [...currentMissions];
      updatedMissions[activeIndex] = updatedMission;
      setMissions(updatedMissions);

      // Notification if multi-quantity is partially completed
      if (!isStepCompleted) {
        showToast({
          title: `Quantité validée : ${currentScanned} / ${requiredQty} pcs`,
          message: `Scannez la pièce restante pour compléter l'étape`,
          type: 'info'
        });
      }

      // Check if full mission completed
      const isMissionDone = updatedSteps.every((s) => s.completed);

      // 1. Prime de Cadence (Chrono-Bonus dynamique basé sur la rapidité)
      const elapsedSeconds = Math.max(1, Math.round((Date.now() - lastStepStartTimeRef.current) / 1000));
      let speedBonus = 0;
      let speedBadge = '';
      if (elapsedSeconds <= 6) {
        speedBonus = 100;
        speedBadge = '⚡ Scan Éclair (<6s)';
      } else if (elapsedSeconds <= 12) {
        speedBonus = 50;
        speedBadge = '⏱️ Cadence Fluide (<12s)';
      } else if (elapsedSeconds <= 20) {
        speedBonus = 20;
        speedBadge = '✓ Rythme Régulier';
      }

      // 2. Pondération industrielle selon la tâche (100 % pilotée par la BDD)
      const matchedInvItemForScoring = inventoryRef.current.find((item) =>
        isBarcodeMatching(cleanedCode, item.sku, item.lrCode, item.aliases)
      );
      let taskBasePoints = 150;
      if (currentTargetStep.barcodeType === 'location') {
        taskBasePoints = 100; // Repérage d'armoire / allée
      } else if (currentTargetStep.barcodeType === 'article') {
        const isCriticalPiece = Boolean(matchedInvItemForScoring?.critical);
        taskBasePoints = isCriticalPiece ? 250 : 180;
        if (requiredQty > 1) taskBasePoints += 50; // Bonus prélèvement multiple
      } else if (currentTargetStep.barcodeType === 'package') {
        taskBasePoints = 150; // Emballage / Colis
      } else if (currentTargetStep.barcodeType === 'dock') {
        taskBasePoints = 300; // Livraison finale sur quai client
      }

      // 3. Multiplicateur de Combo
      const comboBonus = newCombo * (appConfig.comboBonusPoints || 50);

      // 4. Prime de Clôture de Mission
      const missionCompletionBonus = isMissionDone ? (activeMission.basePoints || 1000) : 0;

      // Score cumulé intelligent
      const addedPoints = taskBasePoints + speedBonus + comboBonus + missionCompletionBonus;

      // Suivi de la précision industrielle
      validScansCountRef.current += 1;
      const totalScans = validScansCountRef.current + errorScansCountRef.current;
      const currentAccuracy = Math.max(50, Math.round((validScansCountRef.current / totalScans) * 100));

      // Réinitialiser le chrono pour l'étape suivante
      lastStepStartTimeRef.current = Date.now();

      if (!isMissionDone) {
        showToast({
          title: `+${addedPoints} pts ${speedBadge ? '• ' + speedBadge : ''}`,
          message: `${currentTargetStep.targetLabel} validé (Combo x${newCombo})`,
          type: 'success'
        });
      }

      setOperator((prev) => {
        const nextScore = prev.score + addedPoints;
        const nextMissions = isMissionDone ? prev.completedMissions + 1 : prev.completedMissions;

        // Auto-sync completed mission to Supabase (avec le vrai temps écoulé)
        if (isMissionDone) {
          const totalShiftSec = appConfigRef.current.shiftDurationSeconds || 180;
          const elapsedSec = Math.max(1, totalShiftSec - shiftSecondsRemainingRef.current);
          const mins = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
          const secs = (elapsedSec % 60).toString().padStart(2, '0');

          submitScore({
            name: `${clientGuestRef.current} (Duo avec ${operatorCeaRef.current})`,
            company: appConfigRef.current.eventTitle || 'GT Logistics',
            score: nextScore,
            time_spent: `${mins}:${secs}`,
            completed_missions: nextMissions,
            accuracy: currentAccuracy
          }).catch(() => {});
        }

        // Live Station progress update to Supabase
        const progressPct = Math.round(
          (updatedSteps.filter((s) => s.completed).length / updatedSteps.length) * 100
        );

        updateStationLive({
          station_id: stationIdRef.current,
          station_name: stationNameRef.current,
          operator_cea: operatorCeaRef.current,
          client_guest: clientGuestRef.current,
          team_name: `Duo ${clientGuestRef.current}`,
          current_mission_title: activeMission.title,
          progress_percent: progressPct,
          current_step_index: targetStepIndex + 1,
          total_steps: updatedSteps.length,
          score: nextScore,
          combo: newCombo,
          status: isMissionDone ? 'completed' : 'in_progress',
          last_scan_code: cleanedCode,
          last_scan_status: 'valid'
        });

        return {
          ...prev,
          score: nextScore,
          completedMissions: nextMissions,
          accuracy: currentAccuracy
        };
      });

      // Broadcast scan activity to Supabase Realtime
      broadcastScan({
        station_name: stationNameRef.current,
        operator_name: `${clientGuestRef.current} (avec ${operatorCeaRef.current})`,
        barcode: cleanedCode,
        action_type: 'VALID_SCAN',
        message: `✓ Étape ${targetStepIndex + 1} : ${currentTargetStep.targetLabel} (+${addedPoints} pts)`,
        status: 'valid'
      }).catch(() => {});

      if (isMissionDone) {
        soundService.playMissionComplete();
        const hasNextMission = activeIndex + 1 < currentMissions.length;

        if (hasNextMission) {
          showToast({
            title: `🎉 COMMANDE EXPÉDIÉE ! (+${activeMission.basePoints} pts)`,
            message: `Bravo au binôme ! Préparation de la commande suivante...`,
            type: 'success',
            duration: 4000
          });

          // Transition to next mission after celebration
          setTimeout(() => {
            advanceToNextMission();
          }, 2500);
        } else {
          // ALL MISSIONS COMPLETED!
          showToast({
            title: '🏆 TOUTES LES MISSIONS ACCOMPLIES !',
            message: `Performance légendaire ! Vous pouvez consulter votre diplôme ou lancer une nouvelle vague !`,
            type: 'success',
            duration: 5000
          });
          setTimeout(() => {
            setIsDiplomeOpen(true);
          }, 1500);
        }
      }

      // Live ERP Stock Update (Boucle physique atomique Bac <-> Table dans Supabase wms_inventory)
      const matchedInvItem = inventoryRef.current.find(
        (item) => isBarcodeMatching(cleanedCode, item.sku, item.lrCode, item.aliases)
      );

      if (matchedInvItem && currentTargetStep.barcodeType === 'article') {
        const direction = activeMission.stockDirection || 'out';
        if (direction === 'out' || direction === 'in') {
          setInventory((prevInv) => {
            const nextInv = prevInv.map((item) => {
              if (item.id !== matchedInvItem.id) return item;
              if (direction === 'out') {
                return {
                  ...item,
                  quantity: Math.max(0, item.quantity - 1),
                  onTableQty: (item.onTableQty || 0) + 1
                };
              }
              return {
                ...item,
                quantity: item.quantity + 1,
                onTableQty: Math.max(0, (item.onTableQty || 0) - 1)
              };
            });
            broadcastLocalRealtime('INVENTORY_UPDATED', nextInv);
            return nextInv;
          });
          moveStockLoop(matchedInvItem.id, direction).catch(() => {});
          showToast({
            title:
              direction === 'out'
                ? `📤 Livraison : Bac (-1) → Table (+1)`
                : `📥 Collecte : Table (-1) → Bac (+1)`,
            message: `${matchedInvItem.name} synchronisé en temps réel`,
            type: direction === 'out' ? 'info' : 'success'
          });
        }
      } else if (currentTargetStep.barcodeType === 'dock') {
        showToast({
          title: 'Expédition Quai Validée',
          message: `${currentTargetStep.targetLabel} validé en temps réel.`,
          type: 'success'
        });
      }

      setLogs((prev) => [
        {
          id: generateUniqueLogId(),
          timestamp,
          barcode: cleanedCode,
          status: 'valid',
          message: `✓ Étape ${targetStepIndex + 1} validée : ${currentTargetStep.targetLabel} (Combo x${newCombo})`
        },
        ...prev
      ]);
    } else {
      // MISMATCH! Invalid scan
      lastProcessedScanRef.current = { code: normCode, time: now, wasValid: false };
      setLastScanStatus('invalid');
      triggerFlash('red');
      soundService.playErrorBuzz();
      setCombo(0);

      errorScansCountRef.current += 1;
      const totalScans = validScansCountRef.current + errorScansCountRef.current;
      const currentAccuracy = Math.max(40, Math.round((validScansCountRef.current / totalScans) * 100));

      const PENALTY = 50; // -50 pts pénalité de non-conformité industrielle

      setOperator((prev) => {
        const nextScore = Math.max(0, prev.score - PENALTY);

        updateStationLive({
          station_id: stationIdRef.current,
          combo: 0,
          score: nextScore,
          last_scan_code: cleanedCode,
          last_scan_status: 'invalid'
        });

        return {
          ...prev,
          score: nextScore,
          accuracy: currentAccuracy
        };
      });

      showToast({
        title: '⚠️ Non-Conformité CEA (-50 pts)',
        message: `Code [${cleanedCode}] erroné ! Multiplicateur combo réinitialisé.`,
        type: 'error'
      });

      broadcastScan({
        station_name: stationNameRef.current,
        operator_name: `${clientGuestRef.current} (avec ${operatorCeaRef.current})`,
        barcode: cleanedCode,
        action_type: 'INVALID_SCAN',
        message: `✗ Erreur scan [${cleanedCode}] (-50 pts)`,
        status: 'invalid'
      }).catch(() => {});

      setLogs((prev) => [
        {
          id: generateUniqueLogId(),
          timestamp,
          barcode: cleanedCode,
          status: 'invalid',
          message: `✗ Non-conformité (-50 pts) ! Attendu : ${activeStep.expectedBarcode}`
        },
        ...prev
      ]);
    }
  }, [inventory]);

  // Déclaration d'Écart de Stock Réel / Rupture Partielle par le Duo
  const handleDeclareStockAnomaly = (realQty: number) => {
    const activeIndex = currentMissionIndexRef.current;
    const currentMissions = missionsRef.current;
    const activeMission = currentMissions[activeIndex];
    if (!activeMission || !activeMission.steps || activeMission.steps.length === 0) {
      showToast({
        title: 'Aucune mission active',
        message: 'Créez ou activez une mission dans l\'Admin pour démarrer les scans.',
        type: 'warning'
      });
      return;
    }
    const activeStepIndex = activeMission.steps.findIndex((s) => !s.completed);
    if (activeStepIndex === -1) return;

    const activeStep = activeMission.steps[activeStepIndex];
    const matchedItem = inventory.find(
      (i) => i.sku.toUpperCase() === activeStep.expectedBarcode.toUpperCase()
    );

    // 1. Marquer l'étape validée avec la quantité réelle constatée
    const updatedSteps = [...activeMission.steps];
    updatedSteps[activeStepIndex] = {
      ...activeStep,
      scannedCount: realQty,
      completed: true,
      hint: `⚠️ Écart déclaré : ${realQty} pc(s) trouvée(s) (attendu : ${activeStep.quantity || 1})`
    };

    const updatedMission = { ...activeMission, steps: updatedSteps };
    const updatedMissions = [...currentMissions];
    updatedMissions[activeIndex] = updatedMission;
    setMissions(updatedMissions);

    // 2. Ajuster l'ERP au stock physique réel (mise à jour directe de la ligne en BDD)
    if (matchedItem) {
      const nextInv = inventory.map((item) =>
        item.id === matchedItem.id ? { ...item, quantity: Math.max(0, realQty) } : item
      );
      setInventory(nextInv);
      broadcastLocalRealtime('INVENTORY_UPDATED', nextInv);
      setInventoryItemQuantity(matchedItem.id, Math.max(0, realQty)).catch(() => {});
    }

    // 3. Attribuer le Bonus Vigilance Logistique (+400 pts)
    const bonusPoints = 400;
    setOperator((prev) => ({
      ...prev,
      score: prev.score + bonusPoints
    }));

    soundService.playSuccessChime();
    showToast({
      title: 'Écart de Stock Enregistré (+400 pts Bonus)',
      message: `Stock ERP ajusté à ${realQty} pc(s). Alerte transmise au gestionnaire.`,
      type: 'warning'
    });

    broadcastScan({
      station_name: stationNameRef.current,
      operator_name: `${clientGuestRef.current} (avec ${operatorCeaRef.current})`,
      barcode: activeStep.expectedBarcode,
      action_type: 'ANOMALY_DECLARED',
      message: `⚠️ ÉCART DE STOCK DÉCLARÉ : ${activeStep.targetLabel} (${realQty} en stock réel au lieu de ${activeStep.quantity || 1}) - Bonus Vigilance +400 pts`,
      status: 'valid'
    }).catch(() => {});
  };

  // Subscribe to global hardware barcode scanner
  useEffect(() => {
    const unsubscribe = barcodeListener.subscribe(handleBarcodeScanned);
    return () => unsubscribe();
  }, [handleBarcodeScanned]);

  // Sound toggle
  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    soundService.setSoundEnabled(nextState);
    if (nextState) {
      soundService.playScanBeep();
    }
  };

  // Manual stock update in ERP view (atomique dans wms_inventory)
  const handleUpdateQuantity = async (id: string, delta: number) => {
    const updated = inventory.map((item) =>
      item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
    );
    setInventory(updated);
    broadcastLocalRealtime('INVENTORY_UPDATED', updated);
    try {
      await adjustInventoryQuantity(id, delta);
    } catch (e) {
      console.warn('Failed to adjust quantity in Supabase:', e);
    }
  };

  // Full stock update (from ERP or Admin) -> table wms_inventory
  const handleUpdateInventory = async (newInv: InventoryItem[]) => {
    setInventory(newInv);
    broadcastLocalRealtime('INVENTORY_UPDATED', newInv);
    try {
      await syncInventory(newInv);
    } catch (e) {
      console.warn('Failed to sync inventory to Supabase:', e);
    }
  };

  // Full locations update -> table wms_locations
  const handleUpdateLocations = async (newLocs: WarehouseLocation[]) => {
    setLocations(newLocs);
    setAppConfig((prev) => ({ ...prev, locations: newLocs }));
    broadcastLocalRealtime('LOCATIONS_UPDATED', newLocs);
    try {
      await syncLocations(newLocs);
    } catch (e) {
      console.warn('Failed to sync locations to Supabase:', e);
    }
  };

  // Full missions update -> table wms_missions
  const handleUpdateMissions = async (newMissions: Mission[]) => {
    setMissions(newMissions);
    broadcastLocalRealtime('MISSIONS_UPDATED', newMissions);
    try {
      await syncMissions(newMissions);
    } catch (e) {
      console.warn('Failed to sync missions to Supabase:', e);
    }
  };

  // Full app config update -> table app_config (paramètres globaux uniquement)
  const handleUpdateAppConfig = async (newConfig: AppConfig) => {
    setAppConfig({ ...newConfig, locations });
    broadcastLocalRealtime('CONFIG_UPDATED', newConfig);
    try {
      const { locations: _ignored, ...storedCfg } = newConfig;
      await saveAppConfig(storedCfg);
    } catch (e) {
      console.warn('Failed to save app config to Supabase:', e);
    }
  };

  // Reset current mission
  const handleResetMission = () => {
    setMissions((prev) => {
      const updated = [...prev];
      const m = updated[currentMissionIndex];
      updated[currentMissionIndex] = {
        ...m,
        steps: m.steps.map((st) => ({ ...st, completed: false }))
      };
      return updated;
    });
    setCombo(0);
    soundService.playScanBeep();

    updateStationLive({
      station_id: stationIdRef.current,
      progress_percent: 0,
      current_step_index: 0,
      combo: 0,
      status: 'in_progress'
    });
  };

  // Start new shift / match with shuffled randomized missions
  const handleStartNewShift = () => {
    try {
      sessionStorage.removeItem(`zebra_match_${stationIdRef.current}`);
    } catch {}
    setMissions((prev) => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled.map((m) => ({
        ...m,
        steps: m.steps.map((st) => ({ ...st, completed: false, scannedCount: 0 }))
      }));
    });
    setCurrentMissionIndex(0);
    setShiftSecondsRemaining(appConfig.shiftDurationSeconds || 180);
    setIsShiftTimerRunning(true);
    setLastScannedCode(null);
    setLastScanStatus(null);
    setIsDiplomeOpen(false);
    setCombo(0);
    validScansCountRef.current = 0;
    errorScansCountRef.current = 0;
    lastStepStartTimeRef.current = Date.now();
    setOperator((prev) => ({
      ...prev,
      score: 0,
      completedMissions: 0,
      accuracy: 100,
      name: `Duo ${clientGuest}`,
      companyOrRole: `${appConfig.eventTitle || 'GT Logistics'} • ${operatorCea}`
    }));
    setLogs([]);
    // Ne jamais expulser la Zebra du mode #play !
    if (currentView !== 'play') {
      setCurrentView('kiosk');
    }
    soundService.playSuccessChime();

    updateStationLive({
      station_id: stationIdRef.current,
      progress_percent: 0,
      current_step_index: 0,
      score: 0,
      combo: 0,
      status: 'idle',
      last_scan_code: null,
      last_scan_status: null
    });
  };

  // Enchaînement direct du prochain Duo depuis la Zebra (sans quitter le mode #play)
  const handleZebraStartNextDuo = (nextCea: string, nextGuest: string, preferredMissionIdx: number = 0) => {
    try {
      sessionStorage.removeItem(`zebra_match_${stationIdRef.current}`);
    } catch {}

    setOperatorCea(nextCea);
    setClientGuest(nextGuest);
    localStorage.setItem('gt_collab_name', nextCea);
    localStorage.setItem('gt_guest_name', nextGuest);

    const pool = missionsRef.current || [];
    const ordered = getStationMissions(pool, stationIdRef.current, preferredMissionIdx).map((m) => ({
      ...m,
      steps: m.steps.map((st) => ({ ...st, completed: false, scannedCount: 0 }))
    }));

    setMissions(ordered);
    setCurrentMissionIndex(0);
    setShiftSecondsRemaining(appConfigRef.current.shiftDurationSeconds || 180);
    setIsShiftTimerRunning(true);
    setLastScannedCode(null);
    setLastScanStatus(null);
    setIsDiplomeOpen(false);
    setCombo(0);
    validScansCountRef.current = 0;
    errorScansCountRef.current = 0;
    lastStepStartTimeRef.current = Date.now();
    setLogs([]);

    setOperator({
      name: `Duo ${nextGuest}`,
      companyOrRole: `${appConfigRef.current.eventTitle || 'GT Logistics'} • ${nextCea}`,
      score: 0,
      completedMissions: 0,
      accuracy: 100,
      shiftDurationSeconds: appConfigRef.current.shiftDurationSeconds || 180
    });

    updateStationLive({
      station_id: stationIdRef.current,
      station_name: stationNameRef.current,
      operator_cea: nextCea,
      client_guest: nextGuest,
      team_name: `Duo ${nextGuest}`,
      current_mission_title: ordered[0]?.title || 'En attente...',
      progress_percent: 0,
      current_step_index: 0,
      total_steps: ordered[0]?.steps?.length || 0,
      score: 0,
      combo: 0,
      status: 'in_progress',
      last_scan_code: null,
      last_scan_status: null
    });

    soundService.playSuccessJingle();
    showToast({
      title: `🚀 Nouveau Duo prêt : ${nextGuest}`,
      message: `Avec ${nextCea} — Vous pouvez scanner la 1re étiquette !`,
      type: 'success'
    });
  };

  // Remettre la Zebra en attente du Top Départ TV (idle)
  const handleZebraSetWaitingForTv = () => {
    try {
      sessionStorage.removeItem(`zebra_match_${stationIdRef.current}`);
    } catch {}
    setCurrentMissionIndex(0);
    setShiftSecondsRemaining(appConfigRef.current.shiftDurationSeconds || 180);
    setIsShiftTimerRunning(false);
    setLastScannedCode(null);
    setLastScanStatus(null);
    setIsDiplomeOpen(false);
    setCombo(0);
    validScansCountRef.current = 0;
    errorScansCountRef.current = 0;
    setMissions((prev) =>
      prev.map((m) => ({
        ...m,
        steps: m.steps.map((st) => ({ ...st, completed: false, scannedCount: 0 }))
      }))
    );
    setOperator((prev) => ({
      ...prev,
      score: 0,
      completedMissions: 0,
      accuracy: 100
    }));

    updateStationLive({
      station_id: stationIdRef.current,
      station_name: stationNameRef.current,
      client_guest: 'En attente...',
      team_name: `${stationNameRef.current.split(' ')[0]} Prêt`,
      current_mission_title: 'En attente du Top Départ TV...',
      progress_percent: 0,
      current_step_index: 0,
      score: 0,
      combo: 0,
      status: 'idle',
      last_scan_code: null,
      last_scan_status: null
    });

    showToast({
      title: '📡 Poste en attente du Top Départ TV',
      message: 'Prêt à recevoir le prochain duel lancé depuis l\'Arène TV.',
      type: 'info'
    });
  };

  // Launch Live 2-Duo Duel from the Home Launcher
  const handleStartDuel = async (
    duo1: { cea: string; client: string },
    duo2: { cea: string; client: string },
    m1Index: number = 0,
    m2Index: number = 1
  ) => {
    const activeMissionsPool = missionsRef.current || [];
    const m1 = getStationMissions(activeMissionsPool, 'poste-1', m1Index);
    const m2 = getStationMissions(activeMissionsPool, 'poste-2', m2Index);

    // 1. Update Supabase live stations state
    await updateStationLive({
      station_id: 'poste-1',
      station_name: 'Poste 1 (Scannette A)',
      operator_cea: duo1.cea,
      client_guest: duo1.client,
      team_name: `Duo ${duo1.client}`,
      score: 0,
      combo: 0,
      progress_percent: 0,
      current_step_index: 0,
      total_steps: m1[0]?.steps?.length || 7,
      current_mission_title: m1[0]?.title || 'Préparation Commande',
      status: 'in_progress',
      last_scan_code: null,
      last_scan_status: null
    });

    await updateStationLive({
      station_id: 'poste-2',
      station_name: 'Poste 2 (Scannette B)',
      operator_cea: duo2.cea,
      client_guest: duo2.client,
      team_name: `Duo ${duo2.client}`,
      score: 0,
      combo: 0,
      progress_percent: 0,
      current_step_index: 0,
      total_steps: m2[0]?.steps?.length || 7,
      current_mission_title: m2[0]?.title || 'Collecte Client',
      status: 'in_progress',
      last_scan_code: null,
      last_scan_status: null
    });

    // 2. Local state initialization for this active machine
    const isP2 = stationId === 'poste-2';
    const activeDuo = isP2 ? duo2 : duo1;
    const activeMissionList = isP2 ? m2 : m1;
    setOperatorCea(activeDuo.cea);
    setClientGuest(activeDuo.client);
    setShiftSecondsRemaining(appConfig.shiftDurationSeconds || 180);
    setIsShiftTimerRunning(true);
    setLastScannedCode(null);
    setLastScanStatus(null);
    setCombo(0);
    setCurrentMissionIndex(0);
    setLogs([]);

    // Reset smart scoring counters
    validScansCountRef.current = 0;
    errorScansCountRef.current = 0;
    lastStepStartTimeRef.current = Date.now();

    // Reset all mission steps
    setMissions(
      activeMissionList.map((m) => ({
        ...m,
        steps: m.steps.map((st) => ({ ...st, completed: false, scannedCount: 0 }))
      }))
    );

    setCurrentView('kiosk');
    soundService.playSuccessJingle();
  };

  // Launch Solo / Practice run from Home Launcher
  const handleStartSolo = (
    targetStationId: string,
    targetStationName: string,
    duo: { cea: string; client: string },
    mIndex: number = 0
  ) => {
    handleSelectStation(targetStationId, targetStationName);
    setOperatorCea(duo.cea);
    setClientGuest(duo.client);
    setShiftSecondsRemaining(appConfig.shiftDurationSeconds || 180);
    setIsShiftTimerRunning(true);
    setLastScannedCode(null);
    setLastScanStatus(null);
    setCombo(0);
    setCurrentMissionIndex(0);
    setLogs([]);

    // Reset smart scoring counters
    validScansCountRef.current = 0;
    errorScansCountRef.current = 0;
    lastStepStartTimeRef.current = Date.now();

    const activeMissionsPool = missionsRef.current || [];
    const ordered = getStationMissions(activeMissionsPool, targetStationId, mIndex);

    setMissions(
      ordered.map((m) => ({
        ...m,
        steps: m.steps.map((st) => ({ ...st, completed: false, scannedCount: 0 }))
      }))
    );

    setOperator({
      name: `Duo ${duo.client}`,
      companyOrRole: `GT: ${duo.cea}`,
      score: 0,
      completedMissions: 0,
      accuracy: 100,
      shiftDurationSeconds: appConfig.shiftDurationSeconds || 180
    });

    updateStationLive({
      station_id: targetStationId,
      station_name: targetStationName,
      operator_cea: duo.cea,
      client_guest: duo.client,
      team_name: `Duo ${duo.client}`,
      score: 0,
      combo: 0,
      progress_percent: 0,
      current_step_index: 0,
      total_steps: 5,
      status: 'in_progress',
      current_mission_title: missions[0]?.title || 'Préparation Commande Multi-Articles'
    });

    setCurrentView('kiosk');
    soundService.playSuccessJingle();
  };

  const handleUpdateLogo = (logoUrl: string) => {
    const updated = { ...appConfig, customLogoUrl: logoUrl };
    handleUpdateAppConfig(updated);
  };

  if (isDbLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-4 font-sans">
        <div className="w-12 h-12 rounded-2xl border-4 border-sky-500/30 border-t-sky-400 animate-spin" />
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-widest text-sky-400">Connexion Supabase temps réel</p>
          <p className="text-xs text-slate-400 mt-1">Chargement du stock, des emplacements et des missions...</p>
        </div>
      </div>
    );
  }

  // DEDICATED HANDHELD ZEBRA PURE GAME MODE (NO HEADER, NO ADMIN/ERP TABS, LOCKED TO GAMEPLAY)
  if (currentView === 'play') {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
        <ZebraPlayView
          stationId={stationId}
          stationName={stationName}
          operatorCea={operatorCea}
          clientGuest={clientGuest}
          score={operator.score}
          combo={combo}
          accuracy={operator.accuracy}
          shiftSecondsRemaining={shiftSecondsRemaining}
          missions={missions}
          currentMissionIndex={currentMissionIndex}
          lastScannedCode={lastScannedCode}
          lastScanStatus={lastScanStatus}
          flashState={flashState}
          activeHazard={activeHazard}
          hazardSecondsRemaining={hazardSecondsRemaining}
          otherStations={liveStations}
          inventory={inventory}
          strictScanOnly={appConfig.strictScanOnly}
          onDeclareAnomaly={handleDeclareStockAnomaly}
          onBarcodeScanned={handleBarcodeScanned}
          onNextMission={advanceToNextMission}
          onRestartShift={handleStartNewShift}
          onStartNextDuo={handleZebraStartNextDuo}
          onSetWaitingForTv={handleZebraSetWaitingForTv}
          onOpenDiplome={() => setIsDiplomeOpen(true)}
        />
        {/* Celebration Diploma Modal */}
        <DiplomeModal
          isOpen={isDiplomeOpen}
          onClose={() => setIsDiplomeOpen(false)}
          operator={operator}
          collaboratorName={operatorCea}
          guestName={clientGuest}
          stationName={stationName}
          appConfig={appConfig}
          hasGoldenTicket={hasFoundGoldenTicket}
        />

        {/* Easter Egg Golden Ticket 25 Ans Modal (aussi actif sur les Zebra !) */}
        <GoldenTicketModal
          isOpen={isGoldenTicketOpen}
          duoName={`${clientGuest} (avec ${operatorCea})`}
          onClose={() => setIsGoldenTicketOpen(false)}
        />

        {/* Global Toast Notifications (aussi visibles sur les Zebra !) */}
        <ToastContainer />
      </div>
    );
  }

  // DEDICATED 55" ARENA TV BROADCAST (FULLSCREEN ESPORT / TV BROADCAST MODE WITHOUT WEB NAVBAR)
  if (currentView === 'arena') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <ArenaTvView
          appConfig={appConfig}
          missions={missions}
          onBackToHome={() => handleSelectView('home')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        currentView={currentView}
        onSelectView={handleSelectView}
        operator={operator}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        shiftSecondsRemaining={shiftSecondsRemaining}
        onOpenDiplome={() => setIsDiplomeOpen(true)}
        appConfig={appConfig}
        onUpdateLogo={handleUpdateLogo}
      />

      {/* Main View Router */}
      <main className="flex-1 overflow-y-auto">
        {currentView === 'home' && (
          <HomeLauncherView
            appConfig={appConfig}
            liveStations={liveStations}
            missions={missions}
            onStartDuel={handleStartDuel}
            onStartSolo={handleStartSolo}
            onOpenTv={() => handleSelectView('arena')}
            onOpenPodium={() => handleSelectView('podium')}
            onOpenAdmin={() => handleSelectView('admin')}
            onOpenPrint={() => handleSelectView('print')}
            onUpdateLogo={handleUpdateLogo}
          />
        )}

        {currentView === 'kiosk' && (
          <PosteOperateurView
            missions={missions}
            currentMissionIndex={currentMissionIndex}
            onSelectMission={setCurrentMissionIndex}
            onResetMission={handleResetMission}
            onClearLogs={() => setLogs([])}
            logs={logs}
            inventory={inventory}
            lastScannedCode={lastScannedCode}
            flashState={flashState}
            stationId={stationId}
            stationName={stationName}
            onSelectStation={handleSelectStation}
            operatorCea={operatorCea}
            clientGuest={clientGuest}
            onUpdateDuo={handleUpdateDuo}
            combo={combo}
            liveStations={liveStations}
            activeHazard={activeHazard}
            hazardSecondsRemaining={hazardSecondsRemaining}
            onTriggerSurpriseOrder={handleTriggerSurpriseOrder}
            onStartNewMatch={handleStartNewShift}
            onDeclareAnomaly={handleDeclareStockAnomaly}
            strictScanOnly={appConfig.strictScanOnly}
          />
        )}

        {currentView === 'erp' && (
          <StockERPView
            inventory={inventory}
            locations={locations}
            onUpdateQuantity={handleUpdateQuantity}
            onUpdateInventory={handleUpdateInventory}
            onNavigateToAdminLocations={() => handleSelectView('admin')}
          />
        )}

        {currentView === 'print' && (
          <PlancheEtiquettesView
            inventory={inventory}
            locations={locations}
            missions={missions}
            distractions={distractions}
            goldenTicketBarcode={appConfig.goldenTicketBarcode}
            onOpenGoldenTicket={() => setIsGoldenTicketOpen(true)}
          />
        )}

        {currentView === 'podium' && (
          <PodiumView
            currentOperator={operator}
            onUpdateOperatorName={(name, company) => {
              setOperator((prev) => ({ ...prev, name, companyOrRole: company }));
            }}
            onStartNewShift={handleStartNewShift}
          />
        )}

        {currentView === 'admin' && (
          <AdminConfigView
            appConfig={appConfig}
            onUpdateAppConfig={handleUpdateAppConfig}
            locations={locations}
            onUpdateLocations={handleUpdateLocations}
            missions={missions}
            onUpdateMissions={handleUpdateMissions}
            inventory={inventory}
            onUpdateInventory={handleUpdateInventory}
          />
        )}
      </main>

      {/* Celebration Diploma Modal */}
      <DiplomeModal
        isOpen={isDiplomeOpen}
        onClose={() => setIsDiplomeOpen(false)}
        operator={operator}
        collaboratorName={operatorCea}
        guestName={clientGuest}
        stationName={stationName}
        appConfig={appConfig}
        hasGoldenTicket={hasFoundGoldenTicket}
      />

      {/* Easter Egg Golden Ticket 25 Ans Modal (Édition Jubilé d'Or GT Logistics) */}
      <GoldenTicketModal
        isOpen={isGoldenTicketOpen}
        duoName={`${clientGuest} (avec ${operatorCea})`}
        onClose={() => setIsGoldenTicketOpen(false)}
      />

      {/* Global Toast Notifications (Bottom Right) */}
      <ToastContainer />
    </div>
  );
};
