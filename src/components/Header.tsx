import React from 'react';
import { ViewMode, OperatorProfile } from '../types';
import { 
  Barcode, 
  Boxes, 
  Printer, 
  Trophy, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Clock, 
  User,
  ShieldCheck
} from 'lucide-react';
import { soundService } from '../services/soundService';

interface HeaderProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  operator: OperatorProfile;
  soundEnabled: boolean;
  onToggleSound: () => void;
  shiftSecondsRemaining: number;
  onOpenDiplome: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onSelectView,
  operator,
  soundEnabled,
  onToggleSound,
  shiftSecondsRemaining,
  onOpenDiplome
}) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.max(0, seconds) % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header className="no-print bg-slate-900/95 border-b border-slate-800 backdrop-blur-md px-4 py-2.5 flex items-center justify-between select-none sticky top-0 z-40">
      {/* Brand / Logo */}
      <div className="flex items-center space-x-3.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-600/20 border border-sky-400/30">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-base font-extrabold tracking-wide text-white">CEA GRENOBLE</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              ÉDITION 25 ANS
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono tracking-tight">WMS Industrial Terminal • Shift Challenge</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center space-x-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => {
            soundService.playScanBeep();
            onSelectView('kiosk');
          }}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            currentView === 'kiosk'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Barcode className="w-4 h-4" />
          <span>Poste Opérateur (Douchette)</span>
        </button>

        <button
          onClick={() => {
            soundService.playScanBeep();
            onSelectView('erp');
          }}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            currentView === 'erp'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Stocks & ERP Temps Réel</span>
        </button>

        <button
          onClick={() => {
            soundService.playScanBeep();
            onSelectView('print');
          }}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            currentView === 'print'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Étiquettes à Imprimer</span>
        </button>

        <button
          onClick={() => {
            soundService.playScanBeep();
            onSelectView('podium');
          }}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            currentView === 'podium'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Classement & Diplômes</span>
        </button>
      </nav>

      {/* Operator stats & tools */}
      <div className="flex items-center space-x-3">
        {/* Timer */}
        <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
          <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="font-mono text-sm font-bold text-amber-300">
            {formatTime(shiftSecondsRemaining)}
          </span>
        </div>

        {/* Operator Badge */}
        <button
          onClick={onOpenDiplome}
          className="flex items-center space-x-2 bg-slate-800/80 hover:bg-slate-700/80 px-3 py-1.5 rounded-lg border border-slate-700/60 transition-colors"
          title="Cliquez pour voir votre diplôme"
        >
          <User className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-medium text-slate-200 max-w-[120px] truncate">{operator.name}</span>
          <span className="text-xs font-mono font-bold text-emerald-400">+{operator.score} pts</span>
        </button>

        {/* Audio Toggle */}
        <button
          onClick={onToggleSound}
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
          title={soundEnabled ? 'Désactiver le son' : 'Activer les bips scanner'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
          title="Plein écran (Mode Borne)"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4 text-sky-400" /> : <Maximize2 className="w-4 h-4 text-slate-300" />}
        </button>
      </div>
    </header>
  );
};
