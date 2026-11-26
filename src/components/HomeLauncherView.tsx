import React, { useState } from 'react';
import { 
  Swords, 
  Tv, 
  Trophy, 
  QrCode, 
  Printer, 
  Settings, 
  Sparkles, 
  Zap, 
  ArrowRight,
  ExternalLink,
  X,
  Clock,
  Shuffle,
  FileText,
  Radio,
  ScanBarcode,
  Flame,
  ChevronRight
} from 'lucide-react';
import { AppConfig, DuoStation, Mission } from '../types';
import { GameLogo } from './GameLogo';
import { soundService } from '../services/soundService';
import { filterMissionsForStation } from '../services/autoLoopMissionGenerator';

interface HomeLauncherViewProps {
  appConfig: AppConfig;
  liveStations: DuoStation[];
  missions?: Mission[];
  onStartDuel: (duo1: { cea: string; client: string }, duo2: { cea: string; client: string }, m1Idx?: number, m2Idx?: number) => void;
  onStartSolo: (stationId: string, stationName: string, duo: { cea: string; client: string }, mIdx?: number) => void;
  onOpenTv: () => void;
  onOpenPodium: () => void;
  onOpenAdmin: () => void;
  onOpenPrint: () => void;
  onUpdateLogo?: (url: string) => void;
}

export const HomeLauncherView: React.FC<HomeLauncherViewProps> = ({
  appConfig,
  liveStations,
  missions,
  onStartDuel,
  onStartSolo,
  onOpenTv,
  onOpenPodium,
  onOpenAdmin,
  onOpenPrint,
  onUpdateLogo
}) => {
  const [gameMode, setGameMode] = useState<'duel' | 'solo'>('duel');
  const missionsPool: Mission[] = missions || [];
  const p1Missions = filterMissionsForStation(missionsPool, 'poste-1');
  const p2Missions = filterMissionsForStation(missionsPool, 'poste-2');

  // Duo 1 state
  const [d1Cea, setD1Cea] = useState(() => localStorage.getItem('gt_d1_collab') || 'Jeremy (GT)');
  const [d1Client, setD1Client] = useState(() => localStorage.getItem('gt_d1_guest') || 'Thomas (Invité)');
  const [m1Index, setM1Index] = useState(0);

  // Duo 2 state
  const [d2Cea, setD2Cea] = useState(() => localStorage.getItem('gt_d2_collab') || 'Sarah (GT)');
  const [d2Client, setD2Client] = useState(() => localStorage.getItem('gt_d2_guest') || 'Alexandre (Invité)');
  const [m2Index, setM2Index] = useState(0);

  // Solo station selection
  const [soloStation, setSoloStation] = useState('poste-1');
  const [soloSavedIndex, setSoloSavedIndex] = useState(0);
  const [duoRoundNumber, setDuoRoundNumber] = useState(1);
  const [showQrModal, setShowQrModal] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState(() => appConfig.publicUrl || (typeof window !== 'undefined' ? window.location.origin : ''));

  const activeBaseUrl = customServerUrl.trim() || appConfig.publicUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const zebra1Url = `${activeBaseUrl}/#play?station=poste-1`;
  const zebra2Url = `${activeBaseUrl}/#play?station=poste-2`;

  const station1Live = liveStations.find((s) => s.station_id === 'poste-1');
  const station2Live = liveStations.find((s) => s.station_id === 'poste-2');
  const shiftMinutes = Math.floor((appConfig.shiftDurationSeconds || 180) / 60);

  // Randomiser les missions entre les deux postes pour une variété maximale (10 à 20 duos)
  const handleRandomizeMissions = () => {
    soundService.playSuccessJingle();
    if (p1Missions.length > 0) setM1Index(Math.floor(Math.random() * p1Missions.length));
    if (p2Missions.length > 0) setM2Index(Math.floor(Math.random() * p2Missions.length));
  };

  // Préparer automatiquement le passage au binôme suivant (Duo #2, Duo #3...)
  const handleNextDuo = () => {
    soundService.playScanBeep();
    const nextRound = duoRoundNumber + 1;
    setDuoRoundNumber(nextRound);
    setD1Client(`Invité Duo #${nextRound * 2 - 1}`);
    setD2Client(`Invité Duo #${nextRound * 2}`);
    if (p1Missions.length > 0) setM1Index((nextRound - 1) % p1Missions.length);
    if (p2Missions.length > 0) setM2Index((nextRound - 1) % p2Missions.length);
  };

  const handleLaunchDuel = (e: React.FormEvent) => {
    e.preventDefault();
    soundService.playSuccessJingle();
    localStorage.setItem('gt_d1_collab', d1Cea);
    localStorage.setItem('gt_d1_guest', d1Client);
    localStorage.setItem('gt_d2_collab', d2Cea);
    localStorage.setItem('gt_d2_guest', d2Client);

    onStartDuel(
      { cea: d1Cea.trim() || 'Collaborateur GT 1', client: d1Client.trim() || 'Invité 1' },
      { cea: d2Cea.trim() || 'Collaborateur GT 2', client: d2Client.trim() || 'Invité 2' },
      m1Index,
      m2Index
    );
  };

  const handleLaunchSolo = (e: React.FormEvent) => {
    e.preventDefault();
    soundService.playSuccessJingle();
    const stName = soloStation === 'poste-2' ? 'Poste 2 (Scannette B)' : 'Poste 1 (Scannette A)';
    onStartSolo(
      soloStation,
      stName,
      { cea: d1Cea.trim() || 'Collaborateur GT', client: d1Client.trim() || 'Invité' },
      soloSavedIndex
    );
  };

  return (
    <div className="min-h-[calc(100vh-65px)] bg-[#040914] text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* ============================================================
          FUTURISTIC ARENA ATMOSPHERE & LASER BACKDROP
         ============================================================ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Cyber-warehouse precision grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(56,189,248,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(56,189,248,0.18) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 80% 70% at 50% 25%, black 25%, transparent 90%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 25%, black 25%, transparent 90%)',
          }}
        />

        {/* Volumetric Stadium Spotlights */}
        <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[760px] h-[360px] bg-sky-500/20 rounded-full blur-[130px]" />
        <div className="absolute top-12 -left-24 w-[420px] h-[420px] bg-red-600/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 -right-24 w-[460px] h-[420px] bg-amber-500/15 rounded-full blur-[130px]" />

        {/* Subtle Laser Scanner Sweep */}
        <div className="absolute inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-red-500/70 to-transparent shadow-[0_0_20px_3px_rgba(239,68,68,0.45)] animate-laser-scan opacity-60" />
      </div>

      {/* ============================================================
          LIVE TELEMETRY BAR + MONUMENTAL HERO
         ============================================================ */}
      <div className="relative z-10 max-w-5xl w-full mx-auto flex flex-col items-center text-center pt-1 sm:pt-2">
        {/* Live Telemetry Ribbon */}
        <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/70 backdrop-blur-md shadow-lg mb-5 text-[10px] sm:text-xs font-mono">
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            ARÈNE LIVE
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-red-400 font-black uppercase tracking-wider">
            JUBILÉ 25 ANS (2001–2026)
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-sky-300 font-bold hidden sm:inline">
            {missionsPool.length} MISSIONS PRÊTES
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-amber-300 font-bold hidden sm:inline">
            ⏱️ {shiftMinutes}:00 CHRONO
          </span>
        </div>

        {/* Hero Emblem + Orbital Ring */}
        <div className="relative mb-3">
          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-red-600/20 via-sky-500/25 to-amber-500/20 blur-2xl pointer-events-none" />
          <div className="relative bg-slate-900/60 backdrop-blur-xl border border-slate-700/70 rounded-3xl px-5 py-3.5 sm:px-8 sm:py-5 shadow-[0_0_50px_rgba(14,165,233,0.18)]">
            <GameLogo
              customLogoUrl={appConfig.customLogoUrl}
              size="hero"
              allowUpload={true}
              onUpdateLogo={onUpdateLogo}
            />
          </div>
        </div>

        {/* Tagline & Live Stat Chips */}
        <p className="text-xs sm:text-base text-slate-300 max-w-2xl mx-auto font-sans mt-2 leading-relaxed">
          Le grand challenge de rapidité et traçabilité logistique en immersion physique.{' '}
          <strong className="text-white font-extrabold">
            {shiftMinutes} minutes chrono
          </strong>{' '}
          pour flasher les emplacements, préparer les commandes et dominer le podium !
        </p>
      </div>

      {/* ============================================================
          MAIN MODE SWITCHER & MATCH LAUNCHER COCKPIT
         ============================================================ */}
      <div className="max-w-5xl w-full mx-auto z-10 my-5 sm:my-6">
        {/* Segmented Arcade Mode Switch */}
        <div className="flex items-center justify-center p-1.5 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-xl max-w-lg mx-auto mb-5">
          <button
            type="button"
            onClick={() => {
              soundService.playScanBeep();
              setGameMode('duel');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              gameMode === 'duel'
                ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-white shadow-[0_0_25px_rgba(239,68,68,0.45)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Swords className="w-4 h-4 shrink-0" />
            <span className="font-display tracking-wide">DUEL 2 DUOS</span>
            <span
              className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded font-black hidden sm:inline ${
                gameMode === 'duel'
                  ? 'bg-slate-950/40 text-amber-200 border border-white/20'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              VS LIVE
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundService.playScanBeep();
              setGameMode('solo');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              gameMode === 'solo'
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 text-white shadow-[0_0_25px_rgba(16,185,129,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span className="font-display tracking-wide">DÉFI CHRONO</span>
            <span
              className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded font-black hidden sm:inline ${
                gameMode === 'solo'
                  ? 'bg-slate-950/40 text-emerald-200 border border-white/20'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              1 DUO
            </span>
          </button>
        </div>

        {/* ============================================================
            DUEL MODE LAUNCHER CARD (ESPORT FACE-À-FACE)
           ============================================================ */}
        {gameMode === 'duel' && (
          <form
            onSubmit={handleLaunchDuel}
            className="bg-slate-900/75 backdrop-blur-xl rounded-3xl p-5 sm:p-7 border border-slate-700/80 shadow-[0_20px_70px_rgba(0,0,0,0.65)] relative overflow-hidden"
          >
            {/* Top Glowing Accent Strip */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sky-500 via-red-500 to-amber-500" />

            {/* Header + Broadcast Dispatch Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 mb-5 border-b border-slate-800/90">
              <div className="text-left">
                <div className="inline-flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30 mb-1.5">
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span>Face-à-Face Simultané • 2 Scannettes Zebra</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
                  Configurez les 2 Équipes
                </h2>
              </div>

              {/* Rapid Dispatch Controls */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 p-2 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2 px-2.5 py-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-mono font-bold text-slate-300">
                    Manche <span className="text-sky-400 font-black">#{duoRoundNumber}</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleRandomizeMissions}
                  className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Tirer 2 commandes différentes au sort"
                >
                  <Shuffle className="w-3.5 h-3.5 text-sky-400" />
                  <span>Aléatoire</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextDuo}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Préparer le passage au duo suivant"
                >
                  <span>⏩ Duo Suivant</span>
                </button>
              </div>
            </div>

            {/* Dual Team Grid with Central VS Medallion */}
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
              {/* Floating VS Emblem (Desktop Center) */}
              <div className="hidden md:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
                <div className="w-12 h-12 rounded-full bg-[#040914] border-2 border-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.6)] flex items-center justify-center">
                  <span className="font-display font-black text-sm italic bg-gradient-to-b from-white via-amber-300 to-red-500 bg-clip-text text-transparent">
                    VS
                  </span>
                </div>
              </div>

              {/* DUO 1 (BLEU CYAN) */}
              <div className="bg-gradient-to-b from-sky-950/50 to-slate-950/80 rounded-2xl p-4 sm:p-5 border border-sky-500/40 hover:border-sky-400/70 transition-colors shadow-lg relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent" />
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_10px_#38bdf8] animate-pulse" />
                    <span className="font-display text-sm sm:text-base font-black text-sky-300 uppercase tracking-wide">
                      Équipe 1 • Bleu
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {station1Live?.status === 'in_progress' && (
                      <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/40 font-bold">
                        EN COURSE • {station1Live.score} pts
                      </span>
                    )}
                    <span className="text-[10px] font-mono bg-sky-500/15 text-sky-300 px-2 py-0.5 rounded-md border border-sky-500/30 font-bold">
                      Poste 1 • Étagère 1
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono font-bold text-slate-400 uppercase mb-1">
                        Collaborateur GT
                      </label>
                      <input
                        type="text"
                        value={d1Cea}
                        onChange={(e) => setD1Cea(e.target.value)}
                        placeholder="Ex: Jeremy (GT)"
                        className="w-full bg-slate-950/90 border border-slate-700 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 rounded-xl px-3 py-2.5 text-sm text-white font-semibold focus:outline-none transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono font-bold text-sky-400 uppercase mb-1">
                        Invité
                      </label>
                      <input
                        type="text"
                        value={d1Client}
                        onChange={(e) => setD1Client(e.target.value)}
                        placeholder="Nom de l'invité"
                        className="w-full bg-slate-950/90 border border-slate-700 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 rounded-xl px-3 py-2.5 text-sm text-sky-200 font-bold focus:outline-none transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-800/80">
                    <label className="block text-[11px] font-mono font-bold text-sky-300 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-sky-400" />
                        MISSION POSTE 1 • ÉTAGÈRE A
                      </span>
                      <span className="text-[10px] font-mono text-sky-300 bg-sky-500/15 px-2 py-0.5 rounded border border-sky-500/30 font-bold">
                        {p1Missions[m1Index % Math.max(1, p1Missions.length)]?.steps?.length || 0} étapes
                      </span>
                    </label>
                    <select
                      value={m1Index % Math.max(1, p1Missions.length)}
                      onChange={(e) => setM1Index(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-sky-500/40 focus:border-sky-400 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none transition-colors cursor-pointer"
                    >
                      {p1Missions.map((m, idx) => (
                        <option key={m.id} value={idx} className="bg-slate-900 text-white">
                          #{idx + 1} • {m.title}
                        </option>
                      ))}
                    </select>
                    {p1Missions[m1Index % Math.max(1, p1Missions.length)]?.client && (
                      <p className="text-[11px] text-slate-400 mt-1.5 truncate font-mono">
                        Client : {p1Missions[m1Index % Math.max(1, p1Missions.length)]?.client}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* DUO 2 (ORANGE AMBRE) */}
              <div className="bg-gradient-to-b from-amber-950/40 to-slate-950/80 rounded-2xl p-4 sm:p-5 border border-amber-500/40 hover:border-amber-400/70 transition-colors shadow-lg relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_#fbbf24] animate-pulse" />
                    <span className="font-display text-sm sm:text-base font-black text-amber-300 uppercase tracking-wide">
                      Équipe 2 • Orange
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {station2Live?.status === 'in_progress' && (
                      <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/40 font-bold">
                        EN COURSE • {station2Live.score} pts
                      </span>
                    )}
                    <span className="text-[10px] font-mono bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/30 font-bold">
                      Poste 2 • Étagère 2
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono font-bold text-slate-400 uppercase mb-1">
                        Collaborateur GT
                      </label>
                      <input
                        type="text"
                        value={d2Cea}
                        onChange={(e) => setD2Cea(e.target.value)}
                        placeholder="Ex: Sarah (GT)"
                        className="w-full bg-slate-950/90 border border-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-3 py-2.5 text-sm text-white font-semibold focus:outline-none transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono font-bold text-amber-400 uppercase mb-1">
                        Invité
                      </label>
                      <input
                        type="text"
                        value={d2Client}
                        onChange={(e) => setD2Client(e.target.value)}
                        placeholder="Nom de l'invité"
                        className="w-full bg-slate-950/90 border border-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-3 py-2.5 text-sm text-amber-200 font-bold focus:outline-none transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-800/80">
                    <label className="block text-[11px] font-mono font-bold text-amber-300 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        MISSION POSTE 2 • ÉTAGÈRE B
                      </span>
                      <span className="text-[10px] font-mono text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30 font-bold">
                        {p2Missions[m2Index % Math.max(1, p2Missions.length)]?.steps?.length || 0} étapes
                      </span>
                    </label>
                    <select
                      value={m2Index % Math.max(1, p2Missions.length)}
                      onChange={(e) => setM2Index(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-amber-500/40 focus:border-amber-400 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none transition-colors cursor-pointer"
                    >
                      {p2Missions.map((m, idx) => (
                        <option key={m.id} value={idx} className="bg-slate-900 text-white">
                          #{idx + 1} • {m.title}
                        </option>
                      ))}
                    </select>
                    {p2Missions[m2Index % Math.max(1, p2Missions.length)]?.client && (
                      <p className="text-[11px] text-slate-400 mt-1.5 truncate font-mono">
                        Client : {p2Missions[m2Index % Math.max(1, p2Missions.length)]?.client}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Launch CTA Row */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <button
                type="submit"
                className="group relative overflow-hidden w-full sm:w-auto px-9 py-4 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 hover:from-red-500 hover:via-rose-400 hover:to-amber-400 text-white font-display font-black text-base sm:text-lg tracking-wide uppercase rounded-2xl shadow-[0_0_35px_rgba(239,68,68,0.45)] hover:shadow-[0_0_45px_rgba(245,158,11,0.55)] flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.99] cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer-sweep pointer-events-none" />
                <Zap className="w-5 h-5 text-amber-200 fill-amber-200" />
                <span>LANCER LE DUEL EN DIRECT</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => {
                  soundService.playScanBeep();
                  setShowQrModal(true);
                }}
                className="w-full sm:w-auto px-5 py-4 bg-slate-800/90 hover:bg-slate-700 text-slate-100 font-bold text-sm rounded-2xl border border-slate-600/80 hover:border-sky-400/60 flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg"
              >
                <QrCode className="w-4 h-4 text-sky-400" />
                <span>Flasher Scannettes Zebra</span>
              </button>
            </div>
          </form>
        )}

        {/* ============================================================
            SOLO / SINGLE STATION MODE (DÉFI CHRONO)
           ============================================================ */}
        {gameMode === 'solo' && (
          <form
            onSubmit={handleLaunchSolo}
            className="bg-slate-900/75 backdrop-blur-xl rounded-3xl p-5 sm:p-7 border border-emerald-500/30 shadow-[0_20px_70px_rgba(0,0,0,0.65)] relative overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500" />

            <div className="text-center mb-6">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                Challenge Logistique • 1 Duo Contre-la-Montre
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mt-2">
                Défi Chrono en Binôme
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto">
                1 Collaborateur GT + 1 Invité en tandem sur un poste dédié pour établir le meilleur score du shift !
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
              {/* DUO EN COURSE */}
              <div className="bg-gradient-to-b from-emerald-950/40 to-slate-950/80 rounded-2xl p-4 sm:p-5 border border-emerald-500/40 shadow-lg space-y-3.5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse" />
                    <span className="font-display text-sm sm:text-base font-black text-emerald-300 uppercase tracking-wide">
                      Binôme en Course
                    </span>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/30 font-bold">
                    Poste Unique
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-400 uppercase mb-1">
                    Collaborateur GT
                  </label>
                  <input
                    type="text"
                    value={d1Cea}
                    onChange={(e) => setD1Cea(e.target.value)}
                    placeholder="Ex: Jeremy (GT)"
                    className="w-full bg-slate-950/90 border border-slate-700 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold focus:outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-emerald-400 uppercase mb-1">
                    Invité
                  </label>
                  <input
                    type="text"
                    value={d1Client}
                    onChange={(e) => setD1Client(e.target.value)}
                    placeholder="Nom de l'invité"
                    className="w-full bg-slate-950/90 border border-slate-700 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-sm text-emerald-200 font-bold focus:outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {/* POSTE & DURÉE DU SHIFT */}
              <div className="bg-slate-950/80 rounded-2xl p-4 sm:p-5 border border-slate-800 flex flex-col justify-between space-y-4">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-400 uppercase mb-2">
                    Sélection du Poste de Scan
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSoloStation('poste-1')}
                      className={`p-3 rounded-xl border text-xs font-mono font-bold transition-all text-left cursor-pointer ${
                        soloStation === 'poste-1'
                          ? 'bg-sky-500/15 border-sky-400 text-sky-200 shadow-[0_0_20px_rgba(56,189,248,0.2)]'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="block font-black text-white text-sm mb-0.5">Poste 1 (A)</span>
                      <span className="text-[10px] text-sky-400 block font-bold">Allée B • Étagère 1</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSoloStation('poste-2')}
                      className={`p-3 rounded-xl border text-xs font-mono font-bold transition-all text-left cursor-pointer ${
                        soloStation === 'poste-2'
                          ? 'bg-amber-500/15 border-amber-400 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.2)]'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="block font-black text-white text-sm mb-0.5">Poste 2 (B)</span>
                      <span className="text-[10px] text-amber-400 block font-bold">Allée D • Étagère 2</span>
                    </button>
                  </div>

                  <div className="mt-3.5">
                    <label className="block text-[11px] font-mono font-bold text-emerald-300 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        COMMANDE / MISSION
                      </span>
                      <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                        {missionsPool[soloSavedIndex]?.steps?.length || 0} lignes
                      </span>
                    </label>
                    <select
                      value={soloSavedIndex}
                      onChange={(e) => setSoloSavedIndex(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-emerald-500/40 focus:border-emerald-400 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none transition-colors cursor-pointer"
                    >
                      {missionsPool.map((m, idx) => (
                        <option key={m.id} value={idx} className="bg-slate-900 text-white">
                          #{idx + 1} • {m.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold">Temps de Shift :</span>
                  </div>
                  <span className="font-bold text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    {shiftMinutes}:00 Standard
                  </span>
                </div>
              </div>
            </div>

            {/* Launch Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <button
                type="submit"
                className="group relative overflow-hidden w-full sm:w-auto px-9 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-slate-950 font-display font-black text-base sm:text-lg tracking-wide uppercase rounded-2xl shadow-[0_0_35px_rgba(16,185,129,0.4)] flex items-center justify-center gap-3 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent -translate-x-full animate-shimmer-sweep pointer-events-none" />
                <Sparkles className="w-5 h-5" />
                <span>DÉMARRER LE DÉFI CHRONO</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => {
                  handleLaunchSolo({ preventDefault: () => {} } as any);
                  setShowQrModal(true);
                }}
                className="w-full sm:w-auto px-5 py-4 bg-slate-800/90 hover:bg-slate-700 text-slate-100 font-bold text-sm rounded-2xl border border-slate-600/80 hover:border-emerald-400/60 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>Flasher Scannette Zebra</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ============================================================
          BOTTOM COMMAND DECK (4 HOLOGRAPHIC STAND PORTAL CARDS)
         ============================================================ */}
      <div className="max-w-5xl w-full mx-auto z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 pb-2">
        <button
          onClick={() => {
            soundService.playScanBeep();
            onOpenTv();
          }}
          className="relative overflow-hidden bg-slate-900/75 hover:bg-slate-800/90 backdrop-blur-md border border-slate-800 hover:border-rose-500/60 rounded-2xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5 group flex flex-col justify-between cursor-pointer shadow-lg"
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Tv className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
              DIRECT
            </span>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="font-display text-sm font-black text-white group-hover:text-rose-300 transition-colors uppercase">
                Arène TV 55&quot;
              </div>
              <p className="text-[11px] text-slate-400">Grand écran spectateurs</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
        </button>

        <button
          onClick={() => {
            soundService.playScanBeep();
            onOpenPodium();
          }}
          className="relative overflow-hidden bg-slate-900/75 hover:bg-slate-800/90 backdrop-blur-md border border-slate-800 hover:border-amber-500/60 rounded-2xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5 group flex flex-col justify-between cursor-pointer shadow-lg"
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-mono font-bold uppercase text-amber-400/80">
              TOP 5
            </span>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="font-display text-sm font-black text-white group-hover:text-amber-300 transition-colors uppercase">
                Podium & Records
              </div>
              <p className="text-[11px] text-slate-400">Classement & diplômes</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
        </button>

        <button
          onClick={() => {
            soundService.playScanBeep();
            onOpenPrint();
          }}
          className="relative overflow-hidden bg-slate-900/75 hover:bg-slate-800/90 backdrop-blur-md border border-slate-800 hover:border-sky-500/60 rounded-2xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5 group flex flex-col justify-between cursor-pointer shadow-lg"
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Printer className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-mono font-bold uppercase text-sky-400/80">
              A4 / ZEBRA
            </span>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="font-display text-sm font-black text-white group-hover:text-sky-300 transition-colors uppercase">
                Étiquettes Stand
              </div>
              <p className="text-[11px] text-slate-400">Planches codes-barres</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
        </button>

        <button
          onClick={() => {
            soundService.playScanBeep();
            onOpenAdmin();
          }}
          className="relative overflow-hidden bg-slate-900/75 hover:bg-slate-800/90 backdrop-blur-md border border-slate-800 hover:border-indigo-500/60 rounded-2xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5 group flex flex-col justify-between cursor-pointer shadow-lg"
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Settings className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-mono font-bold uppercase text-indigo-400/80">
              ADMIN
            </span>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="font-display text-sm font-black text-white group-hover:text-indigo-300 transition-colors uppercase">
                Régie & Réglages
              </div>
              <p className="text-[11px] text-slate-400">Stocks, missions, aléas</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
        </button>
      </div>

      {/* ============================================================
          QR CODES MODAL FOR HANDHELD ZEBRA LAUNCH
         ============================================================ */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn select-none">
          <div className="relative bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl text-slate-100">
            {/* Close Cross */}
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start space-x-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/10">
                <ScanBarcode className="w-6 h-6" />
              </div>
              <div className="pt-0.5">
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-sky-400 block mb-1">
                  APPAIRAGE TERMINAUX MOBILES SANS FIL
                </span>
                <h3 className="font-display text-xl font-black text-white tracking-tight uppercase">
                  Flasher les Scannettes Zebra
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 my-2 leading-relaxed">
              Scannez ces QR codes avec vos terminaux Zebra (navigateur Chrome ou appareil photo).
              Ils s&apos;ouvrent en <strong>mode joueur plein écran</strong> synchronisé en temps réel avec la régie et la TV !
            </p>

            {/* URL Selector for local network or cloud deploy */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 my-3 text-xs">
              <label className="block text-[11px] font-mono text-slate-400 mb-1 font-bold">
                Adresse du serveur Web pour les Zebra :
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customServerUrl}
                  onChange={(e) => setCustomServerUrl(e.target.value)}
                  placeholder="Ex: https://jeux-scan-25-ans-logistics.vercel.app ou http://192.168.1.50:5173"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={() => setCustomServerUrl('https://jeux-scan-25-ans-logistics.vercel.app')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 font-mono text-[11px] font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer"
                >
                  Vercel Prod
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 my-4">
              {/* QR Zebra 1 */}
              <div className="bg-slate-950/80 p-4 sm:p-5 rounded-2xl border-2 border-sky-500/50 text-center flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
                  <span className="text-xs font-black font-mono text-sky-400 uppercase">
                    Zebra 1 • Duo 1 (Bleu)
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-lg mb-2">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(zebra1Url)}`}
                    alt="QR Code Zebra 1"
                    className="w-32 h-32 sm:w-36 sm:h-36 object-contain"
                  />
                </div>
                <div className="text-[10px] text-slate-400 font-mono mb-2 truncate max-w-full">
                  Poste 1 : Étagère A
                </div>
                <a
                  href={zebra1Url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-sky-400 hover:underline flex items-center gap-1 font-mono font-bold"
                >
                  <span>Tester dans un onglet</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* QR Zebra 2 */}
              <div className="bg-slate-950/80 p-4 sm:p-5 rounded-2xl border-2 border-amber-500/50 text-center flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs font-black font-mono text-amber-400 uppercase">
                    Zebra 2 • Duo 2 (Orange)
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-lg mb-2">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(zebra2Url)}`}
                    alt="QR Code Zebra 2"
                    className="w-32 h-32 sm:w-36 sm:h-36 object-contain"
                  />
                </div>
                <div className="text-[10px] text-slate-400 font-mono mb-2 truncate max-w-full">
                  Poste 2 : Étagère B (Missions alternées)
                </div>
                <a
                  href={zebra2Url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-mono font-bold"
                >
                  <span>Tester dans un onglet</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Hint Zebra + Camera alternative */}
            <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-3 text-[11px] text-indigo-200 flex items-start gap-2.5 my-3">
              <span className="text-base shrink-0">💡</span>
              <div className="space-y-1">
                <div><strong>Scan Laser Zebra :</strong> Le terminal capture les codes automatiquement (champ récepteur invisible auto-focalisé).</div>
                <div><strong>Alternative Caméra :</strong> Un bouton <em>&quot;Scanner Caméra&quot;</em> permet aussi à tout smartphone ou Zebra d&apos;utiliser son appareil photo intégré pour lire les étiquettes !</div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
