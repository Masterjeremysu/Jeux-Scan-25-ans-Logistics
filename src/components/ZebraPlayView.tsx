import React, { useState, useEffect, useRef } from 'react';
import { Mission, DuoStation, LiveHazard, InventoryItem } from '../types';
import { 
  CheckCircle2, 
  MapPin, 
  Package, 
  Flame, 
  Users, 
  Clock, 
  ShieldAlert, 
  Sparkles, 
  Zap, 
  Swords,
  ChevronRight,
  Truck,
  AlertTriangle,
  Check,
  Camera,
  Radio,
  ScanBarcode,
  Barcode,
  Award,
  RotateCcw
} from 'lucide-react';
import { barcodeListener } from '../services/barcodeListener';
import { CameraScannerModal } from './CameraScannerModal';

interface ZebraPlayViewProps {
  stationId: string;
  stationName: string;
  operatorCea: string;
  clientGuest: string;
  score: number;
  combo: number;
  shiftSecondsRemaining: number;
  missions: Mission[];
  currentMissionIndex: number;
  lastScannedCode: string | null;
  flashState: 'green' | 'red' | null;
  activeHazard: LiveHazard | null;
  hazardSecondsRemaining: number;
  otherStations: DuoStation[];
  inventory?: InventoryItem[];
  onDeclareAnomaly?: (realQty: number) => void;
  onBarcodeScanned?: (code: string) => void;
  onNextMission?: () => void;
  onRestartShift?: () => void;
  onOpenDiplome?: () => void;
}

export const ZebraPlayView: React.FC<ZebraPlayViewProps> = ({
  stationId,
  stationName,
  operatorCea,
  clientGuest,
  score,
  combo,
  shiftSecondsRemaining,
  missions,
  currentMissionIndex,
  lastScannedCode,
  flashState,
  activeHazard,
  hazardSecondsRemaining,
  otherStations,
  inventory = [],
  onDeclareAnomaly,
  onBarcodeScanned,
  onNextMission,
  onRestartShift,
  onOpenDiplome
}) => {
  const isPoste1 = stationId === 'poste-1';
  const mission = missions[currentMissionIndex] || missions[0];
  const currentStep = mission ? mission.steps.find((s) => !s.completed) || null : null;
  const [isAnomalyModalOpen, setIsAnomalyModalOpen] = useState(false);
  const [anomalyQty, setAnomalyQty] = useState(0);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // Visible WMS scan input for Zebra hardware Douchette & Keystroke injection
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [scanInputValue, setScanInputValue] = useState('');
  const debounceTimerRef = useRef<any>(null);

  // Dynamic resolution from live inventory
  const matchedItem = currentStep
    ? inventory.find((i) => i.sku.toUpperCase() === currentStep.expectedBarcode.toUpperCase())
    : null;

  const displayTargetLabel = matchedItem ? matchedItem.name : currentStep?.targetLabel;
  const requiredQty = currentStep?.quantity && currentStep.quantity > 1 ? currentStep.quantity : 1;
  const currentScannedQty = currentStep?.scannedCount || 0;
  const completedStepsCount = mission ? mission.steps.filter((s) => s.completed).length : 0;
  const totalStepsCount = mission ? mission.steps.length : 1;
  const progressPercent = Math.round((completedStepsCount / totalStepsCount) * 100);

  const rival = otherStations.find((s) => s.station_id !== stationId);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.max(0, seconds) % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Keep scan input permanently focused for Zebra DataWedge hardware trigger
  useEffect(() => {
    const focusScanInput = () => {
      if (scanInputRef.current && !isAnomalyModalOpen && !isCameraOpen) {
        scanInputRef.current.focus({ preventScroll: true });
      }
    };

    focusScanInput();
    const interval = setInterval(focusScanInput, 2000);

    const handleTap = () => {
      focusScanInput();
    };
    window.addEventListener('click', handleTap);
    window.addEventListener('touchstart', handleTap);

    return () => {
      clearInterval(interval);
      window.removeEventListener('click', handleTap);
      window.removeEventListener('touchstart', handleTap);
    };
  }, [isAnomalyModalOpen, isCameraOpen]);

  // Keyboard shortcut Spacebar for quick test
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement)?.tagName !== 'INPUT') {
        e.preventDefault();
        if (activeHazard) {
          triggerScan(activeHazard.expected_barcode);
        } else if (currentStep) {
          triggerScan(currentStep.expectedBarcode);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, activeHazard]);

  const triggerScan = (code: string) => {
    const cleaned = code.trim().toUpperCase();
    if (!cleaned) return;

    if (navigator.vibrate) {
      try {
        navigator.vibrate(100);
      } catch {}
    }

    if (onBarcodeScanned) {
      onBarcodeScanned(cleaned);
    } else {
      barcodeListener.simulateScan(cleaned);
    }

    setScanInputValue('');
    if (scanInputRef.current) {
      scanInputRef.current.value = '';
      scanInputRef.current.focus({ preventScroll: true });
    }
  };

  // Handle direct typing / laser stream from Zebra DataWedge
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setScanInputValue(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Check if DataWedge sent Enter or newline
    if (val.includes('\n') || val.includes('\r')) {
      const clean = val.replace(/[\r\n\t]/g, '').trim().toUpperCase();
      if (clean.length >= 3) {
        triggerScan(clean);
      }
      return;
    }

    // Auto-submit after rapid Zebra scan completion (200ms)
    debounceTimerRef.current = setTimeout(() => {
      const clean = val.replace(/[\r\n\t]/g, '').trim().toUpperCase();
      if (clean.length >= 3) {
        triggerScan(clean);
      }
    }, 220);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      const clean = scanInputValue.replace(/[\r\n\t]/g, '').trim().toUpperCase();
      if (clean.length >= 2) {
        triggerScan(clean);
      }
    }
  };

  return (
    <div 
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col p-3 sm:p-5 select-none transition-colors duration-200 ${
        flashState === 'green' ? 'bg-emerald-950/40' : flashState === 'red' ? 'bg-rose-950/40' : ''
      }`}
      onClick={() => scanInputRef.current?.focus({ preventScroll: true })}
    >
      {/* 1. TOP LOCKED ZEBRA HUD */}
      <header className="bg-slate-900 rounded-2xl p-3 border border-slate-800 shadow-xl flex items-center justify-between gap-2 shrink-0">
        {/* Station Badge & Duo Name */}
        <div className="flex items-center space-x-2 min-w-0">
          <span className={`text-[11px] font-black font-mono px-2.5 py-1 rounded-xl uppercase shrink-0 ${
            isPoste1 ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20' : 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
          }`}>
            {stationName.split(' ')[0]} {isPoste1 ? 'Bleu' : 'Orange'}
          </span>
          <div className="truncate">
            <span className="text-xs font-bold text-white block truncate">
              {operatorCea} 🤝 {clientGuest}
            </span>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>Connecté en direct</span>
            </span>
          </div>
        </div>

        {/* Center: Match Countdown */}
        <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800 font-mono text-sm font-black text-amber-300 shrink-0">
          <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>{formatTime(shiftSecondsRemaining)}</span>
        </div>

        {/* Right: Score, Combo & Diplome Button */}
        <div className="flex items-center space-x-2 shrink-0">
          {onOpenDiplome && score > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDiplome();
              }}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-mono font-bold"
              title="Consulter le Diplôme d'Honneur"
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Diplôme</span>
            </button>
          )}

          {combo > 1 && (
            <div className="hidden sm:flex items-center space-x-1 text-xs font-black font-mono px-2 py-0.5 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 animate-pulse">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>x{combo}</span>
            </div>
          )}
          <div className="text-right">
            <span className="text-sm sm:text-base font-black font-mono text-emerald-400">
              {score} <span className="text-[10px] text-slate-400 font-normal">pts</span>
            </span>
          </div>
        </div>
      </header>

      {/* 2. RIVAL RADAR (Mini duel progress bar vs the other station) */}
      {rival && (
        <div className="mt-2.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs font-mono shrink-0">
          <div className="flex items-center space-x-1.5 text-slate-400 truncate">
            <Swords className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-bounce" />
            <span className="truncate">Rival ({rival.station_name.split(' ')[0]}) : <strong className="text-slate-200">{rival.team_name}</strong></span>
          </div>
          <div className="flex items-center space-x-2 shrink-0 ml-2">
            <div className="w-16 sm:w-24 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div className="bg-amber-400 h-full rounded-full transition-all duration-300" style={{ width: `${rival.progress_percent}%` }} />
            </div>
            <span className="text-amber-400 font-bold">{rival.progress_percent}%</span>
          </div>
        </div>
      )}

      {/* 3. EMERGENCY HAZARD TAKE-OVER (If triggered by Admin) */}
      {activeHazard && (
        <div className="mt-3 bg-gradient-to-r from-red-950 via-rose-900 to-amber-950 rounded-2xl p-4 border-2 border-red-500 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-red-600/30 border border-red-400 flex items-center justify-center text-red-300 shrink-0">
              <ShieldAlert className="w-7 h-7 text-red-400 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500 text-slate-950">
                  ALÉA FLASH EN DIRECT
                </span>
                <span className="text-xs font-mono font-bold text-amber-300">
                  +{activeHazard.points_bonus} PTS BONUS
                </span>
              </div>
              <h2 className="text-base font-black text-white mt-0.5">
                {activeHazard.title}
              </h2>
              <p className="text-xs text-rose-200 leading-tight">
                {activeHazard.message}
              </p>
              <div className="mt-2 text-xs font-mono text-white bg-red-950/90 px-3 py-1 rounded-xl border border-red-500/40 inline-block">
                ⚡ SCANNEZ : <strong className="text-amber-300">{activeHazard.expected_barcode}</strong>
              </div>
            </div>
          </div>

          <div className="bg-black/60 px-4 py-2 rounded-xl border border-red-500/40 font-mono text-center shrink-0">
            <span className="text-[10px] text-red-400 block font-bold">COMPTE À REBOURS</span>
            <span className="text-2xl font-black text-amber-300">{hazardSecondsRemaining}s</span>
          </div>
        </div>
      )}

      {/* 4. MAIN ACTION CARD : CURRENT PICKING ORDER */}
      <main className="my-auto py-3 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
        {currentStep ? (
          <div className="w-full bg-slate-900 rounded-3xl p-4 sm:p-7 border-2 border-indigo-500/40 shadow-2xl space-y-4">
            {/* Mission Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-mono font-bold text-sky-400 uppercase tracking-wider block">
                  {mission.code} • Mission {currentMissionIndex + 1}/{missions.length}
                </span>
                <h1 className="text-base sm:text-2xl font-black text-white tracking-tight">
                  {mission.title}
                </h1>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-mono text-slate-400 block">Étape</span>
                <span className="text-base sm:text-lg font-black font-mono text-sky-400">
                  {completedStepsCount + 1} / {totalStepsCount}
                </span>
              </div>
            </div>

            {/* Instruction Prompt */}
            <div className="bg-slate-950/80 p-3.5 sm:p-4 rounded-2xl border border-slate-800 space-y-1.5">
              <span className="text-[11px] font-mono uppercase font-bold text-amber-400 flex items-center space-x-1">
                <Zap className="w-3.5 h-3.5" />
                <span>Consigne d'action immédiate :</span>
              </span>
              <p className="text-sm sm:text-xl font-extrabold text-white leading-snug">
                {currentStep.instruction}
              </p>
            </div>

            {/* Big Physical Target Display */}
            <div className="bg-gradient-to-br from-slate-950 to-slate-900 p-4 sm:p-5 rounded-2xl border-2 border-dashed border-sky-500/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase font-mono text-slate-400 block font-bold">
                    {currentStep.barcodeType === 'location' ? '📍 Emplacement Étagère :' : currentStep.barcodeType === 'dock' ? '🚚 Quai d\'Expédition :' : '📦 Pièce / Colis à scanner :'}
                  </span>
                  {requiredQty > 1 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-black border border-amber-500/40">
                      Qté : {currentScannedQty}/{requiredQty} pcs
                    </span>
                  )}
                </div>
                <div className="text-base sm:text-lg font-black text-white flex items-center justify-center sm:justify-start space-x-2">
                  <span>{displayTargetLabel}</span>
                </div>
                {matchedItem?.lrCode && (
                  <span className="text-xs font-mono text-amber-400 font-bold block">
                    Réf L/R : {matchedItem.lrCode}
                  </span>
                )}
                {currentStep.hint && (
                  <p className="text-xs text-slate-400 italic pt-1">
                    💡 {currentStep.hint}
                  </p>
                )}
              </div>

              {/* Expected Barcode High-Vis Badge */}
              <div className="bg-slate-950 px-4 py-3 rounded-2xl border-2 border-amber-500/50 shadow-lg text-center shrink-0">
                <span className="text-[10px] text-slate-400 font-mono block">Code-barres attendu</span>
                <span className="text-base sm:text-xl font-black font-mono text-amber-300 tracking-wider">
                  {currentStep.expectedBarcode}
                </span>
              </div>
            </div>

            {/* DEDICATED VISIBLE WMS SCAN BOX FOR ZEBRA LASER & KEYSTROKES */}
            <div className="bg-slate-950 p-3 sm:p-4 rounded-2xl border-2 border-indigo-500/60 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <ScanBarcode className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>Zone de Scan Laser Zebra Active</span>
                </span>
                <span className="text-[10px] text-slate-500 hidden sm:inline">
                  Appuyez sur la gâchette jaune de la scannette
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    ref={scanInputRef}
                    type="text"
                    value={scanInputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Flashez au laser Zebra ou tapez ici..."
                    className="w-full bg-slate-900 border-2 border-slate-700 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-sm sm:text-base text-white font-mono font-bold tracking-wider placeholder:text-slate-500 focus:outline-none transition-all shadow-inner"
                    autoFocus
                  />
                  {scanInputValue && (
                    <span className="absolute right-3 top-2.5 text-xs font-mono text-amber-400 animate-pulse">
                      Lecture...
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (scanInputValue.trim()) {
                      triggerScan(scanInputValue);
                    }
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer shrink-0"
                >
                  OK
                </button>
              </div>
            </div>

            {/* Scanner Ready Indicator & Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                {/* CAMERA SCANNER BUTTON */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCameraOpen(true);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 cursor-pointer"
                  title="Scanner avec l'appareil photo du téléphone/terminal"
                >
                  <Camera className="w-4 h-4 text-sky-200" />
                  <span>Scanner Caméra</span>
                </button>

                {currentStep.barcodeType === 'article' && onDeclareAnomaly && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAnomalyQty(Math.max(0, currentScannedQty));
                      setIsAnomalyModalOpen(true);
                    }}
                    className="flex-1 sm:flex-none px-3 py-2.5 rounded-xl bg-amber-950/70 hover:bg-amber-900 border border-amber-500/50 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Écart Stock ?</span>
                  </button>
                )}

                {/* Dev Simulation Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerScan(currentStep.expectedBarcode);
                  }}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold border border-slate-700 transition-colors cursor-pointer"
                  title="Simule le scan si la douchette physique n'est pas connectée"
                >
                  Flasher {requiredQty > 1 ? `(${currentScannedQty + 1}/${requiredQty})` : ''}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Mission Completed Card */
          <div className="w-full bg-slate-900 rounded-3xl p-5 sm:p-8 border-2 border-emerald-500/80 text-center space-y-5 shadow-2xl animate-fade-in max-w-xl mx-auto">
            {/* Celebration Icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
              <Sparkles className="w-9 h-9 sm:w-11 sm:h-11 animate-pulse" />
            </div>

            {/* Heading */}
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 block mb-1">
                {currentMissionIndex + 1 < missions.length
                  ? `COMMANDE ${currentMissionIndex + 1}/${missions.length} EXPÉDIÉE !`
                  : 'CHALLENGE ACCOMPLI • TOUTES LES COMMANDES SONT TRAITÉES !'}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {currentMissionIndex + 1 < missions.length
                  ? 'Super travail d\'équipe !'
                  : '🏆 PERFORMANCE EXCEPTIONNELLE DU BINÔME !'}
              </h2>
            </div>

            {/* Score & Badges Dashboard */}
            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-around gap-2">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                  Score Duo
                </span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                  {score} <span className="text-xs text-slate-400 font-normal">pts</span>
                </span>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                  Temps Restant
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-amber-300">
                  {formatTime(shiftSecondsRemaining)}
                </span>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                  Précision
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-sky-400">
                  100%
                </span>
              </div>
            </div>

            {/* Action Buttons based on status */}
            <div className="space-y-3 pt-1">
              {currentMissionIndex + 1 < missions.length ? (
                /* Next Mission Available */
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNextMission?.();
                    }}
                    className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-display font-black text-base sm:text-lg rounded-2xl shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>PASSER À LA COMMANDE SUIVANTE ({currentMissionIndex + 2}/{missions.length})</span>
                    <ChevronRight className="w-5 h-5 stroke-[3]" />
                  </button>
                  <p className="text-xs font-mono text-emerald-300/80 animate-pulse">
                    ⚡ Passage automatique dans quelques instants, ou cliquez ci-dessus pour enchaîner immédiatement !
                  </p>
                </div>
              ) : (
                /* All Missions Finished in this wave */
                <div className="space-y-3">
                  {/* Big Gold Diploma Button */}
                  {onOpenDiplome && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDiplome();
                      }}
                      className="w-full py-4 px-6 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-display font-black text-base sm:text-lg rounded-2xl shadow-xl shadow-amber-400/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Award className="w-6 h-6 text-slate-950 fill-current" />
                      <span>DÉCOUVRIR NOTRE DIPLÔME D'HONNEUR 📜</span>
                    </button>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {/* New Wave Button (if time remaining) */}
                    {onNextMission && shiftSecondsRemaining > 10 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNextMission();
                        }}
                        className="py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs sm:text-sm rounded-xl border border-indigo-400/40 flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02]"
                      >
                        <Zap className="w-4 h-4 text-amber-300" />
                        <span>NOUVELLE VAGUE (+BONUS)</span>
                      </button>
                    )}

                    {/* Reset for New Duo Button */}
                    {onRestartShift && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRestartShift();
                        }}
                        className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono font-bold text-xs sm:text-sm rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <RotateCcw className="w-4 h-4 text-slate-400" />
                        <span>Nouveau Binôme (Remise à zéro)</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 5. FOOTER FEEDBACK (Last scan log) */}
      <footer className="mt-auto pt-2 shrink-0 text-center font-mono text-xs text-slate-500">
        {lastScannedCode ? (
          <div className="inline-flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
            <span className="text-slate-400">Dernier code flashé :</span>
            <strong className="text-emerald-400 font-bold">{lastScannedCode}</strong>
          </div>
        ) : (
          <span>Visez les étiquettes avec le laser de la douchette ou le scanner caméra.</span>
        )}
      </footer>

      {/* CAMERA SCANNER MODAL */}
      <CameraScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onScan={(code) => triggerScan(code)}
        expectedCodeHint={activeHazard ? activeHazard.expected_barcode : currentStep?.expectedBarcode}
      />

      {/* ANOMALIE DE STOCK MODAL (ZEBRA COMPACT) */}
      {isAnomalyModalOpen && currentStep && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/70 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-2.5 text-amber-400">
              <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse shrink-0" />
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-amber-400 block">
                  Écart de Stock Réel
                </span>
                <h3 className="text-base font-black text-white">{displayTargetLabel}</h3>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="text-slate-300">
                <span className="text-slate-500 font-mono">Attendu commande : </span>
                <strong className="text-amber-400">{requiredQty} pcs</strong>
              </div>
              <div className="text-white font-bold pt-1">
                Combien de pièces sont réellement présentes en rayon ?
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].filter(n => n < requiredQty).map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setAnomalyQty(qty)}
                  className={`py-2.5 rounded-xl font-mono font-black text-xs border transition-all ${
                    anomalyQty === qty 
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {qty === 0 ? '0 (Rupture)' : `${qty} pc`}
                </button>
              ))}
            </div>

            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[10px] text-amber-200">
              🛡️ <strong>Bonus Vigilance : +400 pts</strong> (Ajuste le stock WMS sans bloquer la livraison)
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAnomalyModalOpen(false)}
                className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeclareAnomaly) {
                    onDeclareAnomaly(anomalyQty);
                  }
                  setIsAnomalyModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/30 flex items-center space-x-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Valider (+400 pts)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
