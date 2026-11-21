import React, { useState } from 'react';
import { ViewMode, OperatorProfile, AppConfig } from '../types';
import {
  Barcode,
  Printer,
  Trophy,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Clock,
  Sliders,
  Tv,
  ExternalLink,
  Sparkles,
  ChevronDown,
  Layers,
  Award
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { GameLogo } from './GameLogo';

interface HeaderProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  operator: OperatorProfile;
  soundEnabled: boolean;
  onToggleSound: () => void;
  shiftSecondsRemaining: number;
  onOpenDiplome: () => void;
  appConfig: AppConfig;
  onUpdateLogo?: (url: string) => void;
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMultiScreenOpen, setIsMultiScreenOpen] = useState(false);

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

  const cleanOperatorName = operator.name.replace(/\(Invité\)/gi, '').replace(/^Duo\s+/i, '').trim();

  const navItems: {
    id: ViewMode;
    label: string;
    icon: React.FC<{ className?: string }>;
    isLive?: boolean;
  }[] = [
    { id: 'home', label: 'Accueil', icon: Sparkles },
    { id: 'kiosk', label: 'Poste Scanner', icon: Barcode },
    { id: 'arena', label: 'Arène TV 55"', icon: Tv, isLive: true },
    { id: 'podium', label: 'Podium', icon: Trophy },
    { id: 'print', label: 'Étiquettes', icon: Printer },
    { id: 'admin', label: 'Régie & ERP', icon: Sliders }
  ];

  return (
    <header className="no-print bg-[#060d1e]/95 backdrop-blur-xl text-white px-3 sm:px-5 py-2 flex items-center justify-between gap-3 select-none sticky top-0 z-40 relative">
      {/* Subtle Luminous Gradient Bottom Accent Line */}
      <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-sky-500/40 via-red-600 to-amber-500/50 pointer-events-none" />

      {/* 1. BRAND & LIVE STATUS (Left) */}
      <div className="flex items-center shrink-0">
        <button
          onClick={() => {
            soundService.playScanBeep();
            onSelectView('home');
          }}
          className="flex items-center gap-2.5 text-left cursor-pointer group transition-all"
          title="Retour à l'accueil"
        >
          <GameLogo
            customLogoUrl={appConfig.customLogoUrl}
            size="sm"
            showSubtitle={false}
            allowUpload={false}
          />
          <div className="hidden lg:flex flex-col leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="font-display font-black text-xs tracking-wider uppercase text-white group-hover:text-sky-300 transition-colors">
                GT LOGISTICS
              </span>
              <span className="text-[9px] font-mono font-black px-1.5 py-0.2 rounded bg-red-600/90 text-white">
                25 ANS
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono text-slate-400">
                Temps Réel • CEA
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* 2. SLEEK GLASS NAVIGATION DOCK (Center) */}
      <nav className="flex items-center gap-0.5 p-1 bg-slate-900/80 rounded-2xl border border-slate-700/70 shadow-inner overflow-x-auto scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                soundService.playScanBeep();
                onSelectView(item.id);
              }}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-sky-500/25 via-blue-600/25 to-indigo-500/25 text-white border border-sky-400/50 shadow-[0_0_16px_rgba(56,189,248,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70 border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-sky-300' : 'text-slate-400'}`} />
              <span className="tracking-tight">{item.label}</span>
              {item.isLive && (
                <span className="inline-flex items-center gap-1 text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded-full bg-rose-600/90 text-white leading-none shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  LIVE
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. COMPACT COCKPIT CONTROLS (Right) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Unified Chrono + Diplôme Pill */}
        <div className="hidden sm:flex items-center bg-slate-900/90 rounded-xl border border-slate-700/70 overflow-hidden shadow-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono font-black text-amber-400 border-r border-slate-800">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{formatTime(shiftSecondsRemaining)}</span>
          </div>
          <button
            onClick={onOpenDiplome}
            className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-slate-800 transition-colors cursor-pointer group"
            title="Consulter et imprimer le Diplôme d'Honneur"
          >
            <Award className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold text-slate-200 max-w-[90px] truncate hidden xl:inline">
              {cleanOperatorName || 'Diplôme'}
            </span>
            {operator.score > 0 && (
              <span className="text-[10px] font-mono font-black text-emerald-400">
                +{operator.score}
              </span>
            )}
          </button>
        </div>

        {/* Audio & Fullscreen Compact Group */}
        <div className="flex items-center bg-slate-900/90 rounded-xl border border-slate-700/70 p-0.5">
          <button
            onClick={onToggleSound}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={soundEnabled ? 'Couper les effets sonores' : 'Activer les bips scannette'}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            )}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer hidden md:flex"
            title="Plein Écran (Mode Borne Kiosque)"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 text-sky-400" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Multi-screen Manager Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsMultiScreenOpen(!isMultiScreenOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-200 border border-indigo-500/40 text-xs font-bold cursor-pointer transition-all"
            title="Ouvrir les fenêtres autonomes (Écran TV 55'', Scannette Zebra 1 & 2)"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden xl:inline">Multi-Écrans</span>
            <ChevronDown className="w-3 h-3 text-indigo-400" />
          </button>

          {isMultiScreenOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-2.5 z-50 flex flex-col gap-1 text-xs">
              <div className="px-3 py-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono border-b border-slate-800 mb-1">
                Ouvrir un Écran Dédié :
              </div>

              <a
                href="#tv"
                target="_blank"
                rel="noreferrer"
                onClick={() => setIsMultiScreenOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 hover:bg-rose-950/60 text-slate-200 hover:text-rose-200 border border-transparent hover:border-rose-500/30 transition-all font-medium"
              >
                <div className="flex items-center space-x-2">
                  <Tv className="w-4 h-4 text-rose-400" />
                  <span>Grande TV 55&quot; (Arène Spectateurs)</span>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>

              <a
                href="#poste-1"
                target="_blank"
                rel="noreferrer"
                onClick={() => setIsMultiScreenOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 hover:bg-sky-950/60 text-slate-200 hover:text-sky-200 border border-transparent hover:border-sky-500/30 transition-all font-medium"
              >
                <div className="flex items-center space-x-2">
                  <Barcode className="w-4 h-4 text-sky-400" />
                  <span>Poste 1 (Scannette Bleue A)</span>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>

              <a
                href="#poste-2"
                target="_blank"
                rel="noreferrer"
                onClick={() => setIsMultiScreenOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 hover:bg-amber-950/60 text-slate-200 hover:text-amber-200 border border-transparent hover:border-amber-500/30 transition-all font-medium"
              >
                <div className="flex items-center space-x-2">
                  <Barcode className="w-4 h-4 text-amber-400" />
                  <span>Poste 2 (Scannette Orange B)</span>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>

              <a
                href="#admin"
                target="_blank"
                rel="noreferrer"
                onClick={() => setIsMultiScreenOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 hover:bg-indigo-950/60 text-slate-200 hover:text-indigo-200 border border-transparent hover:border-indigo-500/30 transition-all font-medium"
              >
                <div className="flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <span>Régie Contrôle & Aléas</span>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
