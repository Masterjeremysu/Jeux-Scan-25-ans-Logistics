import React, { useState, useEffect } from 'react';
import { DuoStation, AppConfig } from '../types';
import { 
  getStationsLive, 
  subscribeToStationsLive, 
  getRemoteLeaderboard, 
  subscribeToScores,
  resetAllLiveStations,
  RemoteScore
} from '../services/supabaseClient';
import { 
  Tv, 
  Trophy, 
  Flame, 
  CheckCircle2, 
  Clock, 
  Users, 
  Radio, 
  Sparkles, 
  QrCode, 
  Package, 
  Award, 
  Play, 
  Pause, 
  RotateCcw, 
  Swords, 
  ExternalLink,
  Maximize2,
  Minimize2,
  Home,
  Check,
  ChevronRight,
  Truck
} from 'lucide-react';
import { GameLogo } from './GameLogo';
import { ConfirmModal } from './ConfirmModal';

interface ArenaTvViewProps {
  appConfig: AppConfig;
  onBackToHome?: () => void;
}

export const ArenaTvView: React.FC<ArenaTvViewProps> = ({ appConfig, onBackToHome }) => {
  const [stations, setStations] = useState<DuoStation[]>([]);
  const [topScores, setTopScores] = useState<RemoteScore[]>([]);
  const [lastEventMsg, setLastEventMsg] = useState<string>('En attente du départ du duel...');
  const [matchSeconds, setMatchSeconds] = useState<number>(180);
  const [isMatchRunning, setIsMatchRunning] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Match Countdown Timer
  useEffect(() => {
    if (!isMatchRunning) return;
    const timer = setInterval(() => {
      setMatchSeconds((prev) => {
        if (prev <= 1) {
          setIsMatchRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isMatchRunning]);

  const formatMatchTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleToggleMatch = () => {
    setIsMatchRunning((prev) => !prev);
  };

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const handleResetMatchTime = () => {
    setIsMatchRunning(false);
    setMatchSeconds(180);
  };

  const executeResetArena = async () => {
    await resetAllLiveStations();
    const fresh = await getStationsLive();
    setStations(fresh);
    setIsMatchRunning(false);
    setMatchSeconds(180);
    setLastEventMsg('Arène remise à zéro • En attente des nouveaux duos');
    setIsResetConfirmOpen(false);
  };

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

  const baseUrl = (appConfig.publicUrl || window.location.origin).replace(/\/$/, '');
  const qrZebra1 = `${baseUrl}/#play?station=poste-1`;
  const qrZebra2 = `${baseUrl}/#play?station=poste-2`;

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const liveStations = await getStationsLive();
      if (isMounted && liveStations.length > 0) {
        setStations(liveStations);
      } else if (isMounted) {
        setStations([
          {
            station_id: 'poste-1',
            station_name: 'Poste 1 (Scannette A)',
            operator_cea: 'Jeremy (GT)',
            client_guest: 'Invité 1',
            team_name: 'Duo 1 (Bleu)',
            current_mission_title: 'En attente...',
            progress_percent: 0,
            current_step_index: 0,
            total_steps: 5,
            score: 0,
            combo: 0,
            status: 'idle'
          },
          {
            station_id: 'poste-2',
            station_name: 'Poste 2 (Scannette B)',
            operator_cea: 'Sarah (GT)',
            client_guest: 'Invité 2',
            team_name: 'Duo 2 (Orange)',
            current_mission_title: 'En attente...',
            progress_percent: 0,
            current_step_index: 0,
            total_steps: 5,
            score: 0,
            combo: 0,
            status: 'idle'
          }
        ]);
      }

      const scores = await getRemoteLeaderboard();
      if (isMounted) {
        setTopScores(scores.slice(0, 5));
      }
    }

    loadData();

    // Subscribe to live stations updates
    const unsubStations = subscribeToStationsLive((updatedStation) => {
      setStations((prev) => {
        const idx = prev.findIndex((s) => s.station_id === updatedStation.station_id);
        if (idx !== -1) {
          const clone = [...prev];
          clone[idx] = updatedStation;
          return clone;
        }
        return [...prev, updatedStation];
      });

      if (updatedStation.last_scan_code) {
        setLastEventMsg(
          `⚡ ${updatedStation.team_name} a scanné [${updatedStation.last_scan_code}]`
        );
      }
    });

    // Subscribe to scores leaderboard updates
    const unsubScores = subscribeToScores(async () => {
      const scores = await getRemoteLeaderboard();
      if (isMounted) {
        setTopScores(scores.slice(0, 5));
      }
    });

    return () => {
      isMounted = false;
      unsubStations();
      unsubScores();
    };
  }, []);

  const station1 = stations.find((s) => s.station_id === 'poste-1') || stations[0];
  const station2 = stations.find((s) => s.station_id === 'poste-2') || stations[1];

  const stepsCatalog1 = ['Étagère 1', 'Pièce A', 'Pièce B', 'Carton', 'Quai A'];
  const stepsCatalog2 = ['Étagère 2', 'Pièce X', 'Pièce Y', 'Carton', 'Quai B'];

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 select-none relative overflow-hidden font-sans">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-sky-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-[600px] h-[300px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* ========================================================================= */}
      {/* 1. TOP BROADCAST BAR (Style Régie TV Professionnelle)                      */}
      {/* ========================================================================= */}
      <header className="z-10 bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl px-6 py-4 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        {/* Left: Brand & Event Title */}
        <div className="flex items-center gap-4">
          <GameLogo
            customLogoUrl={appConfig.customLogoUrl}
            size="md"
            showSubtitle={false}
          />
          <div className="h-8 w-px bg-slate-800 hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-lg sm:text-xl text-white tracking-wide uppercase">
                GRANDE ARÈNE DUEL
              </span>
              <span className="flex items-center gap-1 text-[10px] font-black uppercase font-mono px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>DIRECT 55"</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              CEA Grenoble 25 Ans • Challenge Logistique Grand Format
            </p>
          </div>
        </div>

        {/* Center: GIANT ARENA CHRONOMETER (Center Stage) */}
        <div className="flex items-center gap-4 bg-slate-950 px-6 py-2.5 rounded-2xl border border-slate-800 shadow-inner">
          <div className="text-center">
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold block">
              CHRONO OFFICIEL (3 MIN)
            </span>
            <div className="font-display font-black text-4xl sm:text-5xl text-amber-300 tracking-wider drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]">
              {formatMatchTime(matchSeconds)}
            </div>
          </div>

          {/* Chrono Controls */}
          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-800">
            <button
              onClick={handleToggleMatch}
              className={`p-2.5 rounded-xl font-bold transition-all shadow-lg cursor-pointer ${
                isMatchRunning
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/20'
                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/20'
              }`}
              title={isMatchRunning ? 'Mettre en pause' : 'Lancer le compte à rebours 3 minutes'}
            >
              {isMatchRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button
              onClick={handleResetMatchTime}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Réinitialiser le chrono à 3:00"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Live Ticker & Screen Tools */}
        <div className="flex items-center gap-3">
          <div className="hidden xl:flex items-center gap-2 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-xs font-mono">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-ping" />
            <span className="text-emerald-400 font-bold uppercase">FEED :</span>
            <span className="text-slate-300 truncate max-w-[220px]">{lastEventMsg}</span>
          </div>

          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 text-xs font-mono font-bold transition-colors cursor-pointer"
            title="Remettre les duos et scores à 0"
          >
            Remise à zéro
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Basculer Plein Écran (F11)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Retour à l'accueil"
            >
              <Home className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. THE GRAND SPLIT DUEL ARENA (Centerpiece)                               */}
      {/* ========================================================================= */}
      <div className="z-10 my-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1">

        {/* DUO 1 • POSTE BLEU (Lg: 5 Cols) */}
        <div className={`lg:col-span-5 rounded-3xl p-6 sm:p-8 border-2 transition-all duration-500 relative overflow-hidden flex flex-col justify-between ${
          station1?.status === 'completed'
            ? 'bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.2)]'
            : 'bg-gradient-to-b from-sky-950/40 via-slate-900 to-slate-950 border-sky-500/50 shadow-[0_0_50px_rgba(14,165,233,0.15)]'
        }`}>
          {/* Subtle neon accents */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Station Header */}
          <div>
            <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-sky-500/20">
              <div className="flex items-center gap-2.5">
                <span className="w-3.5 h-3.5 rounded-full bg-sky-400 animate-ping"></span>
                <span className="font-display font-black text-sm sm:text-base text-sky-400 tracking-wider uppercase">
                  POSTE 1 • ÉQUIPE BLEUE
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-sky-300 bg-sky-950 px-3 py-1 rounded-full border border-sky-800/60">
                ÉTAGÈRE 1 • QUAI A
              </span>
            </div>

            {/* Duo Name Hero Display */}
            <div className="my-3">
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold block">
                BINÔME EN COURSE :
              </span>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-wide mt-1 truncate">
                {station1?.team_name || 'Duo Bleu'}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-mono">
                <span className="bg-slate-950 px-3 py-1 rounded-xl border border-slate-800 text-sky-300 font-semibold">
                  GT : <strong>{station1?.operator_cea || 'Jeremy'}</strong>
                </span>
                <span className="bg-slate-950 px-3 py-1 rounded-xl border border-slate-800 text-amber-300 font-semibold">
                  Invité : <strong>{station1?.client_guest || 'Invité'}</strong>
                </span>
              </div>
            </div>

            {/* Score & Combo Hero Number */}
            <div className="my-6 bg-slate-950/90 rounded-2xl p-5 border border-sky-500/30 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500 font-bold block">
                  SCORE EN DIRECT
                </span>
                <div className="font-display font-black text-5xl sm:text-6xl text-white tracking-tight">
                  {station1?.score || 0}
                  <span className="text-lg font-sans text-sky-400 ml-2 font-bold">PTS</span>
                </div>
              </div>

              {station1?.combo && station1.combo > 1 ? (
                <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-display font-black text-sm tracking-wider shadow-lg shadow-orange-500/30 animate-pulse flex items-center gap-1.5">
                  <Flame className="w-5 h-5 fill-current" />
                  <span>COMBO x{station1.combo}</span>
                </div>
              ) : (
                <div className="text-right text-xs font-mono text-slate-500">
                  <span>Combo x1</span>
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Logistics Race Track (Visual Conveyor) */}
          <div className="space-y-3 pt-4 border-t border-slate-800/80">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-400 font-bold uppercase">Progression du Flux :</span>
              <span className="font-display font-black text-base text-sky-400">
                {station1?.progress_percent || 0}%
              </span>
            </div>

            {/* Progress Track */}
            <div className="relative w-full h-10 bg-slate-950 rounded-2xl border border-slate-800 p-1 flex items-center overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-600 via-cyan-500 to-sky-400 rounded-xl transition-all duration-500 shadow-[0_0_20px_rgba(14,165,233,0.5)] flex items-center justify-end pr-2"
                style={{ width: `${Math.max(6, Math.min(100, station1?.progress_percent || 0))}%` }}
              >
                <Truck className="w-5 h-5 text-slate-950 animate-pulse" />
              </div>
            </div>

            {/* Milestones list */}
            <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-mono">
              {stepsCatalog1.map((step, idx) => {
                const currentIdx = station1?.current_step_index ?? 0;
                const isPassed = idx < currentIdx;
                const isCurrent = idx === currentIdx;

                return (
                  <div
                    key={idx}
                    className={`py-1.5 px-1 rounded-xl border transition-all truncate ${
                      isPassed
                        ? 'bg-sky-950/80 border-sky-500/60 text-sky-300 font-bold'
                        : isCurrent
                        ? 'bg-sky-500 text-slate-950 font-black shadow-md shadow-sky-500/30'
                        : 'bg-slate-950 border-slate-800/60 text-slate-600'
                    }`}
                  >
                    {step}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CENTER TOWER • VS & QUICK SCAN LAUNCH (Lg: 2 Cols) */}
        <div className="lg:col-span-2 flex flex-col items-center justify-between gap-4 py-2">
          {/* Top VS Badge */}
          <div className="my-auto text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 border-2 border-indigo-500/40 flex items-center justify-center shadow-2xl relative group">
              <div className="absolute inset-0 bg-indigo-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all"></div>
              <span className="font-display font-black text-2xl sm:text-3xl text-amber-400 tracking-wider">
                VS
              </span>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mt-2 block font-bold">
              FACE-À-FACE
            </span>
          </div>

          {/* Quick Scannettes QR Codes Card */}
          <div className="w-full bg-slate-900/90 rounded-2xl p-4 border border-slate-800 text-center shadow-xl">
            <div className="flex items-center justify-center gap-1.5 mb-2 text-xs font-mono font-bold text-slate-300">
              <QrCode className="w-4 h-4 text-sky-400" />
              <span>SCANNETTES ZEBRA</span>
            </div>
            <p className="text-[10px] text-slate-500 mb-3">Flashez pour ouvrir</p>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-950 p-2 rounded-xl border border-sky-500/30 text-center">
                <span className="text-[9px] font-mono font-bold text-sky-400 block mb-1">Zebra 1</span>
                <div className="bg-white p-1 rounded-lg inline-block">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(qrZebra1)}`}
                    alt="QR 1"
                    className="w-16 h-16 object-contain"
                  />
                </div>
              </div>

              <div className="bg-slate-950 p-2 rounded-xl border border-amber-500/30 text-center">
                <span className="text-[9px] font-mono font-bold text-amber-400 block mb-1">Zebra 2</span>
                <div className="bg-white p-1 rounded-lg inline-block">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(qrZebra2)}`}
                    alt="QR 2"
                    className="w-16 h-16 object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DUO 2 • POSTE ORANGE (Lg: 5 Cols) */}
        <div className={`lg:col-span-5 rounded-3xl p-6 sm:p-8 border-2 transition-all duration-500 relative overflow-hidden flex flex-col justify-between ${
          station2?.status === 'completed'
            ? 'bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.2)]'
            : 'bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-950 border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.15)]'
        }`}>
          {/* Subtle neon accents */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Station Header */}
          <div>
            <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-400 animate-ping"></span>
                <span className="font-display font-black text-sm sm:text-base text-amber-400 tracking-wider uppercase">
                  POSTE 2 • ÉQUIPE ORANGE
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-950 px-3 py-1 rounded-full border border-amber-800/60">
                ÉTAGÈRE 2 • QUAI B
              </span>
            </div>

            {/* Duo Name Hero Display */}
            <div className="my-3">
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold block">
                BINÔME EN COURSE :
              </span>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-wide mt-1 truncate">
                {station2?.team_name || 'Duo Orange'}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-mono">
                <span className="bg-slate-950 px-3 py-1 rounded-xl border border-slate-800 text-sky-300 font-semibold">
                  GT : <strong>{station2?.operator_cea || 'Sarah'}</strong>
                </span>
                <span className="bg-slate-950 px-3 py-1 rounded-xl border border-slate-800 text-amber-300 font-semibold">
                  Invité : <strong>{station2?.client_guest || 'Invité'}</strong>
                </span>
              </div>
            </div>

            {/* Score & Combo Hero Number */}
            <div className="my-6 bg-slate-950/90 rounded-2xl p-5 border border-amber-500/30 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500 font-bold block">
                  SCORE EN DIRECT
                </span>
                <div className="font-display font-black text-5xl sm:text-6xl text-white tracking-tight">
                  {station2?.score || 0}
                  <span className="text-lg font-sans text-amber-400 ml-2 font-bold">PTS</span>
                </div>
              </div>

              {station2?.combo && station2.combo > 1 ? (
                <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-display font-black text-sm tracking-wider shadow-lg shadow-orange-500/30 animate-pulse flex items-center gap-1.5">
                  <Flame className="w-5 h-5 fill-current" />
                  <span>COMBO x{station2.combo}</span>
                </div>
              ) : (
                <div className="text-right text-xs font-mono text-slate-500">
                  <span>Combo x1</span>
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Logistics Race Track (Visual Conveyor) */}
          <div className="space-y-3 pt-4 border-t border-slate-800/80">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-400 font-bold uppercase">Progression du Flux :</span>
              <span className="font-display font-black text-base text-amber-400">
                {station2?.progress_percent || 0}%
              </span>
            </div>

            {/* Progress Track */}
            <div className="relative w-full h-10 bg-slate-950 rounded-2xl border border-slate-800 p-1 flex items-center overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-600 via-orange-500 to-amber-400 rounded-xl transition-all duration-500 shadow-[0_0_20px_rgba(245,158,11,0.5)] flex items-center justify-end pr-2"
                style={{ width: `${Math.max(6, Math.min(100, station2?.progress_percent || 0))}%` }}
              >
                <Truck className="w-5 h-5 text-slate-950 animate-pulse" />
              </div>
            </div>

            {/* Milestones list */}
            <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-mono">
              {stepsCatalog2.map((step, idx) => {
                const currentIdx = station2?.current_step_index ?? 0;
                const isPassed = idx < currentIdx;
                const isCurrent = idx === currentIdx;

                return (
                  <div
                    key={idx}
                    className={`py-1.5 px-1 rounded-xl border transition-all truncate ${
                      isPassed
                        ? 'bg-amber-950/80 border-amber-500/60 text-amber-300 font-bold'
                        : isCurrent
                        ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/30'
                        : 'bg-slate-950 border-slate-800/60 text-slate-600'
                    }`}
                  >
                    {step}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. BOTTOM HALL OF FAME • TOP DUOS PODIUM                                  */}
      {/* ========================================================================= */}
      <footer className="z-10 bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="font-display font-black text-sm sm:text-base text-white uppercase tracking-wider">
              TABLEAU D'HONNEUR • TOP 5 DES DUOS 25 ANS
            </h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-3 py-0.5 rounded-full border border-emerald-500/30">
            Synchronisation Cloud en Temps Réel
          </span>
        </div>

        {topScores.length === 0 ? (
          <div className="py-4 text-center text-xs font-mono text-slate-400 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Le podium est vierge pour l'événement. Le premier binôme à franchir les 3 minutes inscrira le record !</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {topScores.map((sc, idx) => (
              <div
                key={sc.id || idx}
                className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                  idx === 0
                    ? 'bg-gradient-to-r from-amber-950/40 to-slate-950 border-amber-400/60 shadow-lg shadow-amber-500/10'
                    : idx === 1
                    ? 'bg-slate-950 border-slate-400/40 text-slate-200'
                    : idx === 2
                    ? 'bg-slate-950 border-amber-700/40 text-amber-200'
                    : 'bg-slate-950 border-slate-800/80 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className={`w-7 h-7 rounded-xl font-display font-black text-xs flex items-center justify-center shrink-0 ${
                    idx === 0
                      ? 'bg-amber-400 text-slate-950 shadow-md'
                      : idx === 1
                      ? 'bg-slate-300 text-slate-950'
                      : idx === 2
                      ? 'bg-amber-700 text-white'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    #{idx + 1}
                  </span>
                  <div className="truncate">
                    <span className="text-xs font-bold text-white block truncate">{sc.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono block truncate">{sc.company}</span>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-2">
                  <span className="font-display font-black text-sm text-emerald-400 font-mono block">
                    {sc.score} pts
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {sc.time_spent || '02:00'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </footer>

      {/* Modern In-App Confirmation Modal */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="Réinitialiser l'Arène TV 55'' ?"
        message="Voulez-vous remettre l'arène en direct à zéro (vider les 2 stations et remettre le chronomètre à 03:00 pour le prochain duel) ?"
        confirmLabel="Oui, réinitialiser l'arène"
        variant="warning"
        onCancel={() => setIsResetConfirmOpen(false)}
        onConfirm={executeResetArena}
      />
    </div>
  );
};
