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
  Award
} from 'lucide-react';

interface ArenaTvViewProps {
  appConfig: AppConfig;
}

export const ArenaTvView: React.FC<ArenaTvViewProps> = ({ appConfig }) => {
  const [stations, setStations] = useState<DuoStation[]>([]);
  const [topScores, setTopScores] = useState<RemoteScore[]>([]);
  const [lastEventMsg, setLastEventMsg] = useState<string>('En attente du départ du duel...');

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const liveStations = await getStationsLive();
      if (isMounted && liveStations.length > 0) {
        setStations(liveStations);
      } else if (isMounted) {
        // Fallback default duos if offline
        setStations([
          {
            station_id: 'poste-1',
            station_name: 'Poste 1 (Scannette A)',
            operator_cea: 'Pierre (Logistique)',
            client_guest: 'M. Laurent',
            team_name: 'Duo Cryo LETI',
            current_mission_title: 'Préparation Urgente LETI Bât. 17',
            progress_percent: 60,
            current_step_index: 3,
            total_steps: 5,
            score: 750,
            combo: 3,
            status: 'in_progress',
            last_scan_code: 'ART-KF40-INOX',
            last_scan_status: 'valid'
          },
          {
            station_id: 'poste-2',
            station_name: 'Poste 2 (Scannette B)',
            operator_cea: 'Claire (Magasin)',
            client_guest: 'Sophie V.',
            team_name: 'Duo Minatec Silicium',
            current_mission_title: 'Wafers 300mm Salle Blanche',
            progress_percent: 40,
            current_step_index: 2,
            total_steps: 5,
            score: 500,
            combo: 2,
            status: 'in_progress',
            last_scan_code: 'LOC-SB-C01',
            last_scan_status: 'valid'
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
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 rounded-3xl p-5 sm:p-7 border border-indigo-500/30 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
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
              Course en direct des binômes : Opérateur CEA 🤝 Client Invité
            </p>
          </div>
        </div>

        {/* Live Ticker */}
        <div className="bg-slate-950/80 px-4 py-2 rounded-2xl border border-slate-800 flex items-center space-x-2 text-xs font-mono text-slate-300 shrink-0">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-bold">INFO :</span>
          <span className="truncate max-w-[280px]">{lastEventMsg}</span>
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
            {topScores.map((row, i) => (
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
            ))}
          </div>
        </div>

        {/* Guest QR Code Card */}
        <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 rounded-3xl p-5 sm:p-6 border border-indigo-500/30 shadow-xl flex flex-col items-center justify-between text-center">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 mx-auto flex items-center justify-center text-indigo-400">
              <QrCode className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-black text-white">REJOINDRE SUR MOBILE</h4>
            <p className="text-xs text-slate-300">
              Scannez pour suivre le classement en direct ou consulter votre diplôme souvenir :
            </p>
          </div>

          {/* Dynamic QR Code representation */}
          <div className="my-3 bg-white p-3 rounded-2xl shadow-lg border-2 border-slate-200">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent('https://jeux-scan-25-ans-logistics.vercel.app')}`}
              alt="QR Code Classement Mobile"
              className="w-32 h-32"
            />
          </div>

          <span className="text-[11px] font-mono text-sky-400 font-bold">
            jeux-scan-25-ans-logistics.vercel.app
          </span>
        </div>
      </div>
    </div>
  );
};
