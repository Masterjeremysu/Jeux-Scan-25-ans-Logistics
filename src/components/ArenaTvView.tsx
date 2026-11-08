import React, { useState, useEffect } from 'react';
import { DuoStation, AppConfig } from '../types';
import { 
  getStationsLive, 
  subscribeToStationsLive, 
  getRemoteLeaderboard, 
  subscribeToScores,
  RemoteScore,
  isSupabaseConfigured 
} from '../services/supabaseClient';
import { 
  Tv, 
  Trophy, 
  Flame, 
  CheckCircle, 
  AlertCircle, 
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
  Timer,
  Smartphone
} from 'lucide-react';

interface ArenaTvViewProps {
  appConfig: AppConfig;
}

export const ArenaTvView: React.FC<ArenaTvViewProps> = ({ appConfig }) => {
  const [stations, setStations] = useState<DuoStation[]>([]);
  const [topScores, setTopScores] = useState<RemoteScore[]>([]);
  const [lastEventMsg, setLastEventMsg] = useState<string>('En attente du départ du duel...');
  const [gameMode, setGameMode] = useState<'duel' | 'chrono'>('duel');
  const [matchSeconds, setMatchSeconds] = useState<number>(180);
  const [isMatchRunning, setIsMatchRunning] = useState<boolean>(false);

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
    setMatchSeconds(180);
  };

  const baseUrl = (appConfig.publicUrl || 'https://jeux-scan-25-ans-logistics.vercel.app').replace(/\/$/, '');

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const liveStations = await getStationsLive();
      if (isMounted && liveStations.length > 0) {
        setStations(liveStations);
      } else if (isMounted) {
        const defaultList = (appConfig.availableStations || [
          { id: 'poste-1', name: 'Poste 1 (Scannette A)' },
          { id: 'poste-2', name: 'Poste 2 (Scannette B)' }
        ]).map((st) => ({
          station_id: st.id,
          station_name: st.name,
          operator_cea: 'Opérateur',
          client_guest: 'Invité',
          team_name: 'Binôme en attente',
          current_mission_title: 'En attente du premier scan...',
          progress_percent: 0,
          current_step_index: 0,
          total_steps: 5,
          score: 0,
          combo: 0,
          status: 'idle' as const
        }));
        setStations(defaultList);
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
          `${updatedStation.station_name} • ${updatedStation.team_name} a scanné ${updatedStation.last_scan_code}`
        );
      }
    });

    // Subscribe to scores leaderboard updates
    const unsubScores = subscribeToScores((newScore) => {
      setTopScores((prev) => {
        const merged = [newScore, ...prev.filter((s) => s.id !== newScore.id)];
        return merged.sort((a, b) => b.score - a.score).slice(0, 5);
      });
    });

    return () => {
      isMounted = false;
      unsubStations();
      unsubScores();
    };
  }, []);

  return (
    <div className="min-h-[calc(100vh-65px)] p-3 sm:p-6 flex flex-col gap-5 max-w-7xl mx-auto w-full select-none">
      {/* Top TV Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 rounded-3xl p-5 sm:p-7 border border-indigo-500/30 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-600/30 shrink-0">
            <Tv className="w-8 h-8 animate-pulse text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
                {appConfig.eventTitle} • GRANDE ARÈNE DUEL
              </h1>
              <span className="text-[11px] font-bold px-3 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping inline-block"></span>
                <span>DIRECT RÉGIE</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 font-mono">
              Écran Concentrateur 55" • Stand Logistique 25 Ans
            </p>
          </div>
        </div>

        {/* Center: Match Mode Switch & Countdown Clock */}
        <div className="flex flex-wrap items-center justify-center gap-3 bg-slate-950/80 p-3 rounded-2xl border border-indigo-500/30 font-mono">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setGameMode('duel')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg font-bold transition-all ${
                gameMode === 'duel' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Duel 2 Duos</span>
            </button>
            <button
              onClick={() => setGameMode('chrono')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg font-bold transition-all ${
                gameMode === 'chrono' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Défi Chrono</span>
            </button>
          </div>

          {/* Giant Countdown Clock */}
          <div className="flex items-center space-x-2 px-3 py-1 bg-slate-900 rounded-xl border border-slate-800">
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-2xl font-black text-amber-300 tracking-wider">
              {formatMatchTime(matchSeconds)}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleToggleMatch}
              className={`p-2 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all ${
                isMatchRunning
                  ? 'bg-amber-600 hover:bg-amber-500 text-slate-950'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
              title={isMatchRunning ? 'Mettre en pause' : 'Démarrer le chrono du match'}
            >
              {isMatchRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button
              onClick={handleResetMatchTime}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700 transition-colors"
              title="Réinitialiser le chrono (3 min)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Ticker */}
        <div className="bg-slate-950/80 px-4 py-2 rounded-2xl border border-slate-800 flex items-center space-x-2 text-xs font-mono text-slate-300 shrink-0">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-bold">INFO :</span>
          <span className="truncate max-w-[220px]">{lastEventMsg}</span>
        </div>
      </div>

      {/* Duel Stations: Live Progress Race Tracks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {stations.map((station, idx) => (
          <div
            key={station.station_id || idx}
            className={`rounded-3xl p-5 sm:p-6 border shadow-2xl transition-all duration-300 flex flex-col justify-between ${
              station.status === 'completed'
                ? 'bg-gradient-to-br from-emerald-950/60 to-slate-900 border-emerald-500/50'
                : idx === 0
                ? 'bg-gradient-to-br from-sky-950/40 via-slate-900 to-slate-900 border-sky-500/40'
                : 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/40'
            }`}
          >
            {/* Station Header */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2.5">
                  <span className={`text-xs font-black font-mono px-3 py-1 rounded-xl uppercase tracking-wider ${
                    idx === 0 ? 'bg-sky-500 text-slate-950' : 'bg-amber-400 text-slate-950'
                  }`}>
                    {station.station_name}
                  </span>
                  {station.combo > 1 && (
                    <span className="flex items-center space-x-1 text-xs font-black px-2.5 py-0.5 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/40 animate-pulse">
                      <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
                      <span>COMBO x{station.combo}</span>
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-white">
                    {station.score} <span className="text-xs text-slate-400 font-normal">pts</span>
                  </span>
                </div>
              </div>

              {/* Duo Team Names */}
              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-sky-400" />
                    <span className="text-sm font-black text-white">{station.team_name}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {station.status === 'completed' ? '🏆 Terminé !' : 'En direct'}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-2 text-xs font-mono">
                  <span className="text-sky-300 font-bold bg-sky-950/80 px-2 py-0.5 rounded-md border border-sky-800/50">
                    Agent CEA : {station.operator_cea}
                  </span>
                  <span className="text-amber-300 font-bold bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-800/50">
                    Invité : {station.client_guest}
                  </span>
                </div>
              </div>

              {/* Current Mission Info */}
              <div className="text-xs font-mono text-slate-300 mb-3">
                <span className="text-slate-500">Mission : </span>
                <strong className="text-slate-100">{station.current_mission_title}</strong>
              </div>
            </div>

            {/* Visual Race Track: Forklift & Carton Moving */}
            <div className="space-y-2 mt-4">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">Progression du Picking</span>
                <span className="text-emerald-400 font-bold font-mono text-sm">
                  {station.progress_percent}% ({station.current_step_index}/{station.total_steps || 5} étapes)
                </span>
              </div>

              {/* Race Track Bar */}
              <div className="relative w-full h-8 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center p-1">
                {/* Fill bar */}
                <div
                  className={`h-full rounded-xl transition-all duration-500 ${
                    idx === 0
                      ? 'bg-gradient-to-r from-sky-600 to-cyan-400'
                      : 'bg-gradient-to-r from-amber-600 to-yellow-400'
                  }`}
                  style={{ width: `${Math.max(5, Math.min(100, station.progress_percent))}%` }}
                ></div>

                {/* Animated Package Icon at current progress */}
                <div
                  className="absolute transition-all duration-500 transform -translate-x-1/2 flex items-center justify-center text-slate-950 font-bold drop-shadow-lg"
                  style={{ left: `${Math.max(5, Math.min(95, station.progress_percent))}%` }}
                >
                  <div className="w-7 h-7 rounded-full bg-white shadow-md border-2 border-slate-900 flex items-center justify-center text-slate-900 text-xs">
                    📦
                  </div>
                </div>
              </div>

              {/* Last scan status badge */}
              {station.last_scan_code && (
                <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/40 px-3 py-1.5 rounded-xl border border-slate-800/60">
                  <span>Dernier Scan : <strong className="text-white">{station.last_scan_code}</strong></span>
                  <span className={`font-bold ${station.last_scan_status === 'valid' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {station.last_scan_status === 'valid' ? '✓ VALIDE' : '✗ ERREUR'}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Section: Top 5 Podium & Mobile QR Code */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Live Top 5 Leaderboard */}
        <div className="lg:col-span-2 bg-slate-900/90 rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-black text-white uppercase tracking-wide">
                TOP 5 DUOS DES 25 ANS (PODIUM LIVE)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Synchronisation Realtime
            </span>
          </div>

          <div className="space-y-2">
            {topScores.length === 0 ? (
              <div className="py-8 text-center text-slate-500 font-mono text-xs">
                En attente des premières missions validées sur les postes pour afficher le podium...
              </div>
            ) : (
              topScores.map((row, i) => (
                <div
                  key={row.id || i}
                  className="flex items-center justify-between bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                      i === 0 
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20' 
                        : i === 1 
                        ? 'bg-slate-300 text-slate-950' 
                        : i === 2 
                        ? 'bg-amber-700 text-white' 
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </div>
                    <div>
                      <span className="font-bold text-white text-sm block">{row.name}</span>
                      <span className="text-xs text-slate-400 font-mono">{row.company}</span>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-base font-black text-emerald-400 block">{row.score} pts</span>
                    <span className="text-[10px] text-slate-500">{row.time_spent || '01:50'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Zebra Scannettes & Mobile Fast Connect Panel */}
        <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-slate-800">
            <Smartphone className="w-5 h-5 text-sky-400" />
            <h4 className="text-xs font-black text-white uppercase tracking-wider font-mono">
              Connexion Rapide Scannettes Zebra
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            {/* Zebra 1 */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-sky-500/40 flex flex-col items-center justify-between">
              <span className="text-[11px] font-bold text-sky-300 font-mono">Poste 1 (Bleu)</span>
              <div className="my-1.5 bg-white p-1.5 rounded-xl shadow">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(`${baseUrl}/#poste-1`)}`}
                  alt="QR Code Poste 1"
                  className="w-20 h-20"
                />
              </div>
              <span className="text-[9px] text-slate-400 font-mono">Visez avec Zebra 1</span>
            </div>

            {/* Zebra 2 */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-amber-500/40 flex flex-col items-center justify-between">
              <span className="text-[11px] font-bold text-amber-300 font-mono">Poste 2 (Orange)</span>
              <div className="my-1.5 bg-white p-1.5 rounded-xl shadow">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(`${baseUrl}/#poste-2`)}`}
                  alt="QR Code Poste 2"
                  className="w-20 h-20"
                />
              </div>
              <span className="text-[9px] text-slate-400 font-mono">Visez avec Zebra 2</span>
            </div>
          </div>

          {/* Spectator QR link */}
          <div className="mt-3 pt-2.5 border-t border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block font-mono">
              Spectateurs : <a href={`${baseUrl}/#podium`} target="_blank" rel="noreferrer" className="text-emerald-400 underline font-bold">classement live sur mobile</a>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
