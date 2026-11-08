import React, { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Mission, ScanLog, InventoryItem, DuoStation } from '../types';
import { 
  CheckCircle2, 
  AlertTriangle, 
  MapPin, 
  Package, 
  Radio, 
  Play, 
  RotateCcw,
  Sparkles,
  Zap,
  Barcode,
  Keyboard,
  Info,
  Flame,
  Users,
  Swords,
  Edit3
} from 'lucide-react';
import { BARCODE_CATALOG } from '../data/initialData';
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
}

// On-screen scannable SVG barcode for douchette or visual reference
const BarcodeTicket: React.FC<{ code: string; label?: string }> = ({ code, label }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && code) {
      try {
        JsBarcode(svgRef.current, code, {
          format: 'CODE128',
          lineColor: '#000000',
          width: 1.6,
          height: 38,
          displayValue: true,
          fontSize: 12,
          font: 'monospace',
          fontOptions: 'bold',
          margin: 4,
          background: '#ffffff'
        });
      } catch (err) {
        console.error('JsBarcode error', err);
      }
    }
  }, [code]);

  return (
    <div className="bg-white text-slate-900 p-2.5 rounded-xl shadow-lg border-2 border-slate-200 inline-flex flex-col items-center justify-center shrink-0">
      {label && (
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mb-1 font-mono text-center max-w-[200px] truncate">
          {label}
        </span>
      )}
      <svg ref={svgRef} className="max-w-full h-auto"></svg>
      <span className="text-[9px] text-slate-400 font-mono mt-0.5">Scannable à l'écran</span>
    </div>
  );
};

export const PosteOperateurView: React.FC<PosteOperateurViewProps> = ({
  missions,
  currentMissionIndex,
  onSelectMission,
  onResetMission,
  onClearLogs,
  logs,
  inventory,
  lastScannedCode,
  flashState,
  stationId,
  stationName,
  onSelectStation,
  operatorCea,
  clientGuest,
  onUpdateDuo,
  combo,
  liveStations
}) => {
  const [manualInput, setManualInput] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'article' | 'location' | 'package'>('all');
  const [isDuoModalOpen, setIsDuoModalOpen] = useState(false);
  const [ceaInput, setCeaInput] = useState(operatorCea);
  const [clientInput, setClientInput] = useState(clientGuest);
  
  const mission = missions[currentMissionIndex] || missions[0];
  const currentStep = mission.steps.find((s) => !s.completed) || null;
  const progressPercent = Math.round(
    (mission.steps.filter((s) => s.completed).length / mission.steps.length) * 100
  );

  // Other duel stations currently playing
  const otherStations = liveStations.filter((s) => s.station_id !== stationId);

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

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      barcodeListener.simulateScan(manualInput.trim());
      setManualInput('');
    }
  };

  const handleSaveDuo = (e: React.FormEvent) => {
    e.preventDefault();
    if (ceaInput.trim() || clientInput.trim()) {
      onUpdateDuo(ceaInput.trim() || 'Agent CEA', clientInput.trim() || 'Client Invité');
      setIsDuoModalOpen(false);
    }
  };

  const filteredBarcodes = BARCODE_CATALOG.filter((bc) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'article') return bc.type === 'article' || bc.type === 'seal';
    if (selectedFilter === 'location') return bc.type === 'location' || bc.type === 'dock';
    if (selectedFilter === 'package') return bc.type === 'package';
    return true;
  });

  return (
    <div className={`min-h-[calc(100vh-65px)] flex flex-col p-2.5 sm:p-4 gap-3 transition-colors duration-200 ${
      flashState === 'green' ? 'bg-emerald-950/25' : flashState === 'red' ? 'bg-rose-950/25' : ''
    }`}>
      {/* Station, Duo & Combo Banner */}
      <div className="bg-slate-900 rounded-2xl p-3 sm:p-3.5 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-3">
        {/* Left: Station & Duo identity */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Station selector */}
          <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 font-mono text-xs">
            <span className="text-slate-400 font-medium">Poste :</span>
            <select
              value={stationId}
              onChange={(e) => {
                const val = e.target.value;
                const name = val === 'poste-1' ? 'Poste 1 (Scannette A)' : val === 'poste-2' ? 'Poste 2 (Scannette B)' : 'Poste 3 (Zebra Scan)';
                onSelectStation(val, name);
              }}
              className="bg-transparent text-sky-400 font-bold focus:outline-none cursor-pointer"
            >
              <option value="poste-1" className="bg-slate-900">Poste 1 (Scannette A)</option>
              <option value="poste-2" className="bg-slate-900">Poste 2 (Scannette B)</option>
              <option value="poste-3" className="bg-slate-900">Poste 3 (Zebra Scan)</option>
            </select>
          </div>

          {/* Duo Profile Pill */}
          <button
            onClick={() => {
              setCeaInput(operatorCea);
              setClientInput(clientGuest);
              setIsDuoModalOpen(true);
            }}
            className="flex items-center space-x-2 bg-gradient-to-r from-indigo-950/80 to-slate-950 hover:from-indigo-900/80 px-3 py-1.5 rounded-xl border border-indigo-500/40 text-xs font-semibold text-slate-200 shadow-sm transition-all"
            title="Cliquez pour changer le binôme (Agent CEA + Invité)"
          >
            <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Duo : <strong className="text-sky-300">{operatorCea}</strong> 🤝 <strong className="text-amber-300">{clientGuest}</strong></span>
            <Edit3 className="w-3 h-3 text-slate-400" />
          </button>
        </div>

        {/* Right: Combo & Scanner Status */}
        <div className="flex items-center space-x-2.5 ml-auto">
          {/* Combo badge */}
          {combo > 1 ? (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs font-mono shadow-lg shadow-orange-500/30 animate-pulse">
              <Flame className="w-4 h-4 fill-current" />
              <span>COMBO x{combo} (+{combo * 50} pts)</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center space-x-1 text-slate-500 text-xs font-mono">
              <Flame className="w-3.5 h-3.5" />
              <span>Combo x1</span>
            </div>
          )}

          {/* Scanner Douchette Status */}
          <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span className="text-emerald-400 font-bold hidden sm:inline">Scannette Prête</span>
            <span className="text-emerald-400 font-bold sm:hidden">Prêt</span>
          </div>
        </div>
      </div>

      {/* Live Duel Bar (if other stations are connected) */}
      {otherStations.length > 0 && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 rounded-2xl p-3 border border-indigo-500/30 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-300 shrink-0">
            <Swords className="w-4 h-4 text-amber-400 animate-bounce" />
            <span className="font-bold uppercase text-white">Duel en Direct :</span>
          </div>

          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            {/* My station */}
            <div className="bg-slate-950/70 px-3 py-1.5 rounded-xl border border-sky-500/40 flex items-center justify-between">
              <span className="text-sky-300 font-bold truncate">Vous ({stationName.split(' ')[0]})</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 sm:w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-sky-400 h-full rounded-full" style={{ width: `${progressPercent}%` }}></div>
                </div>
                <span className="text-sky-400 font-bold">{progressPercent}%</span>
              </div>
            </div>

            {/* Other station */}
            {otherStations.slice(0, 1).map((os) => (
              <div key={os.station_id} className="bg-slate-950/70 px-3 py-1.5 rounded-xl border border-amber-500/40 flex items-center justify-between">
                <span className="text-amber-300 font-bold truncate">{os.station_name.split(' ')[0]} ({os.team_name})</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 sm:w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-400 h-full rounded-full" style={{ width: `${os.progress_percent}%` }}></div>
                  </div>
                  <span className="text-amber-400 font-bold">{os.progress_percent}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Banner: Mission Selector */}
      <div className="bg-slate-900/90 rounded-2xl p-2.5 sm:p-3 border border-slate-800 flex items-center gap-2 overflow-x-auto shadow-lg shrink-0">
        <span className="text-xs font-bold text-slate-400 font-mono px-2 uppercase tracking-wider whitespace-nowrap">
          Missions :
        </span>
        {missions.map((m, idx) => {
          const isFinished = m.steps.every((s) => s.completed);
          const isSelected = idx === currentMissionIndex;
          return (
            <button
              key={m.id || idx}
              onClick={() => onSelectMission(idx)}
              className={`flex items-center space-x-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-600/30'
                  : isFinished
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-700/50 hover:bg-emerald-900/50'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {isFinished ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Play className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
              )}
              <span>Mission {idx + 1}</span>
              <span className="text-[10px] opacity-75 hidden md:inline">
                ({m.title.slice(0, 20)}...)
              </span>
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <button
            onClick={onResetMission}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700 transition-colors"
            title="Recommencer cette mission"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Réinitialiser</span>
          </button>
        </div>
      </div>

      {/* Main Mission Workstation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 flex-1 items-start">
        {/* Left 2 Cols: Active Mission Card & Big Action Prompt */}
        <div className="lg:col-span-2 flex flex-col gap-3.5">
          <div className="bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-800 shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div>
              {/* Mission Header */}
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider">
                      {mission.code}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      {mission.priority}
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    {mission.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 mt-0.5 flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="font-medium text-slate-200">{mission.client}</span>
                  </p>
                </div>

                {/* Points Pill */}
                <div className="text-right shrink-0 bg-slate-950/60 px-3 py-1.5 rounded-2xl border border-slate-800">
                  <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                    +{mission.basePoints}
                  </div>
                  <div className="text-[9px] text-slate-400 uppercase font-mono">Points Mission</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                  <span>Progression de la mission</span>
                  <span className="font-mono text-white">{progressPercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full transition-all duration-500 shadow-lg shadow-emerald-500/20"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Big Interactive Action Box (THE TARGET PROMPT) */}
              {currentStep ? (
                <div className="bg-slate-950/90 rounded-2xl p-4 sm:p-5 border-2 border-sky-500/50 shadow-2xl relative overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-sky-500 text-slate-950 font-black text-xs">
                        {mission.steps.indexOf(currentStep) + 1}
                      </span>
                      <span className="text-xs uppercase font-mono font-bold text-sky-400">
                        Action Requise au Scanner :
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>Douchette physique ou 1-clic direct</span>
                    </div>
                  </div>

                  <p className="text-base sm:text-lg font-bold text-white mb-3 leading-snug">
                    {currentStep.instruction}
                  </p>

                  {/* Target Details & Scannable Barcode Ticket */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
                    <div className="flex-1 space-y-1.5">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-slate-400 block">Cible à viser :</span>
                        <span className="text-sm font-semibold text-slate-100 flex items-center space-x-1.5">
                          <Package className="w-4 h-4 text-sky-400 shrink-0" />
                          <span>{currentStep.targetLabel}</span>
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-mono text-slate-400 block">Code attendu :</span>
                        <span className="font-mono text-base font-black text-amber-400 tracking-wider">
                          {currentStep.expectedBarcode}
                        </span>
                      </div>

                      {currentStep.hint && (
                        <div className="text-xs text-slate-400 flex items-center space-x-1.5 italic pt-1">
                          <span className="font-semibold text-slate-300">💡 Conseil :</span>
                          <span>{currentStep.hint}</span>
                        </div>
                      )}
                    </div>

                    {/* Scannable Barcode on Screen */}
                    <div className="flex flex-col items-center justify-center shrink-0">
                      <BarcodeTicket code={currentStep.expectedBarcode} label={currentStep.targetLabel} />
                    </div>
                  </div>

                  {/* HIGH-VISIBILITY DIRECT 1-CLICK ACTION BUTTON */}
                  <div className="mt-3.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <button
                      type="button"
                      onClick={() => barcodeListener.simulateScan(currentStep.expectedBarcode)}
                      className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-sm flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/30 transition-transform active:scale-[0.98] ring-2 ring-amber-400/50 cursor-pointer"
                    >
                      <Zap className="w-4 h-4 fill-current shrink-0" />
                      <span>🎯 FLASHER LE CODE ATTENDU : {currentStep.expectedBarcode}</span>
                    </button>

                    <div className="hidden md:flex items-center space-x-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-mono shrink-0">
                      <Keyboard className="w-3.5 h-3.5 text-slate-400" />
                      <span>Raccourci : [ESPACE]</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-950/40 rounded-2xl p-6 sm:p-8 border-2 border-emerald-500/50 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2.5 shadow-lg shadow-emerald-500/20">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-black text-emerald-400 mb-1">MISSION ACCOMPLIE AVEC SUCCÈS !</h3>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mb-4">
                    Toutes les étapes ont été validées sans accroc. Le score de votre binôme a été synchronisé en temps réel sur le cloud !
                  </p>
                  <button
                    onClick={onResetMission}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                  >
                    Rejouer cette mission
                  </button>
                </div>
              )}
            </div>

            {/* Steps Checklist Overview */}
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Étapes du flux logistique :
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {mission.steps.map((st, i) => (
                  <div
                    key={st.id || i}
                    className={`p-2 rounded-xl border text-xs flex items-center space-x-2 ${
                      st.completed
                        ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                        : st === currentStep
                        ? 'bg-sky-950/40 border-sky-400/60 text-white font-bold'
                        : 'bg-slate-950/40 border-slate-800 text-slate-500'
                    }`}
                  >
                    {st.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px] shrink-0">
                        {i + 1}
                      </div>
                    )}
                    <span className="truncate">{st.targetLabel}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Logs & Stocks */}
        <div className="flex flex-col gap-3.5">
          {/* Logs Card */}
          <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-xl flex flex-col h-[280px]">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 shrink-0">
              <span className="text-xs font-bold font-mono text-slate-200 uppercase">Journal Scannette en Direct</span>
              {onClearLogs && (
                <button
                  onClick={onClearLogs}
                  className="text-[10px] text-slate-500 hover:text-slate-300 font-mono"
                >
                  Effacer
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pt-2 pr-1">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 italic text-center p-4">
                  En attente du premier coup de douchette...
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-2 rounded-xl border text-xs font-mono flex items-start justify-between gap-2 transition-all ${
                      log.status === 'valid'
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-1.5 font-bold">
                        {log.status === 'valid' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        )}
                        <span>{log.barcode}</span>
                      </div>
                      <p className="text-[11px] opacity-80 mt-0.5 font-sans leading-tight">{log.message}</p>
                    </div>
                    <span className="text-[10px] opacity-60 shrink-0">{log.timestamp}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Stock ERP Card */}
          <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-xl flex flex-col h-[280px]">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 shrink-0">
              <span className="text-xs font-bold font-mono text-slate-200 uppercase">Aperçu Stock Réel (ERP)</span>
              <span className="text-[10px] text-slate-400 font-mono">Mis à jour au scan</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 pt-1 pr-1">
              {inventory.slice(0, 6).map((it) => (
                <div key={it.id} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-200 block truncate max-w-[160px]">{it.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 flex items-center space-x-1">
                      <MapPin className="w-2.5 h-2.5 text-amber-400" />
                      <span>{it.location}</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`font-mono font-bold text-sm ${it.quantity <= 10 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {it.quantity}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">{it.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Duo Name Edit Modal */}
      {isDuoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl border border-slate-700 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-2.5 text-white">
              <Users className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold">Identité du Binôme (Duo Joueur)</h3>
            </div>
            <p className="text-xs text-slate-300">
              Personnalisez les noms affichés sur le poste et sur l'écran TV en régie :
            </p>

            <form onSubmit={handleSaveDuo} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Nom de l'Opérateur CEA (hôte) :</label>
                <input
                  type="text"
                  value={ceaInput}
                  onChange={(e) => setCeaInput(e.target.value)}
                  placeholder="Ex: Pierre (Logistique)"
                  className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-sm text-white font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Nom du Client Invité :</label>
                <input
                  type="text"
                  value={clientInput}
                  onChange={(e) => setClientInput(e.target.value)}
                  placeholder="Ex: Dr. Martin (LETI)"
                  className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-sm text-white font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDuoModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
                >
                  Valider le Duo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
