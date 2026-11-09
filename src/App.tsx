import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ViewMode, InventoryItem, Mission, ScanLog, OperatorProfile, AppConfig, DuoStation, Distraction, LiveHazard } from './types';
import { INITIAL_INVENTORY } from './data/initialData';
import { MISSIONS } from './data/missions';
import { Header } from './components/Header';
import { PosteOperateurView } from './components/PosteOperateurView';
import { StockERPView } from './components/StockERPView';
import { PlancheEtiquettesView } from './components/PlancheEtiquettesView';
import { PodiumView } from './components/PodiumView';
import { ArenaTvView } from './components/ArenaTvView';
import { AdminConfigView } from './components/AdminConfigView';
import { DiplomeModal } from './components/DiplomeModal';
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
  getStationsLive,
  updateStationLive,
  subscribeToStationsLive,
  fetchDistractions,
  triggerLiveHazard,
  resolveLiveHazard,
  expireLiveHazard,
  subscribeToLiveHazards
} from './services/supabaseClient';

let logCounter = 0;
const generateUniqueLogId = () => `log-${Date.now()}-${++logCounter}-${Math.random().toString(36).slice(2, 7)}`;

const getStationMissions = (baseMissions: Mission[], stId: string): Mission[] => {
  if (stId === 'poste-2') {
    // Reverse order for Poste 2 so both duos target different physical shelves during duel
    return baseMissions.slice().reverse();
  }
  return baseMissions;
};

// Flexible barcode comparator supporting aliases, L/R codes and scanner variations
const isBarcodeMatching = (scanned: string, expected: string, lrCode?: string): boolean => {
  const cleanS = scanned.trim().toUpperCase();
  const cleanE = expected.trim().toUpperCase();
  if (cleanS === cleanE) return true;

  if (lrCode && cleanS === lrCode.trim().toUpperCase()) return true;

  const strippedS = cleanS.replace(/[^A-Z0-9]/g, '');
  const strippedE = cleanE.replace(/[^A-Z0-9]/g, '');
  const strippedLr = lrCode ? lrCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : '';

  if (strippedS === strippedE) return true;
  if (strippedLr && strippedS === strippedLr) return true;

  // Specific warehouse aliases (shelves, docks, articles)
  if (cleanE.includes('ETAGERE-LIVRAISON') && (cleanS.includes('LIVRAISON') || cleanS.includes('ETA_LIVR') || cleanS.includes('ETALIVR'))) return true;
  if (cleanE.includes('ETAGERE-COLLECTE') && (cleanS.includes('COLLECTE') || cleanS.includes('ETA_COLLECT'))) return true;
  if (cleanE.includes('KF40') && (cleanS.includes('KF40') || cleanS.includes('BRD_KF40'))) return true;
  if (cleanE.includes('7490') && (cleanS.includes('7490') || cleanS.includes('JNT_A001') || cleanS.includes('KALREZ'))) return true;
  if (cleanE.includes('POMPE') && (cleanS.includes('POMPE') || cleanS.includes('GRILLE_41'))) return true;
  if (cleanE.includes('VITON') && cleanS.includes('VITON')) return true;
  if (cleanE.includes('WAFER') && cleanS.includes('WAFER')) return true;
  if (cleanE.includes('SACHET') && cleanS.includes('SACHET')) return true;
  if (cleanE.includes('CARTON') && cleanS.includes('CARTON')) return true;
  if (cleanE.includes('SCEL') && cleanS.includes('SCEL')) return true;

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
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [missions, setMissions] = useState<Mission[]>(() => getStationMissions(MISSIONS, initialStationId));
  const [appConfig, setAppConfig] = useState<AppConfig>({
    eventTitle: 'CEA GRENOBLE',
    eventSubtitle: 'WMS Industrial Terminal • Shift Challenge',
    badgeLabel: 'ÉDITION 25 ANS',
    shiftDurationSeconds: 180,
    comboBonusPoints: 50,
    publicUrl: 'https://jeux-scan-25-ans-logistics.vercel.app',
    diplomaTitle: 'DIPLÔME D\'HONNEUR',
    diplomaDescription: 'A accompli avec distinction et succès les opérations de préparation, traçabilité et conditionnement logistique.',
    diplomaSignatory: 'La Direction Logistique & Supply Chain',
    availableStations: [
      { id: 'poste-1', name: 'Poste 1 (Scannette A)' },
      { id: 'poste-2', name: 'Poste 2 (Scannette B)' },
      { id: 'poste-3', name: 'Poste 3 (Zebra Scan)' }
    ]
  });
  const [currentMissionIndex, setCurrentMissionIndex] = useState<number>(0);
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [flashState, setFlashState] = useState<'green' | 'red' | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [shiftSecondsRemaining, setShiftSecondsRemaining] = useState<number>(180);
  const [isDiplomeOpen, setIsDiplomeOpen] = useState<boolean>(false);

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

  const [operator, setOperator] = useState<OperatorProfile>({
    name: 'Duo ' + clientGuest,
    companyOrRole: 'GT Logistics • 25 Ans',
    score: 0,
    completedMissions: 0,
    accuracy: 100,
    shiftDurationSeconds: 300
  });

  // Load Remote / Custom App Config on startup
  useEffect(() => {
    async function initConfig() {
      const stored = await loadAppConfig();
      if (stored) {
        setAppConfig((prev) => ({
          ...prev,
          eventTitle: stored.eventTitle,
          eventSubtitle: stored.eventSubtitle,
          badgeLabel: stored.badgeLabel,
          shiftDurationSeconds: stored.shiftDurationSeconds,
          comboBonusPoints: stored.comboBonusPoints ?? prev.comboBonusPoints,
          publicUrl: stored.publicUrl ?? prev.publicUrl,
          diplomaTitle: stored.diplomaTitle ?? prev.diplomaTitle,
          diplomaDescription: stored.diplomaDescription ?? prev.diplomaDescription,
          diplomaSignatory: stored.diplomaSignatory ?? prev.diplomaSignatory,
          availableStations: stored.availableStations ?? prev.availableStations
        }));
        setShiftSecondsRemaining(stored.shiftDurationSeconds);
        if (stored.missions && stored.missions.length > 0) {
          setMissions(stored.missions);
        }
        if (stored.inventory && stored.inventory.length > 0) {
          setInventory(stored.inventory);
        }
      }

      const stList = await getStationsLive();
      if (stList.length > 0) {
        setLiveStations(stList);
        const myStation = stList.find((s) => s.station_id === stationIdRef.current);
        if (myStation) {
          if (myStation.operator_cea) setOperatorCea(myStation.operator_cea);
          if (myStation.client_guest) setClientGuest(myStation.client_guest);
          setOperator((prev) => ({
            ...prev,
            name: myStation.team_name || `Duo ${myStation.client_guest}`
          }));
        }
      }

      const distList = await fetchDistractions();
      if (distList.length > 0) {
        setDistractions(distList);
      }
    }
    initConfig();

    // Subscribe to live config updates from admin changes across stations
    const unsubConfig = subscribeToAppConfig((newCfg) => {
      setAppConfig((prev) => ({
        ...prev,
        eventTitle: newCfg.eventTitle,
        eventSubtitle: newCfg.eventSubtitle,
        badgeLabel: newCfg.badgeLabel,
        shiftDurationSeconds: newCfg.shiftDurationSeconds,
        comboBonusPoints: newCfg.comboBonusPoints ?? prev.comboBonusPoints,
        publicUrl: newCfg.publicUrl ?? prev.publicUrl,
        diplomaTitle: newCfg.diplomaTitle ?? prev.diplomaTitle,
        diplomaDescription: newCfg.diplomaDescription ?? prev.diplomaDescription,
        diplomaSignatory: newCfg.diplomaSignatory ?? prev.diplomaSignatory,
        availableStations: newCfg.availableStations ?? prev.availableStations,
        autoHazardsEnabled: newCfg.autoHazardsEnabled ?? prev.autoHazardsEnabled,
        hazardIntervalSeconds: newCfg.hazardIntervalSeconds ?? prev.hazardIntervalSeconds,
        clientsCatalog: newCfg.clientsCatalog ?? prev.clientsCatalog
      }));
      if (newCfg.missions && newCfg.missions.length > 0) {
        setMissions(newCfg.missions);
      }
      if (newCfg.inventory && newCfg.inventory.length > 0) {
        setInventory(newCfg.inventory);
      }
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

      // If this update is for this terminal, sync identity and match reset
      if (updatedStation.station_id === stationIdRef.current) {
        if (updatedStation.operator_cea) setOperatorCea(updatedStation.operator_cea);
        if (updatedStation.client_guest) setClientGuest(updatedStation.client_guest);
        
        // Host started new match (either marked 'idle' or newly started 'in_progress' with score 0)
        const isNewMatchSignal = updatedStation.status === 'idle' || 
          (updatedStation.status === 'in_progress' && (updatedStation.score === 0 || updatedStation.current_step_index === 0));

        if (isNewMatchSignal) {
          setCurrentMissionIndex(0);
          setCombo(0);
          setShiftSecondsRemaining(appConfig.shiftDurationSeconds || 180);
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
            name: updatedStation.team_name || `Duo ${updatedStation.client_guest}`
          }));
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
      } else if (msg.type === 'MISSIONS_UPDATED' && Array.isArray(msg.payload)) {
        setMissions(msg.payload);
      } else if (msg.type === 'CONFIG_UPDATED' && msg.payload) {
        setAppConfig((prev) => ({ ...prev, ...msg.payload }));
      } else if (msg.type === 'STATIONS_UPDATED' && Array.isArray(msg.payload)) {
        setLiveStations(msg.payload);
      }
    });

    return () => {
      unsubConfig();
      unsubStations();
      unsubHazards();
      unsubLocal();
    };
  }, []);

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
    const clients = appConfig.clientsCatalog || ['CEA LETI - Bât. 17 (Nano)', 'Minatec Salle Blanche ISO 5'];
    const randomClient = clients[Math.floor(Math.random() * clients.length)];
    const items = inventory.length > 0 ? inventory : INITIAL_INVENTORY;
    const randomItem = items[Math.floor(Math.random() * items.length)];

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

  // Shift Timer Countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setShiftSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
    setMissions(getStationMissions(MISSIONS, id));
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

    setLastScannedCode(cleanedCode);
    soundService.playScanBeep();

    const timestamp = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // 0. PRIORITY CHECK: Is there an ongoing active Hazard / Distraction?
    if (activeHazardRef.current) {
      const currentHazard = activeHazardRef.current;
      if (cleanedCode.toUpperCase() === currentHazard.expected_barcode.toUpperCase()) {
        // HAZARD RESOLVED!
        triggerFlash('green');
        soundService.playHazardSuccess();
        const bonusPoints = currentHazard.points_bonus || 600;
        const newCombo = comboRef.current + 2;
        setCombo(newCombo);

        setOperator((prev) => ({
          ...prev,
          score: prev.score + bonusPoints
        }));

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
        triggerFlash('red');
        soundService.playErrorBuzz();
        setCombo(0);

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

    // Check direct match on active step, or flexible match on any remaining step of this mission
    let targetStepIndex = activeStepIndex;
    let isMatch = isBarcodeMatching(cleanedCode, activeStep.expectedBarcode, activeStep.lrCode);

    if (!isMatch) {
      // Find if another uncompleted step of this mission matches the scanned code
      const altStepIndex = activeMission.steps.findIndex(
        (s, idx) => !s.completed && idx !== activeStepIndex && isBarcodeMatching(cleanedCode, s.expectedBarcode, s.lrCode)
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
      const comboBonus = newCombo * (appConfig.comboBonusPoints || 50);
      const addedPoints = (isMissionDone ? activeMission.basePoints : 150) + comboBonus;

      setOperator((prev) => {
        const nextScore = prev.score + addedPoints;
        const nextMissions = isMissionDone ? prev.completedMissions + 1 : prev.completedMissions;

        // Auto-sync completed mission to Supabase
        if (isMissionDone) {
          submitScore({
            name: `${clientGuestRef.current} (Duo avec ${operatorCeaRef.current})`,
            company: 'CEA 25 Ans',
            score: nextScore,
            time_spent: '02:00',
            completed_missions: nextMissions,
            accuracy: 100
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
          completedMissions: nextMissions
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

      // Live ERP Stock Update & Scenarios Actions
      const matchedInvItem = inventory.find(
        (item) => isBarcodeMatching(cleanedCode, item.sku, item.lrCode)
      );

      if (matchedInvItem && currentTargetStep.barcodeType === 'article') {
        // Préparation / Picking : Décrémentation automatique du stock
        setInventory((prevInv) => {
          const nextInv = prevInv.map((item) =>
            item.id === matchedInvItem.id
              ? { ...item, quantity: Math.max(0, item.quantity - 1) }
              : item
          );
          broadcastLocalRealtime('INVENTORY_UPDATED', nextInv);
          return nextInv;
        });
        showToast({
          title: `WMS : Sortie de Stock (-1 ${matchedInvItem.unit || 'pc'})`,
          message: `${matchedInvItem.name} prélevé pour la commande`,
          type: 'info'
        });
      } else if (cleanedCode === 'ZONE_POMPE_GRILLE_41') {
        // Collecte / Retour en stock : Incrémentation du stock
        setInventory((prevInv) => {
          const nextInv = prevInv.map((item) =>
            item.sku === 'REF191000007490' ? { ...item, quantity: item.quantity + 1 } : item
          );
          broadcastLocalRealtime('INVENTORY_UPDATED', nextInv);
          return nextInv;
        });
        showToast({
          title: 'WMS : Entrée en Stock (+1)',
          message: 'Joint Kalrez réintégré en Zone Pompe Grille 41',
          type: 'success'
        });
      } else if (cleanedCode === 'ZONE_RECEPTION_CENTRALE') {
        // Manutention & Expédition vers l'étranger : Notification client
        showToast({
          title: 'Expédition Internationale Confirmée',
          message: 'Colis déposé à La Réception Centrale. Le client a été notifié par email.',
          type: 'success'
        });
      } else if (cleanedCode === 'BL-EDWARDS-9941') {
        setInventory((prevInv) => {
          const nextInv = prevInv.map((item) =>
            item.sku === 'ART-KF40-INOX' ? { ...item, quantity: item.quantity + 5 } : item
          );
          broadcastLocalRealtime('INVENTORY_UPDATED', nextInv);
          return nextInv;
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
      triggerFlash('red');
      soundService.playErrorBuzz();
      setCombo(0);

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
        action_type: 'INVALID_SCAN',
        message: `✗ Erreur scan (${cleanedCode})`,
        status: 'invalid'
      }).catch(() => {});

      setLogs((prev) => [
        {
          id: generateUniqueLogId(),
          timestamp,
          barcode: cleanedCode,
          status: 'invalid',
          message: `✗ Code erroné ! Attendu : ${activeStep.expectedBarcode}`
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

    // 2. Ajuster l'ERP au stock physique réel
    if (matchedItem) {
      const nextInv = inventory.map((item) =>
        item.id === matchedItem.id ? { ...item, quantity: Math.max(0, realQty) } : item
      );
      handleUpdateInventory(nextInv);
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

  // Manual stock update in ERP view
  const handleUpdateQuantity = async (id: string, delta: number) => {
    const updated = inventory.map((item) =>
      item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
    );
    setInventory(updated);
    broadcastLocalRealtime('INVENTORY_UPDATED', updated);
    try {
      await saveAppConfig({
        ...appConfig,
        missions,
        inventory: updated
      });
    } catch (e) {
      console.warn('Failed to save quantity update to Supabase:', e);
    }
  };

  // Full stock update (from ERP or Admin) with cloud & local persistence
  const handleUpdateInventory = async (newInv: InventoryItem[]) => {
    setInventory(newInv);
    broadcastLocalRealtime('INVENTORY_UPDATED', newInv);
    try {
      await saveAppConfig({
        ...appConfig,
        missions,
        inventory: newInv
      });
    } catch (e) {
      console.warn('Failed to save inventory to Supabase:', e);
    }
  };

  // Full missions update with cloud & local persistence
  const handleUpdateMissions = async (newMissions: Mission[]) => {
    setMissions(newMissions);
    broadcastLocalRealtime('MISSIONS_UPDATED', newMissions);
    try {
      await saveAppConfig({
        ...appConfig,
        missions: newMissions,
        inventory
      });
    } catch (e) {
      console.warn('Failed to save missions to Supabase:', e);
    }
  };

  // Full app config update with cloud & local persistence
  const handleUpdateAppConfig = async (newConfig: AppConfig) => {
    setAppConfig(newConfig);
    broadcastLocalRealtime('CONFIG_UPDATED', newConfig);
    try {
      await saveAppConfig({
        ...newConfig,
        missions,
        inventory
      });
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
    setMissions((prev) => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled.map((m) => ({
        ...m,
        steps: m.steps.map((st) => ({ ...st, completed: false }))
      }));
    });
    setCurrentMissionIndex(0);
    setShiftSecondsRemaining(appConfig.shiftDurationSeconds || 180);
    setCombo(0);
    setOperator((prev) => ({
      ...prev,
      score: 0,
      completedMissions: 0,
      name: `Duo ${clientGuest}`,
      companyOrRole: `Agent CEA: ${operatorCea}`
    }));
    setLogs([]);
    setCurrentView('kiosk');
    soundService.playSuccessChime();

    updateStationLive({
      station_id: stationIdRef.current,
      progress_percent: 0,
      current_step_index: 0,
      score: 0,
      combo: 0,
      status: 'idle'
    });
  };

  // Launch Live 2-Duo Duel from the Home Launcher
  const handleStartDuel = async (
    duo1: { cea: string; client: string },
    duo2: { cea: string; client: string }
  ) => {
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
      total_steps: 5,
      status: 'in_progress'
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
      total_steps: 5,
      status: 'in_progress'
    });

    // 2. Local state initialization for this active machine
    const isP2 = stationId === 'poste-2';
    const activeDuo = isP2 ? duo2 : duo1;
    setOperatorCea(activeDuo.cea);
    setClientGuest(activeDuo.client);
    setShiftSecondsRemaining(appConfig.shiftDurationSeconds || 180);
    setCombo(0);
    setCurrentMissionIndex(0);
    setLogs([]);

    // Reset all mission steps
    setMissions((prev) =>
      prev.map((m) => ({
        ...m,
        steps: m.steps.map((st) => ({ ...st, completed: false }))
      }))
    );

    setCurrentView('kiosk');
    soundService.playSuccessJingle();
  };

  // Launch Solo / Practice run from Home Launcher
  const handleStartSolo = (
    targetStationId: string,
    targetStationName: string,
    duo: { cea: string; client: string }
  ) => {
    handleSelectStation(targetStationId, targetStationName);
    setOperatorCea(duo.cea);
    setClientGuest(duo.client);
    setShiftSecondsRemaining(appConfig.shiftDurationSeconds || 180);
    setCombo(0);
    setCurrentMissionIndex(0);
    setLogs([]);

    setMissions((prev) =>
      prev.map((m) => ({
        ...m,
        steps: m.steps.map((st) => ({ ...st, completed: false }))
      }))
    );

    setCurrentView('kiosk');
    soundService.playSuccessJingle();
  };

  const handleUpdateLogo = (logoUrl: string) => {
    setAppConfig((prev) => ({ ...prev, customLogoUrl: logoUrl }));
  };

  // DEDICATED HANDHELD ZEBRA PURE GAME MODE (NO HEADER, NO ADMIN/ERP TABS, LOCKED TO GAMEPLAY)
  if (currentView === 'play') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <ZebraPlayView
          stationId={stationId}
          stationName={stationName}
          operatorCea={operatorCea}
          clientGuest={clientGuest}
          score={operator.score}
          combo={combo}
          shiftSecondsRemaining={shiftSecondsRemaining}
          missions={missions}
          currentMissionIndex={currentMissionIndex}
          lastScannedCode={lastScannedCode}
          flashState={flashState}
          activeHazard={activeHazard}
          hazardSecondsRemaining={hazardSecondsRemaining}
          otherStations={liveStations}
          inventory={inventory}
          onDeclareAnomaly={handleDeclareStockAnomaly}
          onBarcodeScanned={handleBarcodeScanned}
          onNextMission={advanceToNextMission}
          onRestartShift={handleStartNewShift}
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
        />
      </div>
    );
  }

  // DEDICATED 55" ARENA TV BROADCAST (FULLSCREEN ESPORT / TV BROADCAST MODE WITHOUT WEB NAVBAR)
  if (currentView === 'arena') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <ArenaTvView
          appConfig={appConfig}
          onBackToHome={() => handleSelectView('home')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
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
          />
        )}

        {currentView === 'erp' && (
          <StockERPView
            inventory={inventory}
            onUpdateQuantity={handleUpdateQuantity}
            onUpdateInventory={handleUpdateInventory}
          />
        )}

        {currentView === 'print' && (
          <PlancheEtiquettesView
            inventory={inventory}
            missions={missions}
            distractions={distractions}
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
      />

      {/* Global Toast Notifications (Bottom Right) */}
      <ToastContainer />
    </div>
  );
};
