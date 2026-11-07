import React, { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Mission, ScanLog, InventoryItem } from '../types';
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
  Info
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
        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight mb-0.5 truncate max-w-[220px]">
          {label}
        </span>
      )}
      <svg ref={svgRef} className="max-w-[240px] h-auto" />
      <span className="text-[8px] font-mono text-slate-400 mt-0.5 uppercase tracking-wider">
        Scannable par douchette
      </span>
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
  flashState
}) => {
  const [manualInput, setManualInput] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'article' | 'location' | 'package'>('all');
  
  const mission = missions[currentMissionIndex];
  const currentStep = mission.steps.find((s) => !s.completed) || null;
  const progressPercent = Math.round(
    (mission.steps.filter((s) => s.completed).length / mission.steps.length) * 100
  );

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

  const filteredBarcodes = BARCODE_CATALOG.filter((bc) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'article') return bc.type === 'article' || bc.type === 'seal';
    if (selectedFilter === 'location') return bc.type === 'location' || bc.type === 'dock';
    if (selectedFilter === 'package') return bc.type === 'package';
    return true;
  });

  return (
    <div className={`min-h-[calc(100vh-65px)] flex flex-col p-3 sm:p-4 gap-3.5 transition-colors duration-200 ${
      flashState === 'green' ? 'bg-emerald-950/25' : flashState === 'red' ? 'bg-rose-950/25' : ''
    }`}>
      {/* Top Banner: Mission Selector & Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 shrink-0">
        {/* Mission Selector Tabs */}
        <div className="lg:col-span-2 bg-slate-900/90 rounded-2xl p-2.5 sm:p-3 border border-slate-800 flex items-center gap-2 overflow-x-auto shadow-lg">
          <span className="text-xs font-bold text-slate-400 font-mono px-2 uppercase tracking-wider whitespace-nowrap">
            Missions 25 Ans :
          </span>
          {missions.map((m, idx) => {
            const isFinished = m.steps.every((s) => s.completed);
            const isSelected = idx === currentMissionIndex;
            return (
              <button
                key={m.id}
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
                  ({m.priority === 'URGENCE CRITIQUE' ? 'Urgence' : m.priority === 'STANDARD' ? 'Réception Edwards' : 'Export Silicium'})
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

        {/* Scanner Douchette Status Widget */}
        <div className="bg-slate-900/90 rounded-2xl p-2.5 sm:p-3 border border-slate-800 flex items-center justify-between shadow-lg shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-200">RÉCEPTACLE DOUCHETTE</span>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-[11px] text-slate-400 font-mono">Scanner USB / Bluetooth ou Zebra actif</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
              Écoute Active
            </span>
          </div>
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
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      mission.priority === 'URGENCE CRITIQUE'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : mission.priority === 'EXPÉDITION INTERNATIONALE'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    }`}>
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
                      className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-sm flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/30 transition-transform active:scale-[0.98] ring-2 ring-amber-400/50"
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
                  <h3 className="text-xl sm:text-2xl font-black text-white">MISSION VALIDÉE AVEC SUCCÈS !</h3>
                  <p className="text-xs sm:text-sm text-emerald-200 mt-1 max-w-md mx-auto">
                    Toutes les étapes ont été scannées et validées sans erreur. Le stock ERP a été synchronisé.
                  </p>
                  <button
                    onClick={() => onSelectMission((currentMissionIndex + 1) % missions.length)}
                    className="mt-4 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/30 transition-all"
                  >
                    Passer à la Mission Suivante →
                  </button>
                </div>
              )}
            </div>

            {/* Checklist of steps */}
            <div className="mt-4 pt-3 border-t border-slate-800">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase mb-2 block">
                Étapes de la mission ({mission.steps.filter((s) => s.completed).length} / {mission.steps.length}) :
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {mission.steps.map((st, i) => (
                  <div
                    key={st.id}
                    className={`p-2 rounded-xl border text-xs flex items-center space-x-2 transition-all ${
                      st.completed
                        ? 'bg-emerald-950/40 border-emerald-600/40 text-emerald-300'
                        : st === currentStep
                        ? 'bg-sky-500/20 border-sky-400 text-white font-semibold ring-2 ring-sky-500/30'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400'
                    }`}
                  >
                    {st.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-mono shrink-0">
                        {i + 1}
                      </span>
                    )}
                    <span className="truncate">{st.targetLabel}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick simulation bar - Organized & Categorized so NO code is clipped */}
          <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 flex flex-col gap-2.5 text-xs shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
              <div className="flex items-center space-x-2">
                <Barcode className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-slate-200 uppercase tracking-tight text-xs font-mono">
                  Barre de Simulation de Codes-Barres :
                </span>
              </div>

              {/* Filters */}
              <div className="flex items-center space-x-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                <button
                  type="button"
                  onClick={() => setSelectedFilter('all')}
                  className={`px-2 py-0.5 rounded ${selectedFilter === 'all' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400'}`}
                >
                  Tous ({BARCODE_CATALOG.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFilter('package')}
                  className={`px-2 py-0.5 rounded ${selectedFilter === 'package' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400'}`}
                >
                  Bons/Colis
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFilter('article')}
                  className={`px-2 py-0.5 rounded ${selectedFilter === 'article' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400'}`}
                >
                  Articles
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFilter('location')}
                  className={`px-2 py-0.5 rounded ${selectedFilter === 'location' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400'}`}
                >
                  Emplacements
                </button>
              </div>
            </div>

            {/* List of Barcodes with clear labels and buttons */}
            <div className="flex flex-wrap items-center gap-1.5 max-h-36 overflow-y-auto pr-1">
              {filteredBarcodes.map((bc) => {
                const isExpected = currentStep?.expectedBarcode === bc.code;
                return (
                  <button
                    key={bc.code}
                    type="button"
                    onClick={() => barcodeListener.simulateScan(bc.code)}
                    className={`px-2.5 py-1.5 rounded-xl font-mono text-[11px] border flex items-center space-x-1.5 transition-all ${
                      isExpected
                        ? 'bg-amber-500 text-slate-950 border-amber-300 font-black shadow-md shadow-amber-500/20 scale-105 ring-2 ring-amber-400'
                        : 'bg-slate-800/90 hover:bg-sky-600 hover:text-white text-slate-300 border-slate-700'
                    }`}
                    title={bc.label}
                  >
                    <span>{bc.code}</span>
                    <span className="text-[9px] opacity-75 font-sans hidden sm:inline truncate max-w-[120px]">
                      ({bc.label.split(':')[0]})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Manual Text Input form */}
            <form onSubmit={handleManualSubmit} className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">Saisie manuelle directe :</span>
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Entrez un code-barres (ex: BL-EDWARDS-9941)..."
                className="bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-sky-500 flex-1 max-w-sm"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Valider Scan
              </button>
            </form>
          </div>
        </div>

        {/* Right Col: Live Douchette Terminal & Real-Time Stock Preview */}
        <div className="flex flex-col gap-3.5">
          {/* Live Scanner Terminal Box */}
          <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-xl flex flex-col h-[280px]">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold font-mono text-slate-200 uppercase">Journal Scans en Direct</span>
              </div>
              <div className="flex items-center space-x-2">
                {onClearLogs && logs.length > 0 && (
                  <button
                    onClick={onClearLogs}
                    className="text-[10px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700"
                  >
                    Effacer
                  </button>
                )}
                {lastScannedCode && (
                  <span className="text-[10px] font-mono text-amber-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                    {lastScannedCode}
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pt-2.5 pr-1">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500">
                  <Package className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-xs">En attente d'un coup de laser...</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">Visez une étiquette avec votre douchette</p>
                </div>
              ) : (
                logs.slice(0, 15).map((log) => (
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

          {/* Quick Stock Status Card */}
          <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-xl flex flex-col h-[280px]">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 shrink-0">
              <span className="text-xs font-bold font-mono text-slate-200 uppercase">Aperçu Stock Réel (ERP)</span>
              <span className="text-[10px] text-slate-400 font-mono">Mis à jour au scan</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 pt-1 pr-1">
              {inventory.slice(0, 5).map((it) => (
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
    </div>
  );
};