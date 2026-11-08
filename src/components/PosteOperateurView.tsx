import React, { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Mission, ScanLog, InventoryItem, DuoStation, LiveHazard } from '../types';
import { 
  CheckCircle2, 
  MapPin, 
  Package, 
  Sparkles, 
  Zap, 
  Flame, 
  Users, 
  Swords, 
  Clock, 
  ShieldAlert,
  ArrowRight,
  List,
  RotateCcw,
  Check,
  AlertTriangle
} from 'lucide-react';
import { barcodeListener } from '../services/barcodeListener';

interface PosteOperateurViewProps {
  missions: Mission[];
  currentMissionIndex: number;
  onSelectMission: (idx: number) => void;
  onResetMission: () => void;
  onClearLogs?: () => void;
  logs: ScanLog[];
  inventory: InventoryItem[];
  lastScannedCode: string | null;
  flashState: 'green' | 'red' | null;
  stationId: string;
  stationName: string;
  onSelectStation: (id: string, name: string) => void;
  operatorCea: string;
  clientGuest: string;
  onUpdateDuo: (cea: string, client: string) => void;
  combo: number;
  liveStations: DuoStation[];
  activeHazard?: LiveHazard | null;
  hazardSecondsRemaining?: number;
  onTriggerSurpriseOrder?: () => void;
  onStartNewMatch?: () => void;
  onBackToHome?: () => void;
}

// Scannable SVG barcode ticket (ultra clean and responsive)
const BarcodeTicket: React.FC<{ code: string; label?: string }> = ({ code, label }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && code) {
      try {
        JsBarcode(svgRef.current, code, {
          format: 'CODE128',
          lineColor: '#0f172a',
          width: 2.0,
          height: 48,
          displayValue: true,
          fontSize: 13,
          font: 'monospace',
          fontOptions: 'bold',
          margin: 6,
          background: '#ffffff'
        });
      } catch (err) {
        console.error('JsBarcode error', err);
      }
    }
  }, [code]);

  return (
    <div className="bg-white text-slate-900 px-4 py-2.5 rounded-2xl shadow-xl border-2 border-slate-300 inline-flex flex-col items-center justify-center shrink-0">
      {label && (
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1 font-mono text-center max-w-[240px] truncate">
          {label}
        </span>
      )}
      <svg ref={svgRef} className="max-w-full h-auto"></svg>
      <span className="text-[9px] text-slate-400 font-mono mt-0.5 tracking-tight">Scannable à la douchette</span>
    </div>
  );
};

export const PosteOperateurView: React.FC<PosteOperateurViewProps> = ({
  missions,
  currentMissionIndex,
  onSelectMission,
  onResetMission,
  logs,
  inventory,
  flashState,
  stationId,
  stationName,
  onSelectStation,
  operatorCea,
  clientGuest,
  onUpdateDuo,
  combo,
  liveStations,
  activeHazard,
  hazardSecondsRemaining,
  onTriggerSurpriseOrder,
  onStartNewMatch,
  onBackToHome
}) => {
  const [isDuoModalOpen, setIsDuoModalOpen] = useState(false);
  const [ceaInput, setCeaInput] = useState(operatorCea);
  const [clientInput, setClientInput] = useState(clientGuest);
  const [showLogsDrawer, setShowLogsDrawer] = useState(false);

  const mission = missions[currentMissionIndex] || missions[0];
  const currentStepIndex = mission.steps.findIndex((s) => !s.completed);
  const currentStep = currentStepIndex !== -1 ? mission.steps[currentStepIndex] : null;
  const isMissionFinished = mission.steps.every((s) => s.completed);

  const progressPercent = Math.round(
    (mission.steps.filter((s) => s.completed).length / mission.steps.length) * 100
  );

  // Opponent station in duel
  const opponentStation = liveStations.find((s) => s.station_id !== stationId);

  // Global shortcut: Spacebar triggers the current target scan if not typing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.code === 'Space' && currentStep) {
        e.preventDefault();
        barcodeListener.simulateScan(currentStep.expectedBarcode);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep]);

  const handleSaveDuo = (e: React.FormEvent) => {
    e.preventDefault();
    if (ceaInput.trim() || clientInput.trim()) {
      onUpdateDuo(ceaInput.trim() || 'Collaborateur GT', clientInput.trim() || 'Invité');
      setIsDuoModalOpen(false);
    }
  };

  const isDuo1 = stationId === 'poste-1';

  return (
    <div className={`min-h-[calc(100vh-65px)] flex flex-col justify-between p-3 sm:p-5 max-w-5xl mx-auto w-full transition-colors duration-200 select-none ${
      flashState === 'green' ? 'bg-emerald-950/20' : flashState === 'red' ? 'bg-rose-950/20' : ''
    }`}>

      {/* 1. HUD SUPÉRIEUR ÉPURÉ (Duo • Course Duel • Combo) */}
      <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left: Duo Identity Pill */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCeaInput(operatorCea);
              setClientInput(clientGuest);
              setIsDuoModalOpen(true);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs sm:text-sm font-bold shadow-sm transition-all hover:scale-105 cursor-pointer ${
              isDuo1 
                ? 'bg-sky-950/70 border-sky-500/50 text-sky-200' 
                : 'bg-amber-950/70 border-amber-500/50 text-amber-200'
            }`}
            title="Modifier le Duo"
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>
              <strong className="text-white">{operatorCea}</strong> 🤝 <strong className={isDuo1 ? 'text-sky-300' : 'text-amber-300'}>{clientGuest}</strong>
            </span>
            <span className="text-[10px] font-mono opacity-70 ml-1">({stationName.split(' ')[0]})</span>
          </button>

          {/* Shuffle / Next Match */}
          {onStartNewMatch && (
            <button
              onClick={onStartNewMatch}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700 transition-all cursor-pointer"
              title="Mélanger les missions pour un nouveau match"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </button>
          )}
        </div>

        {/* Center: Live Duel Bar (Minimalist Esport Race) */}
        {opponentStation ? (
          <div className="flex items-center gap-2.5 bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-indigo-500/30 text-xs font-mono">
            <Swords className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
            <div className="flex items-center gap-2">
              <span className="text-sky-400 font-black">Vous : {progressPercent}%</span>
              <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-sky-400 h-full rounded-full" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>
            <span className="text-slate-600 font-bold">VS</span>
            <div className="flex items-center gap-2">
              <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full" style={{ width: `${opponentStation.progress_percent}%` }}></div>
              </div>
              <span className="text-amber-400 font-black">{opponentStation.progress_percent}% ({opponentStation.team_name.split(' ')[0]})</span>
            </div>
          </div>
        ) : (
          /* Mission indicator if solo */
          <div className="text-xs font-mono font-bold text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Mission {currentMissionIndex + 1}/{missions.length} : {mission.title.slice(0, 30)}</span>
          </div>
        )}

        {/* Right: Combo & Scanner Status */}
        <div className="flex items-center gap-2.5">
          {combo > 1 ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs font-mono shadow-lg shadow-orange-500/30 animate-pulse">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>COMBO x{combo}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-slate-500 text-xs font-mono">
              <Flame className="w-3.5 h-3.5" />
              <span>x1</span>
            </div>
          )}

          {/* Douchette Ready Indicator */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span className="text-emerald-400 font-bold hidden sm:inline">Scannette Prête</span>
          </div>

          {/* Quick Logs Drawer Toggle */}
          <button
            onClick={() => setShowLogsDrawer(!showLogsDrawer)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 text-xs"
            title="Afficher les derniers scans"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. EMERGENCY HAZARD BANNER (SIREN & FLASH DEMAND) */}
      {activeHazard && (
        <div className="my-3 bg-gradient-to-r from-rose-950 via-red-900 to-amber-950 rounded-3xl p-4 sm:p-5 border-2 border-red-500 shadow-2xl shadow-rose-950/70 flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-600/30 border border-red-400 flex items-center justify-center text-red-300 shrink-0">
              <ShieldAlert className="w-8 h-8 text-red-400 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-red-500 text-slate-950">
                  ALÉA CLIENT PRIORITAIRE
                </span>
                <span className="text-xs font-mono font-bold text-amber-300">
                  +{activeHazard.points_bonus} PTS BONUS
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white mt-1">
                {activeHazard.title}
              </h3>
              <p className="text-xs text-rose-200 mt-0.5">
                {activeHazard.message}
              </p>
              <div className="mt-2 text-xs font-mono text-white bg-red-950 px-3 py-1.5 rounded-xl border border-red-500/40 inline-flex items-center gap-2">
                <span className="text-amber-400 font-bold">Action :</span>
                <span>Scannez immédiatement : <strong>{activeHazard.expected_barcode}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex flex-col items-center bg-black/70 px-4 py-2 rounded-2xl border border-red-500 font-mono text-center">
              <span className="text-[10px] text-red-400 font-bold">TEMPS RESTANT</span>
              <span className="text-3xl font-black text-amber-300">
                {hazardSecondsRemaining ?? activeHazard.time_limit_seconds}s
              </span>
            </div>
            <BarcodeTicket code={activeHazard.expected_barcode} label="ALÉA" />
          </div>
        </div>
      )}

      {/* 3. CARTE D'ACTION CENTRALE GÉANTE (ARCADE ULTRA ÉPURÉE) */}
      <div className="my-auto py-3">
        {currentStep ? (
          <div className="bg-slate-900/90 rounded-3xl p-5 sm:p-8 border-2 border-sky-500/50 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            {/* Top Mission Step Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-black text-sm shadow-md shadow-sky-500/30">
                  {currentStepIndex + 1}
                </span>
                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400">
                    ÉTAPE {currentStepIndex + 1} SUR {mission.steps.length}
                  </span>
                  <h2 className="text-sm font-semibold text-slate-300">
                    {mission.title}
                  </h2>
                </div>
              </div>

              {/* Step Type Pill */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-slate-950 text-slate-300 border border-slate-800">
                  {currentStep.barcodeType === 'location' ? '📍 EMPLACEMENT' : currentStep.barcodeType === 'dock' ? '🚚 EXPÉDITION' : '📦 ARTICLE'}
                </span>
              </div>
            </div>

            {/* BIG ACTION INSTRUCTION */}
            <div className="text-center my-4 sm:my-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 font-mono text-xs font-bold mb-3">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>INSTRUCTION EN DIRECT</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-snug">
                {currentStep.instruction}
              </h1>

              {currentStep.hint && (
                <p className="text-xs sm:text-sm text-slate-400 font-sans mt-2 max-w-xl mx-auto">
                  💡 {currentStep.hint}
                </p>
              )}
            </div>

            {/* TARGET CODE & SCANNABLE BARCODE (HERO DISPLAY) */}
            <div className="my-6 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 bg-slate-950/70 p-5 sm:p-7 rounded-3xl border border-slate-800">
              {/* Target info */}
              <div className="text-center sm:text-left space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                  Cible physique à viser :
                </span>
                <div className="text-2xl sm:text-3xl font-black text-sky-300 font-mono tracking-wider">
                  {currentStep.expectedBarcode}
                </div>
                <div className="text-xs text-slate-300 font-semibold">
                  {currentStep.targetLabel}
                </div>
              </div>

              {/* Scannable Barcode SVG */}
              <BarcodeTicket
                code={currentStep.expectedBarcode}
                label={currentStep.targetLabel}
              />
            </div>

            {/* BIG CLICKABLE ACTION BUTTON (FOR BACKUP OR TOUCHSCREEN) */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => barcodeListener.simulateScan(currentStep.expectedBarcode)}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-base sm:text-lg rounded-2xl shadow-xl shadow-amber-500/25 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Zap className="w-5 h-5 text-slate-950 fill-current" />
                <span>FLASHER LE CODE ATTENDU : {currentStep.expectedBarcode}</span>
              </button>

              <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                Raccourci clavier : [ESPACE]
              </span>
            </div>
          </div>
        ) : (
          /* MISSION COMPLETED CELEBRATION CARD */
          <div className="bg-slate-900/95 rounded-3xl p-8 border-2 border-emerald-500 text-center shadow-2xl">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
            </div>
            <h2 className="text-3xl font-black text-white">
              MISSION ACCOMPLIE ! 🎉
            </h2>
            <p className="text-slate-300 text-sm max-w-md mx-auto mt-2">
              Félicitations au Duo <strong>{operatorCea}</strong> & <strong>{clientGuest}</strong> pour cette préparation parfaite !
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              {currentMissionIndex < missions.length - 1 ? (
                <button
                  onClick={() => onSelectMission(currentMissionIndex + 1)}
                  className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center gap-2 cursor-pointer"
                >
                  <span>Passer à la Mission Suivante</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={onStartNewMatch}
                  className="px-8 py-3.5 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white font-black text-base rounded-2xl shadow-lg shadow-sky-500/30 flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Nouveau Match (Mélanger)</span>
                </button>
              )}

              <button
                onClick={onResetMission}
                className="px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold text-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Rejouer</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. TIMELINE ÉPURÉE DES ÉTAPES DU FLUX LOGISTIQUE */}
      <div className="bg-slate-900/90 rounded-2xl p-3 sm:p-4 border border-slate-800 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
            Flux Logistique ({mission.steps.filter((s) => s.completed).length}/{mission.steps.length} étapes)
          </span>
          <span className="text-xs font-mono font-bold text-sky-400">{progressPercent}%</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {mission.steps.map((st, i) => {
            const isDone = st.completed;
            const isCurrent = i === currentStepIndex;

            return (
              <div
                key={st.id || i}
                className={`p-2 rounded-xl border text-xs flex items-center gap-2 transition-all ${
                  isDone
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 font-semibold'
                    : isCurrent
                    ? 'bg-sky-950/80 border-sky-400 text-white font-bold ring-2 ring-sky-500/30 shadow-md shadow-sky-500/20'
                    : 'bg-slate-950/40 border-slate-800/80 text-slate-500'
                }`}
              >
                {isDone ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 font-mono ${
                    isCurrent ? 'bg-sky-500 text-slate-950 font-black' : 'border border-slate-700 text-slate-500'
                  }`}>
                    {i + 1}
                  </span>
                )}
                <span className="truncate text-[11px]">{st.targetLabel}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* QUICK DRAWER FOR LOGS (OPTIONAL OVERLAY) */}
      {showLogsDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md p-5 flex flex-col justify-between shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <List className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-sm text-white">Journal des Scans</h3>
              </div>
              <button
                onClick={() => setShowLogsDrawer(false)}
                className="text-slate-400 hover:text-white font-mono text-sm px-2 py-1"
              >
                ✕ Fermer
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-4">
              {logs.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">Aucun scan enregistré pour le moment.</p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-2.5 rounded-xl border text-xs font-mono ${
                      log.status === 'valid'
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>{log.barcode}</span>
                      <span className="text-[10px] opacity-60">{log.timestamp}</span>
                    </div>
                    <p className="text-[11px] font-sans opacity-80 mt-0.5">{log.message}</p>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowLogsDrawer(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold"
            >
              Fermer le journal
            </button>
          </div>
        </div>
      )}

      {/* MODAL DUO */}
      {isDuoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveDuo} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-slate-100">
            <h3 className="font-black text-lg text-white mb-4">Modifier le Binôme</h3>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Collaborateur GT</label>
                <input
                  type="text"
                  value={ceaInput}
                  onChange={(e) => setCeaInput(e.target.value)}
                  placeholder="Ex: Jeremy (GT)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Invité</label>
                <input
                  type="text"
                  value={clientInput}
                  onChange={(e) => setClientInput(e.target.value)}
                  placeholder="Nom de l'invité"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-amber-300"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDuoModalOpen(false)}
                className="px-4 py-2 bg-slate-800 rounded-xl text-xs"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
