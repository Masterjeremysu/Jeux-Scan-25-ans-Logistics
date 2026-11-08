import React from 'react';
import { ViewMode, OperatorProfile, AppConfig } from '../types';
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
  ShieldCheck,
  Settings,
  Tv,
  ExternalLink
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
  appConfig: AppConfig;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onSelectView,
  operator,
  soundEnabled,
  onToggleSound,
  shiftSecondsRemaining,
  onOpenDiplome,
  appConfig
}) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isMultiScreenOpen, setIsMultiScreenOpen] = React.useState(false);

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
    <header className="no-print bg-slate-900/95 border-b border-slate-800 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-2.5 flex flex-col md:flex-row items-center justify-between gap-2.5 select-none sticky top-0 z-40">
      {/* Brand / Logo */}
      <div className="flex items-center justify-between w-full md:w-auto space-x-3 shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-600/20 border border-sky-400/30 shrink-0">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="text-sm sm:text-base font-extrabold tracking-wide text-white truncate max-w-[150px] sm:max-w-none">
                {appConfig.eventTitle}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                {appConfig.badgeLabel}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 font-mono tracking-tight hidden sm:block">
              {appConfig.eventSubtitle}
            </p>
          </div>
        </div>

        {/* Mobile quick tools */}
        <div className="flex md:hidden items-center space-x-1.5">
          <div className="flex items-center space-x-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60 font-mono text-xs text-amber-300 font-bold">
            <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>{formatTime(shiftSecondsRemaining)}</span>
          </div>
          <button
            onClick={onToggleSound}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-rose-400" />}
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Horizontal scroll on mobile) */}
      <nav className="flex items-center space-x-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 w-full md:w-auto overflow-x-auto scrollbar-none shrink-0">
        <button
          onClick={() => {
            soundService.playScanBeep();
            onSelectView('kiosk');
          }}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            currentView === 'kiosk'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Barcode className="w-3.5 h-3.5 shrink-0" />
          <span>Poste Opérateur</span>
        </button>

        <button
          onClick={() => {
            soundService.playScanBeep();
            onSelectView('arena');
          }}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            currentView === 'arena'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'text-rose-400 hover:text-rose-200 hover:bg-slate-800/60'
          }`}
          title="Écran Grand Format pour TV / Spectateurs"
        >
          <Tv className="w-3.5 h-3.5 shrink-0" />
          <span>📺 Arène TV / Duel</span>
        </button>

        <button
          onClick={() => {
            soundService.playScanBeep();
            onSelectView('erp');
          }}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            currentView === 'erp'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Boxes className="w-3.5 h-3.5 shrink-0" />
          <span>Stocks ERP</span>
        </button>

        <button
          onClick={() => {
            soundService.playScanBeep();
            onSelectView('print');
          }}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            currentView === 'print'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Printer className="w-3.5 h-3.5 shrink-0" />
          <span>Étiquettes</span>
        </button>

        <button
          onClick={() => {
            soundService.playScanBeep();
            onSelectView('podium');
          }}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            currentView === 'podium'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 shrink-0" />
          <span>Classement</span>
        </button>

        <button
          onClick={() => {
            soundService.playScanBeep();
            onSelectView('admin');
          }}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            currentView === 'admin'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-indigo-300 hover:bg-slate-800/60'
          }`}
          title="Panneau d'administration et configuration personnalisée"
        >
          <Settings className="w-3.5 h-3.5 shrink-0" />
          <span>⚙️ Paramètres</span>
        </button>
      </nav>

      {/* Operator stats & tools (Desktop) */}
      <div className="hidden md:flex items-center space-x-2 shrink-0">
        {/* Timer */}
        <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60">
          <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="font-mono text-xs font-bold text-amber-300">
            {formatTime(shiftSecondsRemaining)}
          </span>
        </div>

        {/* Operator Badge */}
        <button
          onClick={onOpenDiplome}
          className="flex items-center space-x-1.5 bg-slate-800/80 hover:bg-slate-700/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60 transition-colors"
          title="Cliquez pour voir votre diplôme"
        >
          <User className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-xs font-medium text-slate-200 max-w-[100px] truncate">{operator.name}</span>
          <span className="text-xs font-mono font-bold text-emerald-400">+{operator.score} pts</span>
        </button>

        {/* Audio Toggle */}
        <button
          onClick={onToggleSound}
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
          title={soundEnabled ? 'Désactiver le son' : 'Activer les bips scanner'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
          title="Plein écran (Mode Borne)"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4 text-sky-400" /> : <Maximize2 className="w-4 h-4 text-slate-300" />}
        </button>

        {/* Multi-screen window launcher */}
        <div className="relative">
          <button
            onClick={() => setIsMultiScreenOpen(!isMultiScreenOpen)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-sky-950/80 hover:bg-sky-900/80 text-sky-300 border border-sky-500/30 text-xs font-mono font-bold cursor-pointer transition-colors"
            title="Ouvrir des fenêtres dédiées (TV 55 pouces, Postes 1 & 2, Régie)"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Multi-Écrans</span>
          </button>

          {isMultiScreenOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 flex flex-col gap-1.5 text-xs font-mono">
              <div className="px-2.5 py-1 text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800">
                Ouvrir dans un nouvel onglet :
              </div>
              <a
                href="#tv"
                target="_blank"
                rel="noreferrer"
                onClick={() => setIsMultiScreenOpen(false)}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-950 hover:bg-indigo-950 text-indigo-300 transition-colors"
              >
                <span>📺 Grande TV 55" (Arène Live)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="#poste-1"
                target="_blank"
                rel="noreferrer"
                onClick={() => setIsMultiScreenOpen(false)}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-950 hover:bg-sky-950 text-sky-300 transition-colors"
              >
                <span>🎯 Écran Poste 1 (Scannette A)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="#poste-2"
                target="_blank"
                rel="noreferrer"
                onClick={() => setIsMultiScreenOpen(false)}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-950 hover:bg-amber-950 text-amber-300 transition-colors"
              >
                <span>🎯 Écran Poste 2 (Scannette B)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="#admin"
                target="_blank"
                rel="noreferrer"
                onClick={() => setIsMultiScreenOpen(false)}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-950 hover:bg-rose-950 text-rose-300 transition-colors"
              >
                <span>🎛️ Régie Contrôle & Aléas</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
