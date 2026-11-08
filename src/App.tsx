import React, { useState, useEffect, useCallback } from 'react';
import { ViewMode, InventoryItem, Mission, ScanLog, OperatorProfile } from './types';
import { INITIAL_INVENTORY } from './data/initialData';
import { MISSIONS } from './data/missions';
import { Header } from './components/Header';
import { PosteOperateurView } from './components/PosteOperateurView';
import { StockERPView } from './components/StockERPView';
import { PlancheEtiquettesView } from './components/PlancheEtiquettesView';
import { PodiumView } from './components/PodiumView';
import { DiplomeModal } from './components/DiplomeModal';
import { barcodeListener } from './services/barcodeListener';
import { soundService } from './services/soundService';
import { submitScore, broadcastScan } from './services/supabaseClient';

let logCounter = 0;
const generateUniqueLogId = () => `log-${Date.now()}-${++logCounter}-${Math.random().toString(36).slice(2, 7)}`;

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('kiosk');
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [missions, setMissions] = useState<Mission[]>(MISSIONS);
  const [currentMissionIndex, setCurrentMissionIndex] = useState<number>(0);
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [flashState, setFlashState] = useState<'green' | 'red' | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [shiftSecondsRemaining, setShiftSecondsRemaining] = useState<number>(300); // 5 minutes shift
  const [isDiplomeOpen, setIsDiplomeOpen] = useState<boolean>(false);

  // Keep fresh references to avoid closure race conditions
  const missionsRef = React.useRef(missions);
  missionsRef.current = missions;
  const currentMissionIndexRef = React.useRef(currentMissionIndex);
  currentMissionIndexRef.current = currentMissionIndex;

  const [operator, setOperator] = useState<OperatorProfile>({
    name: 'Invité d\'Honneur',
    companyOrRole: 'Client CEA 25 Ans',
    score: 0,
    completedMissions: 0,
    accuracy: 100,
    shiftDurationSeconds: 300
  });

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

  // Handle barcode scanned by hardware douchette or simulated button (Clean & Pure)
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
      // Mission already completed
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

      // Update step status
      const updatedSteps = [...activeMission.steps];
      updatedSteps[activeStepIndex] = { ...activeStep, completed: true };

      const updatedMission = { ...activeMission, steps: updatedSteps };
      const updatedMissions = [...currentMissions];
      updatedMissions[activeIndex] = updatedMission;
      setMissions(updatedMissions);

      // Check if full mission completed
      const isMissionDone = updatedSteps.every((s) => s.completed);

      setOperator((prev) => {
        const nextScore = prev.score + (isMissionDone ? activeMission.basePoints : 150);
        const nextMissions = isMissionDone ? prev.completedMissions + 1 : prev.completedMissions;

        // Auto-sync completed mission to Supabase
        if (isMissionDone) {
          submitScore({
            name: prev.name || 'Invité 25 Ans',
            company: prev.companyOrRole || 'CEA Grenoble',
            score: nextScore,
            time_spent: '02:00',
            completed_missions: nextMissions,
            accuracy: prev.accuracy || 100
          }).catch(() => {});
        }

        return {
          ...prev,
          score: nextScore,
          completedMissions: nextMissions
        };
      });

      // Broadcast scan activity to Supabase Realtime
      broadcastScan({
        station_name: 'Poste Opérateur',
        operator_name: operator.name || 'Invité 25 Ans',
        barcode: cleanedCode,
        action_type: 'VALID_SCAN',
        message: `✓ Étape ${activeStepIndex + 1} : ${activeStep.targetLabel}`,
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
          message: `✓ Étape ${activeStepIndex + 1} validée : ${activeStep.targetLabel}`
        },
        ...prev
      ]);
    } else {
      // MISMATCH! Invalid scan
      triggerFlash('red');
      soundService.playErrorBuzz();

      broadcastScan({
        station_name: 'Poste Opérateur',
        operator_name: operator.name || 'Invité 25 Ans',
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
    soundService.playScanBeep();
  };

  // Start new shift for a new guest
  const handleStartNewShift = () => {
    setMissions(MISSIONS);
    setShiftSecondsRemaining(300);
    setOperator((prev) => ({
      ...prev,
      score: 0,
      completedMissions: 0,
      name: 'Nouvel Invité',
      companyOrRole: 'Invité 25 Ans'
    }));
    setLogs([]);
    setCurrentView('kiosk');
    soundService.playSuccessChime();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <Header
        currentView={currentView}
        onSelectView={setCurrentView}
        operator={operator}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        shiftSecondsRemaining={shiftSecondsRemaining}
        onOpenDiplome={() => setIsDiplomeOpen(true)}
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
          />
        )}

        {currentView === 'erp' && (
          <StockERPView
            inventory={inventory}
            onUpdateQuantity={handleUpdateQuantity}
          />
        )}

        {currentView === 'print' && (
          <PlancheEtiquettesView />
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
