import React, { useState } from 'react';
import { Mission, ScanLog, InventoryItem } from '../types';
import { 
  CheckCircle2, 
  AlertTriangle, 
  MapPin, 
  Package, 
  ShieldAlert, 
  Radio, 
  Play, 
  RotateCcw,
  Sparkles,
  Zap
} from 'lucide-react';
import { BARCODE_CATALOG } from '../data/initialData';
import { barcodeListener } from '../services/barcodeListener';

interface PosteOperateurViewProps {
  missions: Mission[];
  currentMissionIndex: number;
  onSelectMission: (idx: number) => void;
  onResetMission: () => void;
  logs: ScanLog[];
  inventory: InventoryItem[];
  lastScannedCode: string | null;
  flashState: 'green' | 'red' | null;
}

export const PosteOperateurView: React.FC<PosteOperateurViewProps> = ({
  missions,
  currentMissionIndex,
  onSelectMission,
  onResetMission,
  logs,
  inventory,
  lastScannedCode,
  flashState
}) => {
  const [manualInput, setManualInput] = useState('');
  const mission = missions[currentMissionIndex];
  const currentStep = mission.steps.find((s) => !s.completed) || null;
  const progressPercent = Math.round(
    (mission.steps.filter((s) => s.completed).length / mission.steps.length) * 100
  );

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      barcodeListener.simulateScan(manualInput.trim());
      setManualInput('');
    }
  };

  return (
    <div className={`h-[calc(100vh-65px)] flex flex-col p-4 gap-4 transition-colors duration-200 ${
      flashState === 'green' ? 'bg-emerald-950/20' : flashState === 'red' ? 'bg-rose-950/20' : ''
    }`}>
      {/* Top Banner: Mission Selector & Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Mission Selector Tabs */}
        <div className="lg:col-span-2 bg-slate-900/90 rounded-2xl p-3 border border-slate-800 flex items-center gap-2 overflow-x-auto shadow-lg">
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
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
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
                <span className="text-[10px] opacity-75 hidden sm:inline">
                  ({m.priority === 'URGENCE CRITIQUE' ? 'Urgence' : m.priority === 'STANDARD' ? 'Réception' : 'Export'})
                </span>
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onResetMission}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700 transition-colors"
              title="Recommencer cette mission"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Réinitialiser</span>
            </button>
          </div>
        </div>

        {/* Scanner Douchette Status Widget */}
        <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
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
              Écoute Globale
            </span>
          </div>
        </div>
      </div>

      {/* Main Mission Workstation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Left 2 Cols: Active Mission Card & Big Action Prompt */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl flex-1 flex flex-col justify-between relative overflow-hidden">
            {/* Background Accent Grid */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl -z-0 pointer-events-none" />

            <div>
              {/* Mission Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center space-x-2 mb-1.5">
                    <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider">
                      {mission.code}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      mission.priority === 'URGENCE CRITIQUE'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : mission.priority === 'EXPÉDITION INTERNATIONALE'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    }`}>
                      {mission.priority}
                    </span>
                  </div>
                  <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                    {mission.title}
                  </h1>
                  <p className="text-sm text-slate-300 mt-1 flex items-center space-x-1.5">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="font-medium text-slate-200">{mission.client}</span>
                  </p>
                </div>

                {/* Points Pill */}
                <div className="text-right shrink-0">
                  <div className="text-2xl font-black font-mono text-emerald-400">
                    +{mission.basePoints}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Points Mission</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1.5">
                  <span>Progression de la préparation</span>
                  <span className="font-mono text-white">{progressPercent}%</span>
                </div>
                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full transition-all duration-500 shadow-lg shadow-emerald-500/20"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Big Interactive Action Box (THE TARGET PROMPT) */}
              {currentStep ? (
                <div className="bg-slate-950/80 rounded-2xl p-6 border-2 border-sky-500/40 shadow-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-sky-500 text-slate-950 font-black text-sm">
                        {mission.steps.indexOf(currentStep) + 1}
                      </span>
                      <span className="text-xs uppercase font-mono font-bold text-sky-400">
                        Action Attendue au Scanner :
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-amber-300 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Scannez l'objet avec la douchette</span>
                    </div>
                  </div>

                  <p className="text-lg lg:text-xl font-bold text-white mb-4 leading-snug">
                    {currentStep.instruction}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Cible à viser :</span>
                      <span className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
                        <Package className="w-4 h-4 text-sky-400" />
                        <span>{currentStep.targetLabel}</span>
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Code-barres attendu :</span>
                      <span className="font-mono text-sm font-black text-amber-400 tracking-wider">
                        {currentStep.expectedBarcode}
                      </span>
                    </div>
                  </div>

                  {currentStep.hint && (
                    <div className="mt-3 text-xs text-slate-400 flex items-center space-x-1.5 italic">
                      <span className="font-semibold text-slate-300">💡 Conseil :</span>
                      <span>{currentStep.hint}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-emerald-950/40 rounded-2xl p-8 border-2 border-emerald-500/50 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/20">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-white">MISSION ENTIÈREMENT VALIDÉE !</h3>
                  <p className="text-sm text-emerald-200 mt-1 max-w-md mx-auto">
                    Toutes les étapes ont été contrôlées et validées sans erreur. La commande est prête à être expédiée.
                  </p>
                  <button
                    onClick={() => onSelectMission((currentMissionIndex + 1) % missions.length)}
                    className="mt-5 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/30 transition-all"
                  >
                    Passer à la Mission Suivante →
                  </button>
                </div>
              )}
            </div>

            {/* Checklist of steps */}
            <div className="mt-6 pt-4 border-t border-slate-800">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase mb-2 block">
                Étapes de la mission :
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {mission.steps.map((st, i) => (
                  <div
                    key={st.id}
                    className={`p-2.5 rounded-xl border text-xs flex items-center space-x-2 transition-all ${
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

          {/* Quick simulation bar (if no physical barcode scanner handy) */}
          <div className="bg-slate-900/80 rounded-2xl p-3 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-slate-400 font-bold uppercase">Simulation Rapide :</span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">(Cliquez sur un code pour simuler un scan)</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {BARCODE_CATALOG.slice(0, 6).map((bc) => (
                <button
                  key={bc.code}
                  onClick={() => barcodeListener.simulateScan(bc.code)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-sky-600 hover:text-white text-slate-300 font-mono text-[11px] border border-slate-700 transition-colors"
                >
                  {bc.code}
                </button>
              ))}
            </div>

            {/* Manual Text Input form */}
            <form onSubmit={handleManualSubmit} className="flex items-center gap-1.5 ml-auto">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Code-barre manuel..."
                className="bg-slate-950 border border-slate-700 px-2.5 py-1 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-sky-500 w-36"
              />
              <button
                type="submit"
                className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold"
              >
                Scan
              </button>
            </form>
          </div>
        </div>

        {/* Right Col: Live Douchette Terminal & Real-Time Stock Preview */}
        <div className="flex flex-col gap-4">
          {/* Live Scanner Terminal Box */}
          <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-xl flex flex-col h-1/2">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold font-mono text-slate-200 uppercase">Journal des Scans en Direct</span>
              </div>
              {lastScannedCode && (
                <span className="text-[11px] font-mono text-amber-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                  Dernier : {lastScannedCode}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pt-3 pr-1">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500">
                  <Package className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-xs">En attente du premier coup de laser...</p>
                  <p className="text-[10px] text-slate-600 mt-1">Visez une étiquette avec votre douchette</p>
                </div>
              ) : (
                logs.slice(0, 15).map((log) => (
                  <div
                    key={log.id}
                    className={`p-2.5 rounded-xl border text-xs font-mono flex items-start justify-between gap-2 transition-all ${
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
                      <p className="text-[11px] opacity-80 mt-0.5 font-sans">{log.message}</p>
                    </div>
                    <span className="text-[10px] opacity-60 shrink-0">{log.timestamp}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Stock Status Card */}
          <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold font-mono text-slate-200 uppercase">Aperçu Stock Réel (ERP)</span>
              <span className="text-[10px] text-slate-400 font-mono">Mis à jour au scan</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 pt-1">
              {inventory.slice(0, 5).map((it) => (
                <div key={it.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-200 block truncate max-w-[170px]">{it.name}</span>
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
