import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ViewMode, InventoryItem, Mission, ScanLog, OperatorProfile, AppConfig, DuoStation } from './types';
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
import { barcodeListener } from './services/barcodeListener';
import { soundService } from './services/soundService';
import { 
  submitScore, 
  broadcastScan, 
  loadAppConfig, 
  subscribeToAppConfig,
  getStationsLive,
  updateStationLive,
  subscribeToStationsLive
} from './services/supabaseClient';

let logCounter = 0;
const generateUniqueLogId = () => `log-${Date.now()}-${++logCounter}-${Math.random().toString(36).slice(2, 7)}`;

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('kiosk');
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [missions, setMissions] = useState<Mission[]>(MISSIONS);
  const [appConfig, setAppConfig] = useState<AppConfig>({
    eventTitle: 'CEA GRENOBLE',
    eventSubtitle: 'WMS Industrial Terminal • Shift Challenge',
    badgeLabel: 'ÉDITION 25 ANS',
    shiftDurationSeconds: 300
  });
  const [currentMissionIndex, setCurrentMissionIndex] = useState<number>(0);
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [flashState, setFlashState] = useState<'green' | 'red' | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [shiftSecondsRemaining, setShiftSecondsRemaining] = useState<number>(300);
  const [isDiplomeOpen, setIsDiplomeOpen] = useState<boolean>(false);

  // Duo & Multi-station States
  const [stationId, setStationId] = useState<string>(() => localStorage.getItem('cea_station_id') || 'poste-1');
  const [stationName, setStationName] = useState<string>(() => localStorage.getItem('cea_station_name') || 'Poste 1 (Scannette A)');
  const [operatorCea, setOperatorCea] = useState<string>(() => localStorage.getItem('cea_op_name') || 'Agent CEA');
  const [clientGuest, setClientGuest] = useState<string>(() => localStorage.getItem('cea_client_name') || 'Client Invité');
  const [combo, setCombo] = useState<number>(0);
  const [liveStations, setLiveStations] = useState<DuoStation[]>([]);

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
    companyOrRole: 'CEA 25 Ans',
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
        setAppConfig({
          eventTitle: stored.eventTitle,
          eventSubtitle: stored.eventSubtitle,
          badgeLabel: stored.badgeLabel,
          shiftDurationSeconds: stored.shiftDurationSeconds
        });
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
      }
    }
    initConfig();

    // Subscribe to live config updates from admin changes across stations
    const unsubConfig = subscribeToAppConfig((newCfg) => {
      setAppConfig({
        eventTitle: newCfg.eventTitle,
        eventSubtitle: newCfg.eventSubtitle,
        badgeLabel: newCfg.badgeLabel,
        shiftDurationSeconds: newCfg.shiftDurationSeconds
      });
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
    });

    return () => {
      unsubConfig();
      unsubStations();
    };
  }, []);

  // Shift Timer Countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setShiftSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Flash reset helper
  const triggerFlash = (color: 'green' | 'red') => {
    setFlashState(color);
    setTimeout(() => setFlashState(null), 400);
  };

  // Station Select Handler
  const handleSelectStation = (id: string, name: string) => {
    setStationId(id);
    setStationName(name);
    localStorage.setItem('cea_station_id', id);
    localStorage.setItem('cea_station_name', name);
  };

  // Duo Update Handler
  const handleUpdateDuo = (cea: string, client: string) => {
    setOperatorCea(cea);
    setClientGuest(client);
    localStorage.setItem('cea_op_name', cea);
    localStorage.setItem('cea_client_name', client);
    setOperator((prev) => ({
      ...prev,
      name: `Duo ${client}`,
      companyOrRole: `Agent CEA: ${cea}`
    }));

    updateStationLive({
      station_id: stationIdRef.current,
      station_name: stationNameRef.current,
      operator_cea: cea,
      client_guest: client,
      team_name: `Duo ${client}`
    });
  };

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

    if (cleanedCode.toUpperCase() === activeStep.expectedBarcode.toUpperCase()) {
      // MATCH! Valid scan
      triggerFlash('green');
      soundService.playSuccessChime();

      // Update Combo
      const newCombo = comboRef.current + 1;
      setCombo(newCombo);

      // Update step status
      const updatedSteps = [...activeMission.steps];
      updatedSteps[activeStepIndex] = { ...activeStep, completed: true };

      const updatedMission = { ...activeMission, steps: updatedSteps };
      const updatedMissions = [...currentMissions];
      updatedMissions[activeIndex] = updatedMission;
      setMissions(updatedMissions);

      // Check if full mission completed
      const isMissionDone = updatedSteps.every((s) => s.completed);
      const comboBonus = newCombo * 50;
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
          current_step_index: activeStepIndex + 1,
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
        message: `✓ Étape ${activeStepIndex + 1} : ${activeStep.targetLabel} (+${addedPoints} pts)`,
        status: 'valid'
      }).catch(() => {});

      if (isMissionDone) {
        setTimeout(() => {
          soundService.playMissionComplete();
          setIsDiplomeOpen(true);
        }, 400);
      }

      // Live ERP Stock Update
      if (cleanedCode === 'ART-KF40-INOX') {
        setInventory((prevInv) =>
          prevInv.map((item) =>
            item.sku === 'ART-KF40-INOX' ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item
          )
        );
      } else if (cleanedCode === 'BL-EDWARDS-9941') {
        setInventory((prevInv) =>
          prevInv.map((item) =>
            item.sku === 'ART-KF40-INOX' ? { ...item, quantity: item.quantity + 5 } : item
          )
        );
      }

      setLogs((prev) => [
        {
          id: generateUniqueLogId(),
          timestamp,
          barcode: cleanedCode,
          status: 'valid',
          message: `✓ Étape ${activeStepIndex + 1} validée : ${activeStep.targetLabel} (Combo x${newCombo})`
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
  }, []);

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
  const handleUpdateQuantity = (id: string, delta: number) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
      )
    );
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

  // Start new shift for a new guest
  const handleStartNewShift = () => {
    setMissions((prev) =>
      prev.map((m) => ({
        ...m,
        steps: m.steps.map((st) => ({ ...st, completed: false }))
      }))
    );
    setShiftSecondsRemaining(appConfig.shiftDurationSeconds);
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        currentView={currentView}
        onSelectView={setCurrentView}
        operator={operator}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        shiftSecondsRemaining={shiftSecondsRemaining}
        onOpenDiplome={() => setIsDiplomeOpen(true)}
        appConfig={appConfig}
      />

      {/* Main View Router */}
      <main className="flex-1 overflow-y-auto">
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
          />
        )}

        {currentView === 'arena' && (
          <ArenaTvView appConfig={appConfig} />
        )}

        {currentView === 'erp' && (
          <StockERPView
            inventory={inventory}
            onUpdateQuantity={handleUpdateQuantity}
          />
        )}

        {currentView === 'print' && (
          <PlancheEtiquettesView
            inventory={inventory}
            missions={missions}
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
            onUpdateAppConfig={setAppConfig}
            missions={missions}
            onUpdateMissions={setMissions}
            inventory={inventory}
            onUpdateInventory={setInventory}
          />
        )}
      </main>

      {/* Celebration Diploma Modal */}
      <DiplomeModal
        isOpen={isDiplomeOpen}
        onClose={() => setIsDiplomeOpen(false)}
        operator={operator}
      />
    </div>
  );
};
