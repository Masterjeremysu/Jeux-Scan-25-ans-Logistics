import React, { useState, useEffect } from 'react';
import { DuoStation, AppConfig } from '../types';
import { 
  getStationsLive, 
  subscribeToStationsLive, 
  getRemoteLeaderboard, 
  subscribeToScores,
  resetAllLiveStations,
  RemoteScore,
  subscribeToLiveActivity,
  updateStationLive,
  LiveActivityEvent
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
  Truck,
  ScanBarcode,
  X,
  Zap,
  Activity
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

  // Live Admin Monitor Feed
  const [liveActivities, setLiveActivities] = useState<LiveActivityEvent[]>([]);

  // Pre-match Setup Modal with Duo Registration & QR Codes
  const [isSetupModalOpen, setIsSetupModalOpen] = useState<boolean>(false);
  const [d1Cea, setD1Cea] = useState(() => localStorage.getItem('gt_d1_collab') || 'Jeremy (GT)');
  const [d1Guest, setD1Guest] = useState(() => localStorage.getItem('gt_d1_guest') || 'Thomas (Invité)');
  const [d2Cea, setD2Cea] = useState(() => localStorage.getItem('gt_d2_collab') || 'Sarah (GT)');
  const [d2Guest, setD2Guest] = useState(() => localStorage.getItem('gt_d2_guest') || 'Alexandre (Invité)');

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

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

  const handleResetMatchTime = () => {
    setIsMatchRunning(false);
    setMatchSeconds(appConfig.shiftDurationSeconds || 180);
  };

  const executeResetArena = async () => {
    await resetAllLiveStations();
    const fresh = await getStationsLive();
    setStations(fresh);
    setIsMatchRunning(false);
    setMatchSeconds(appConfig.shiftDurationSeconds || 180);
    setLastEventMsg('Arène remise à zéro • En attente des nouveaux duos');
    setLiveActivities([]);
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

  const baseUrl = (appConfig.publicUrl || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
  const qrZebra1 = `${baseUrl}/#play?station=poste-1`;
  const qrZebra2 = `${baseUrl}/#play?station=poste-2`;

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const liveStations = await getStationsLive();
      if (isMounted && liveStations.length > 0) {
        setStations(liveStations);
        const s1 = liveStations.find((s) => s.station_id === 'poste-1');
        const s2 = liveStations.find((s) => s.station_id === 'poste-2');
        if (s1?.operator_cea) setD1Cea(s1.operator_cea);
        if (s1?.client_guest) setD1Guest(s1.client_guest);
        if (s2?.operator_cea) setD2Cea(s2.operator_cea);
        if (s2?.client_guest) setD2Guest(s2.client_guest);
      } else if (isMounted) {
        setStations([
          {
            station_id: 'poste-1',
            station_name: 'Poste 1 (Scannette A)',
            operator_cea: d1Cea,
            client_guest: d1Guest,
            team_name: `Duo ${d1Guest}`,
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
            operator_cea: d2Cea,
            client_guest: d2Guest,
            team_name: `Duo ${d2Guest}`,
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

    // Subscribe to live activities from Zebra scans
    const unsubActivity = subscribeToLiveActivity((activity) => {
      if (!isMounted) return;
      setLiveActivities((prev) => [activity, ...prev].slice(0, 6));
      setLastEventMsg(`${activity.station_name} • ${activity.message}`);
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
      unsubActivity();
      unsubScores();
    };
  }, []);

  const handleLaunchDuelFromTv = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    localStorage.setItem('gt_d1_collab', d1Cea);
    localStorage.setItem('gt_d1_guest', d1Guest);
    localStorage.setItem('gt_d2_collab', d2Cea);
    localStorage.setItem('gt_d2_guest', d2Guest);

    const name1 = `Duo ${d1Guest.trim() || 'Invité 1'}`;
    const name2 = `Duo ${d2Guest.trim() || 'Invité 2'}`;

    await updateStationLive({
      station_id: 'poste-1',
      station_name: 'Poste 1 (Scannette A)',
      operator_cea: d1Cea.trim() || 'Collaborateur GT 1',
      client_guest: d1Guest.trim() || 'Invité 1',
      team_name: name1,
      score: 0,
      combo: 0,
      progress_percent: 0,
      current_step_index: 0,
      total_steps: 5,
      status: 'in_progress',
      current_mission_title: 'Préparation Commande Multi-Articles'
    });

    await updateStationLive({
      station_id: 'poste-2',
      station_name: 'Poste 2 (Scannette B)',
      operator_cea: d2Cea.trim() || 'Collaborateur GT 2',
      client_guest: d2Guest.trim() || 'Invité 2',
      team_name: name2,
      score: 0,
      combo: 0,
      progress_percent: 0,
      current_step_index: 0,
      total_steps: 5,
      status: 'in_progress',
      current_mission_title: 'Rapprovisionnement Zone Réacteur'
    });

    setMatchSeconds(appConfig.shiftDurationSeconds || 180);
    setIsMatchRunning(true);
    setIsSetupModalOpen(false);
    setLastEventMsg('🚀 TOP DÉPART DUEL ! Les 2 scannettes sont actives !');
  };

  const station1 = stations.find((s) => s.station_id === 'poste-1') || stations[0];
  const station2 = stations.find((s) => s.station_id === 'poste-2') || stations[1];

  const stepsCatalog1 = ['Armoire B01', 'Bride KF40', 'Joint Kalrez', 'Carton', 'Livraison'];
  const stepsCatalog2 = ['Armoire B04', 'Bride Inox', 'Joint Viton', 'Carton', 'Livraison'];

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-3 sm:p-5 lg:p-7 select-none relative overflow-hidden font-sans">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-sky-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-[600px] h-[300px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* ========================================================================= */}
      {/* 1. TOP BROADCAST BAR (Style Régie TV Professionnelle)                      */}
      {/* ========================================================================= */}
      <header className="z-10 bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl px-5 sm:px-6 py-3.5 shadow-2xl flex flex-wrap items-center justify-between gap-3">
        {/* Left: Brand & Event Title */}
        <div className="flex items-center gap-3">
          <GameLogo
            customLogoUrl={appConfig.customLogoUrl}
            size="md"
            showSubtitle={false}
          />
          <div className="h-8 w-px bg-slate-800 hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-base sm:text-xl text-white tracking-wide uppercase">
                GRANDE ARÈNE DUEL
              </span>
              <span className="flex items-center gap-1 text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>DIRECT 55"</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              CEA Grenoble 25 Ans • Challenge Logistique Grand Format
            </p>
          </div>
        </div>

        {/* Center: GIANT ARENA CHRONOMETER */}
        <div className="flex items-center gap-3 bg-slate-950 px-5 py-2 rounded-2xl border border-slate-800 shadow-inner">
          <div className="text-center">
            <span className="text-[9px] uppercase font-mono tracking-widest text-slate-500 font-bold block">
              CHRONO DUEL (3 MIN)
            </span>
            <div className="font-display font-black text-3xl sm:text-5xl text-amber-300 tracking-wider drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]">
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
              title={isMatchRunning ? 'Mettre en pause' : 'Démarrer le chronomètre'}
            >
              {isMatchRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>

            <button
              onClick={handleResetMatchTime}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Remettre le chrono à 03:00"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Actions & Duel Setup Button */}
        <div className="flex items-center gap-2.5">
          {/* PRIMARY SETUP BUTTON: REGISTRATION & QR CODES */}
          <button
            type="button"
            onClick={() => setIsSetupModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-sky-600 via-indigo-600 to-amber-500 hover:from-sky-500 hover:to-amber-400 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
          >
            <Users className="w-4 h-4 text-amber-300" />
            <QrCode className="w-4 h-4 text-sky-200" />
            <span>CONSTITUER LES DUOS & QR CODES</span>
          </button>

          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 text-xs font-mono font-bold transition-colors cursor-pointer"
            title="Remettre les duos et scores à 0"
          >
            RÀZ
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Plein Écran"
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
      {/* 2. THE GRAND SPLIT DUEL ARENA                                             */}
      {/* ========================================================================= */}
      <div className="z-10 my-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch flex-1">

        {/* DUO 1 • POSTE BLEU (Lg: 5 Cols) */}
        <div className={`lg:col-span-5 rounded-3xl p-5 sm:p-7 border-2 transition-all duration-500 relative overflow-hidden flex flex-col justify-between ${
          station1?.status === 'completed'
            ? 'bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.2)]'
            : 'bg-gradient-to-b from-sky-950/40 via-slate-900 to-slate-950 border-sky-500/50 shadow-[0_0_50px_rgba(14,165,233,0.15)]'
        }`}>
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-sky-500/20">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-400 animate-ping"></span>
                <span className="font-display font-black text-sm sm:text-base text-sky-400 tracking-wider uppercase">
                  POSTE 1 • DUO BLEU
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-sky-300 bg-sky-950 px-2.5 py-0.5 rounded-full border border-sky-800/60">
                ÉTAGÈRE 1 • QUAI A
              </span>
            </div>

            {/* Duo Name Hero Display */}
            <div className="my-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block">
                BINÔME EN COURSE :
              </span>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-wide mt-0.5 truncate">
                {station1?.team_name || 'Duo Bleu'}
              </h2>
              <div className="mt-1.5 flex flex-wrap gap-2 text-xs font-mono">
                <span className="bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-sky-300 font-semibold">
                  GT : <strong>{station1?.operator_cea || 'Jeremy'}</strong>
                </span>
                <span className="bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-amber-300 font-semibold">
                  Invité : <strong>{station1?.client_guest || 'Thomas'}</strong>
                </span>
              </div>
            </div>

            {/* Live Action Tracker (What the player is doing right now) */}
            <div className="my-3 bg-slate-950/90 rounded-2xl p-3 border border-sky-500/30 flex items-center justify-between gap-2">
              <div className="truncate">
                <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block">
                  ACTION EN DIRECT SUR SCANNETTE :
                </span>
                <div className="text-xs sm:text-sm font-black text-white truncate flex items-center gap-1.5 mt-0.5">
                  <Activity className="w-3.5 h-3.5 text-sky-400 animate-pulse shrink-0" />
                  <span className="truncate">{station1?.current_mission_title || 'En cours de scan...'}</span>
                </div>
              </div>
              {station1?.last_scan_code && (
                <div className="shrink-0 text-right">
                  <span className="text-[9px] font-mono text-slate-400 block">Dernier scan</span>
                  <span className={`text-[11px] font-mono font-black px-2 py-0.5 rounded-lg border ${
                    station1.last_scan_status === 'invalid'
                      ? 'bg-rose-950 text-rose-300 border-rose-500/40'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {station1.last_scan_code}
                  </span>
                </div>
              )}
            </div>

            {/* Score & Combo */}
            <div className="my-3 bg-slate-950/90 rounded-2xl p-4 border border-sky-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold block">
                  SCORE DUEL
                </span>
                <div className="font-display font-black text-4xl sm:text-5xl text-white tracking-tight">
                  {station1?.score || 0}
                  <span className="text-base font-sans text-sky-400 ml-2 font-bold">PTS</span>
                </div>
              </div>

              {station1?.combo && station1.combo > 1 ? (
                <div className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-display font-black text-xs sm:text-sm tracking-wider shadow-lg shadow-orange-500/30 animate-pulse flex items-center gap-1.5">
                  <Flame className="w-4 h-4 fill-current" />
                  <span>x{station1.combo}</span>
                </div>
              ) : (
                <span className="text-xs font-mono text-slate-600">x1</span>
              )}
            </div>
          </div>

          {/* Dynamic Logistics Race Track */}
          <div className="space-y-2 pt-3 border-t border-slate-800/80">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-400 font-bold uppercase">Flux Commande :</span>
              <span className="font-display font-black text-sm text-sky-400">
                {station1?.progress_percent || 0}%
              </span>
            </div>

            <div className="relative w-full h-8 bg-slate-950 rounded-2xl border border-slate-800 p-1 flex items-center overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-600 via-cyan-500 to-sky-400 rounded-xl transition-all duration-500 shadow-[0_0_20px_rgba(14,165,233,0.5)] flex items-center justify-end pr-2"
                style={{ width: `${Math.max(6, Math.min(100, station1?.progress_percent || 0))}%` }}
              >
                <Truck className="w-4 h-4 text-slate-950 animate-pulse" />
              </div>
            </div>

            <div className="grid grid-cols-5 gap-1 text-center text-[9px] font-mono">
              {stepsCatalog1.map((step, idx) => {
                const currentIdx = station1?.current_step_index ?? 0;
                const isPassed = idx < currentIdx;
                const isCurrent = idx === currentIdx;

                return (
                  <div
                    key={idx}
                    className={`py-1 px-0.5 rounded-lg border transition-all truncate ${
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

        {/* CENTER TOWER • VS & QUICK SCANNER */}
        <div className="lg:col-span-2 flex flex-col items-center justify-between gap-3 py-1">
          {/* Top VS Badge */}
          <div className="my-auto text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 border-2 border-indigo-500/40 flex items-center justify-center shadow-2xl relative group">
              <div className="absolute inset-0 bg-indigo-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all"></div>
              <span className="font-display font-black text-2xl sm:text-3xl text-amber-400 tracking-wider">
                VS
              </span>
            </div>
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 mt-1.5 block font-bold">
              DUEL STAND
            </span>
          </div>

          {/* Quick QR Appairage Widget */}
          <div className="w-full bg-slate-900/90 rounded-2xl p-3 border border-slate-800 text-center shadow-xl">
            <div className="flex items-center justify-center gap-1 mb-1.5 text-xs font-mono font-bold text-slate-300">
              <QrCode className="w-3.5 h-3.5 text-sky-400" />
              <span>QR SCANNETTES</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-slate-950 p-1.5 rounded-xl border border-sky-500/30 text-center">
                <span className="text-[8px] font-mono font-bold text-sky-400 block mb-0.5">Zebra 1</span>
                <div className="bg-white p-1 rounded-lg inline-block">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(qrZebra1)}`}
                    alt="QR 1"
                    className="w-14 h-14 object-contain"
                  />
                </div>
              </div>

              <div className="bg-slate-950 p-1.5 rounded-xl border border-amber-500/30 text-center">
                <span className="text-[8px] font-mono font-bold text-amber-400 block mb-0.5">Zebra 2</span>
                <div className="bg-white p-1 rounded-lg inline-block">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(qrZebra2)}`}
                    alt="QR 2"
                    className="w-14 h-14 object-contain"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSetupModalOpen(true)}
              className="w-full mt-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 text-[10px] font-mono font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer"
            >
              Équipes & QR Agrandis
            </button>
          </div>
        </div>

        {/* DUO 2 • POSTE ORANGE (Lg: 5 Cols) */}
        <div className={`lg:col-span-5 rounded-3xl p-5 sm:p-7 border-2 transition-all duration-500 relative overflow-hidden flex flex-col justify-between ${
          station2?.status === 'completed'
            ? 'bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.2)]'
            : 'bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-950 border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.15)]'
        }`}>
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-amber-500/20">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping"></span>
                <span className="font-display font-black text-sm sm:text-base text-amber-400 tracking-wider uppercase">
                  POSTE 2 • DUO ORANGE
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-800/60">
                ÉTAGÈRE 2 • QUAI B
              </span>
            </div>

            {/* Duo Name Hero Display */}
            <div className="my-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block">
                BINÔME EN COURSE :
              </span>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-wide mt-0.5 truncate">
                {station2?.team_name || 'Duo Orange'}
              </h2>
              <div className="mt-1.5 flex flex-wrap gap-2 text-xs font-mono">
                <span className="bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-sky-300 font-semibold">
                  GT : <strong>{station2?.operator_cea || 'Sarah'}</strong>
                </span>
                <span className="bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-amber-300 font-semibold">
                  Invité : <strong>{station2?.client_guest || 'Alexandre'}</strong>
                </span>
              </div>
            </div>

            {/* Live Action Tracker (What the player is doing right now) */}
            <div className="my-3 bg-slate-950/90 rounded-2xl p-3 border border-amber-500/30 flex items-center justify-between gap-2">
              <div className="truncate">
                <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block">
                  ACTION EN DIRECT SUR SCANNETTE :
                </span>
                <div className="text-xs sm:text-sm font-black text-white truncate flex items-center gap-1.5 mt-0.5">
                  <Activity className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
                  <span className="truncate">{station2?.current_mission_title || 'En cours de scan...'}</span>
                </div>
              </div>
              {station2?.last_scan_code && (
                <div className="shrink-0 text-right">
                  <span className="text-[9px] font-mono text-slate-400 block">Dernier scan</span>
                  <span className={`text-[11px] font-mono font-black px-2 py-0.5 rounded-lg border ${
                    station2.last_scan_status === 'invalid'
                      ? 'bg-rose-950 text-rose-300 border-rose-500/40'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {station2.last_scan_code}
                  </span>
                </div>
              )}
            </div>

            {/* Score & Combo */}
            <div className="my-3 bg-slate-950/90 rounded-2xl p-4 border border-amber-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold block">
                  SCORE DUEL
                </span>
                <div className="font-display font-black text-4xl sm:text-5xl text-white tracking-tight">
                  {station2?.score || 0}
                  <span className="text-base font-sans text-amber-400 ml-2 font-bold">PTS</span>
                </div>
              </div>

              {station2?.combo && station2.combo > 1 ? (
                <div className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-display font-black text-xs sm:text-sm tracking-wider shadow-lg shadow-orange-500/30 animate-pulse flex items-center gap-1.5">
                  <Flame className="w-4 h-4 fill-current" />
                  <span>x{station2.combo}</span>
                </div>
              ) : (
                <span className="text-xs font-mono text-slate-600">x1</span>
              )}
            </div>
          </div>

          {/* Dynamic Logistics Race Track */}
          <div className="space-y-2 pt-3 border-t border-slate-800/80">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-400 font-bold uppercase">Flux Commande :</span>
              <span className="font-display font-black text-sm text-amber-400">
                {station2?.progress_percent || 0}%
              </span>
            </div>

            <div className="relative w-full h-8 bg-slate-950 rounded-2xl border border-slate-800 p-1 flex items-center overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-600 via-orange-500 to-amber-400 rounded-xl transition-all duration-500 shadow-[0_0_20px_rgba(245,158,11,0.5)] flex items-center justify-end pr-2"
                style={{ width: `${Math.max(6, Math.min(100, station2?.progress_percent || 0))}%` }}
              >
                <Truck className="w-4 h-4 text-slate-950 animate-pulse" />
              </div>
            </div>

            <div className="grid grid-cols-5 gap-1 text-center text-[9px] font-mono">
              {stepsCatalog2.map((step, idx) => {
                const currentIdx = station2?.current_step_index ?? 0;
                const isPassed = idx < currentIdx;
                const isCurrent = idx === currentIdx;

                return (
                  <div
                    key={idx}
                    className={`py-1 px-0.5 rounded-lg border transition-all truncate ${
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
      {/* 3. LIVE SCANS MONITOR TICKER (Ce que les joueurs font en temps réel)       */}
      {/* ========================================================================= */}
      <div className="z-10 my-2 bg-slate-900/95 border border-indigo-500/30 rounded-2xl p-2.5 shadow-xl flex items-center gap-3 overflow-hidden">
        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs font-bold text-amber-300 shrink-0">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>LIVE SCAN FEED :</span>
        </div>

        <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar font-mono text-xs">
          {liveActivities.length === 0 ? (
            <span className="text-slate-500 text-xs italic">
              En attente des premiers scans laser des binômes sur leurs scannettes...
            </span>
          ) : (
            liveActivities.map((act, i) => (
              <div
                key={act.id || i}
                className={`px-3 py-1 rounded-xl border shrink-0 flex items-center gap-2 ${
                  act.status === 'valid'
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : act.status === 'invalid'
                    ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                    : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                }`}
              >
                <span className="font-bold">{act.station_name.split(' ')[0]} :</span>
                <span>{act.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. BOTTOM HALL OF FAME • TOP DUOS PODIUM                                  */}
      {/* ========================================================================= */}
      <footer className="z-10 bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-4 sm:p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            <h3 className="font-display font-black text-xs sm:text-base text-white uppercase tracking-wider">
              TABLEAU D'HONNEUR • TOP 5 DES DUOS 25 ANS
            </h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
            Synchronisation Cloud Temps Réel
          </span>
        </div>

        {topScores.length === 0 ? (
          <div className="py-2.5 text-center text-xs font-mono text-slate-400 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Le podium est vierge. Le premier binôme à franchir les 3 minutes inscrira le record !</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {topScores.map((sc, idx) => (
              <div
                key={sc.id || idx}
                className={`p-2.5 rounded-2xl border flex items-center justify-between transition-all ${
                  idx === 0
                    ? 'bg-gradient-to-r from-amber-950/40 to-slate-950 border-amber-400/60 shadow-lg shadow-amber-500/10'
                    : idx === 1
                    ? 'bg-slate-950 border-slate-400/40 text-slate-200'
                    : idx === 2
                    ? 'bg-slate-950 border-amber-700/40 text-amber-200'
                    : 'bg-slate-950 border-slate-800/80 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-6 h-6 rounded-lg font-display font-black text-[11px] flex items-center justify-center shrink-0 ${
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
                    <span className="text-[9px] text-slate-400 font-mono block truncate">{sc.company}</span>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-1.5">
                  <span className="font-display font-black text-xs sm:text-sm text-emerald-400 font-mono block">
                    {sc.score} pts
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">
                    {sc.time_spent || '02:00'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </footer>

      {/* ========================================================================= */}
      {/* 5. MODALE PRINCIPALE DE CONSTITUTION DUEL & APPAIRAGE QR CODES            */}
      {/* ========================================================================= */}
      {isSetupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn select-none">
          <div className="relative bg-slate-900 border-2 border-indigo-500/70 rounded-3xl p-5 sm:p-8 max-w-4xl w-full shadow-2xl text-slate-100 max-h-[95vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setIsSetupModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Swords className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-sky-400 block">
                  CONFIGURATION DUEL EN DIRECT
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Constituer les Équipes & Flasher les Scannettes Zebra
                </h2>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 mb-6">
              Inscrivez les binômes ci-dessous. Les joueurs peuvent flasher directement ces QR codes avec leur scannette Zebra ou leur smartphone pour ouvrir leur session synchronisée !
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-2">
              {/* DUO 1 FORM & QR */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border-2 border-sky-500/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-sky-400 animate-ping" />
                    <span className="text-xs font-black font-mono text-sky-400 uppercase">
                      DUO 1 • POSTE BLEU
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Scannette A</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1 font-bold">
                      Collaborateur GT :
                    </label>
                    <input
                      type="text"
                      value={d1Cea}
                      onChange={(e) => setD1Cea(e.target.value)}
                      placeholder="Ex: Jeremy (GT)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-bold focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1 font-bold">
                      Invité :
                    </label>
                    <input
                      type="text"
                      value={d1Guest}
                      onChange={(e) => setD1Guest(e.target.value)}
                      placeholder="Ex: Thomas (Invité)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="pt-2 text-center border-t border-slate-800/80 flex flex-col items-center">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase mb-2">
                    Flasher sur la scannette Zebra 1
                  </span>
                  <div className="bg-white p-2.5 rounded-xl shadow-lg mb-2">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrZebra1)}`}
                      alt="QR Zebra 1"
                      className="w-32 h-32 object-contain"
                    />
                  </div>
                  <a
                    href={qrZebra1}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-sky-400 hover:underline flex items-center gap-1 font-mono font-bold"
                  >
                    <span>Ouvrir l'onglet Duo 1</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* DUO 2 FORM & QR */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border-2 border-amber-500/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-xs font-black font-mono text-amber-400 uppercase">
                      DUO 2 • POSTE ORANGE
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Scannette B</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1 font-bold">
                      Collaborateur GT :
                    </label>
                    <input
                      type="text"
                      value={d2Cea}
                      onChange={(e) => setD2Cea(e.target.value)}
                      placeholder="Ex: Sarah (GT)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1 font-bold">
                      Invité :
                    </label>
                    <input
                      type="text"
                      value={d2Guest}
                      onChange={(e) => setD2Guest(e.target.value)}
                      placeholder="Ex: Alexandre (Invité)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="pt-2 text-center border-t border-slate-800/80 flex flex-col items-center">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase mb-2">
                    Flasher sur la scannette Zebra 2
                  </span>
                  <div className="bg-white p-2.5 rounded-xl shadow-lg mb-2">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrZebra2)}`}
                      alt="QR Zebra 2"
                      className="w-32 h-32 object-contain"
                    />
                  </div>
                  <a
                    href={qrZebra2}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-mono font-bold"
                  >
                    <span>Ouvrir l'onglet Duo 2</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Big Launch Button */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
              <div className="text-xs text-slate-400 font-mono">
                ⚡ Le clic démarrera le chrono 3:00 et activera les missions sur les 2 scannettes.
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsSetupModalOpen(false)}
                  className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={() => handleLaunchDuelFromTv()}
                  className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all hover:scale-105 cursor-pointer w-full sm:w-auto"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>DÉMARRER LE DUEL EN DIRECT !</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
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
