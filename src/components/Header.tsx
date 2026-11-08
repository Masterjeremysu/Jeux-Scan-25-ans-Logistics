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
  User, 
  Sliders, 
  Tv, 
  ExternalLink, 
  Sparkles,
  Wifi,
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

  // Clean operator display name
  const cleanOperatorName = operator.name.replace(/\(Invité\)/gi, '').replace(/^Duo\s+/i, '').trim();

  const navItems: { id: ViewMode; label: string; icon: React.FC<{ className?: string }>; badge?: string; badgeColor?: string }[] = [
    { id: 'home', label: 'Accueil', icon: Sparkles },
    { id: 'kiosk', label: 'Poste Scanner', icon: Barcode },
    { id: 'arena', label: 'Arène TV 55"', icon: Tv, badge: 'DIRECT', badgeColor: 'bg-rose-500 text-white' },
    { id: 'podium', label: 'Podium & Records', icon: Trophy },
    { id: 'print', label: 'Étiquettes', icon: Printer },
    { id: 'admin', label: 'Régie & ERP', icon: Sliders },
  ];

  return (
    <header className="no-print bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-xl px-3 sm:px-5 py-2.5 flex items-center justify-between gap-4 select-none sticky top-0 z-40">
      {/* 1. BRAND & IDENTITY (Left) */}
      <div className="flex items-center space-x-3 shrink-0">
        <button
          onClick={() => {
            soundService.playScanBeep();
            onSelectView('home');
          }}
          className="flex items-center space-x-3 text-left cursor-pointer group transition-all"
          title="Accueil du jeu"
        >
          <GameLogo
            customLogoUrl={appConfig.customLogoUrl}
            size="sm"
            showSubtitle={false}
            allowUpload={false}
          />
          <div className="hidden lg:flex flex-col">
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-emerald-400">
                WMS CONNECTÉ
              </span>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 tracking-tight">
              25 Ans de Partenariat CEA
            </span>
          </div>
        </button>
      </div>

      {/* 2. DOCK-STYLE CENTER NAVIGATION (Center) */}
      <nav className="flex items-center p-1 bg-slate-900/90 rounded-2xl border border-slate-800/80 shadow-inner overflow-x-auto scrollbar-none">
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
              className={`relative flex items-center space-x-2 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-600/30 border border-sky-400/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="tracking-tight">{item.label}</span>
              {item.badge && (
                <span
                  className={`text-[9px] font-extrabold uppercase font-mono px-1.5 py-0.2 rounded-full leading-tight shrink-0 ${
                    item.badgeColor || 'bg-sky-500 text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. COCKPIT CONTROLS & PLAYER IDENTITY (Right) */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* Active Shift Timer */}
        <div className="hidden sm:flex items-center space-x-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs font-mono font-bold text-amber-400 shadow-xs">
          <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>{formatTime(shiftSecondsRemaining)}</span>
        </div>

        {/* Player Profile & Diplome Button */}
        <button
          onClick={onOpenDiplome}
          className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700/80 transition-all cursor-pointer group shadow-xs"
          title="Consulter et imprimer le Diplôme d'Honneur"
        >
          <div className="w-5 h-5 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[10px]">
            <Award className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[11px] font-bold text-slate-200 group-hover:text-white max-w-[120px] truncate leading-tight">
              {cleanOperatorName || 'Invité'}
            </span>
            <span className="text-[10px] font-mono font-extrabold text-emerald-400 leading-tight">
              +{operator.score} pts
            </span>
          </div>
        </button>

        {/* Audio Toggle */}
        <button
          onClick={onToggleSound}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-800 cursor-pointer"
          title={soundEnabled ? 'Couper les effets sonores' : 'Activer les bips scannette'}
        >
          {soundEnabled ? (
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-rose-400" />
          )}
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-800 cursor-pointer hidden md:flex"
          title="Basculer en Plein Écran (Mode Borne Kiosque)"
        >
          {isFullscreen ? (
            <Minimize2 className="w-3.5 h-3.5 text-sky-400" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Multi-screen Manager Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsMultiScreenOpen(!isMultiScreenOpen)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-950 to-slate-900 hover:from-indigo-900 hover:to-slate-850 text-indigo-300 border border-indigo-700/40 text-xs font-semibold cursor-pointer transition-all shadow-xs"
            title="Ouvrir les fenêtres autonomes (Écran TV 55'', Scannette Zebra 1 & 2)"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden xl:inline">Multi-Écrans</span>
            <ChevronDown className="w-3 h-3 text-indigo-400" />
          </button>

          {isMultiScreenOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-2.5 z-50 flex flex-col gap-1 text-xs">
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
                  <span>Grande TV 55" (Arène Spectateurs)</span>
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
