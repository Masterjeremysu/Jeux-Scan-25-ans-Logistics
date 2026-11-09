import React, { useState } from 'react';
import { 
  Swords, 
  Play, 
  Tv, 
  Trophy, 
  QrCode, 
  Printer, 
  Settings, 
  Sparkles, 
  Users, 
  Zap, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  X,
  Clock
} from 'lucide-react';
import { AppConfig, DuoStation } from '../types';
import { GameLogo } from './GameLogo';
import { soundService } from '../services/soundService';

interface HomeLauncherViewProps {
  appConfig: AppConfig;
  liveStations: DuoStation[];
  onStartDuel: (duo1: { cea: string; client: string }, duo2: { cea: string; client: string }) => void;
  onStartSolo: (stationId: string, stationName: string, duo: { cea: string; client: string }) => void;
  onOpenTv: () => void;
  onOpenPodium: () => void;
  onOpenAdmin: () => void;
  onOpenPrint: () => void;
  onUpdateLogo?: (url: string) => void;
}

export const HomeLauncherView: React.FC<HomeLauncherViewProps> = ({
  appConfig,
  liveStations,
  onStartDuel,
  onStartSolo,
  onOpenTv,
  onOpenPodium,
  onOpenAdmin,
  onOpenPrint,
  onUpdateLogo
}) => {
  const [gameMode, setGameMode] = useState<'duel' | 'solo'>('duel');
  
  // Duo 1 state
  const [d1Cea, setD1Cea] = useState(() => localStorage.getItem('gt_d1_collab') || 'Jeremy (GT)');
  const [d1Client, setD1Client] = useState(() => localStorage.getItem('gt_d1_guest') || 'Thomas (Invité)');

  // Duo 2 state
  const [d2Cea, setD2Cea] = useState(() => localStorage.getItem('gt_d2_collab') || 'Sarah (GT)');
  const [d2Client, setD2Client] = useState(() => localStorage.getItem('gt_d2_guest') || 'Alexandre (Invité)');

  // Solo station selection
  const [soloStation, setSoloStation] = useState('poste-1');
  const [showQrModal, setShowQrModal] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState(() => appConfig.publicUrl || (typeof window !== 'undefined' ? window.location.origin : ''));

  const activeBaseUrl = customServerUrl.trim() || appConfig.publicUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const zebra1Url = `${activeBaseUrl}/#play?station=poste-1`;
  const zebra2Url = `${activeBaseUrl}/#play?station=poste-2`;

  const handleLaunchDuel = (e: React.FormEvent) => {
    e.preventDefault();
    soundService.playSuccessJingle();
    localStorage.setItem('gt_d1_collab', d1Cea);
    localStorage.setItem('gt_d1_guest', d1Client);
    localStorage.setItem('gt_d2_collab', d2Cea);
    localStorage.setItem('gt_d2_guest', d2Client);

    onStartDuel(
      { cea: d1Cea.trim() || 'Collaborateur GT 1', client: d1Client.trim() || 'Invité 1' },
      { cea: d2Cea.trim() || 'Collaborateur GT 2', client: d2Client.trim() || 'Invité 2' }
    );
  };

  const handleLaunchSolo = (e: React.FormEvent) => {
    e.preventDefault();
    soundService.playSuccessJingle();
    const stName = soloStation === 'poste-2' ? 'Poste 2 (Scannette B)' : 'Poste 1 (Scannette A)';
    onStartSolo(
      soloStation,
      stName,
      { cea: d1Cea.trim() || 'Collaborateur GT', client: d1Client.trim() || 'Invité' }
    );
  };

  return (
    <div className="min-h-[calc(100vh-65px)] bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background ambient neon glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Hero Brand Section */}
      <div className="flex flex-col items-center text-center my-2 sm:my-4 z-10">
        <GameLogo 
          customLogoUrl={appConfig.customLogoUrl} 
          size="hero" 
          allowUpload={true}
          onUpdateLogo={onUpdateLogo}
          className="mb-2"
        />
        <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto font-sans mt-2">
          Le grand jeu de rapidité et traçabilité logistique en immersion physique.
          <br className="hidden sm:inline" />
          <strong className="text-sky-300"> 3 minutes</strong> pour préparer les commandes, flasher les bons emplacements et remporter le podium !
        </p>
      </div>

      {/* Main Mode Selection & Match Launcher */}
      <div className="max-w-4xl w-full mx-auto z-10 my-4">
        {/* Mode Switch Tabs */}
        <div className="flex items-center justify-center p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl max-w-md mx-auto mb-6">
          <button
            type="button"
            onClick={() => setGameMode('duel')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all ${
              gameMode === 'duel'
                ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Swords className="w-4 h-4 text-amber-400" />
            <span>⚔️ DUEL 2 DUOS</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-bold hidden sm:inline">
              Face-à-Face
            </span>
          </button>

          <button
            type="button"
            onClick={() => setGameMode('solo')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all ${
              gameMode === 'solo'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-4 h-4 text-emerald-300" />
            <span>⏱️ DÉFI CHRONO (1 DUO)</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-bold hidden sm:inline">
              Contre-la-Montre
            </span>
          </button>
        </div>

        {/* DUEL MODE LAUNCHER CARD */}
        {gameMode === 'duel' && (
          <form onSubmit={handleLaunchDuel} className="bg-slate-900/90 rounded-3xl p-5 sm:p-7 border border-slate-800 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="text-center mb-6">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                Face-à-Face en Direct • 2 Scannettes Simultanées
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
                Configurez les 2 Équipes
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Chaque duo a ses propres rayons et son quai dédié pour éviter toute collision !
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
              {/* DUO 1 (BLEU) */}
              <div className="bg-slate-950/80 rounded-2xl p-4 sm:p-5 border-2 border-sky-500/40 shadow-lg relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-sky-400 animate-ping"></span>
                    <span className="text-sm font-black font-mono text-sky-400 uppercase tracking-wide">
                      Équipe 1 • Bleu
                    </span>
                  </div>
                  <span className="text-[10px] font-mono bg-sky-950 text-sky-300 px-2 py-0.5 rounded border border-sky-800">
                    Poste 1 • Étagère 1
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Collaborateur GT
                    </label>
                    <input
                      type="text"
                      value={d1Cea}
                      onChange={(e) => setD1Cea(e.target.value)}
                      placeholder="Ex: Jeremy (GT)"
                      className="w-full bg-slate-900 border border-slate-700 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Invité
                    </label>
                    <input
                      type="text"
                      value={d1Client}
                      onChange={(e) => setD1Client(e.target.value)}
                      placeholder="Nom de l'invité"
                      className="w-full bg-slate-900 border border-slate-700 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-sm text-amber-300 font-semibold focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* DUO 2 (ORANGE) */}
              <div className="bg-slate-950/80 rounded-2xl p-4 sm:p-5 border-2 border-amber-500/40 shadow-lg relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping"></span>
                    <span className="text-sm font-black font-mono text-amber-400 uppercase tracking-wide">
                      Équipe 2 • Orange
                    </span>
                  </div>
                  <span className="text-[10px] font-mono bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-800">
                    Poste 2 • Étagère 2
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Collaborateur GT
                    </label>
                    <input
                      type="text"
                      value={d2Cea}
                      onChange={(e) => setD2Cea(e.target.value)}
                      placeholder="Ex: Sarah (GT)"
                      className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Invité
                    </label>
                    <input
                      type="text"
                      value={d2Client}
                      onChange={(e) => setD2Client(e.target.value)}
                      placeholder="Nom de l'invité"
                      className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-amber-300 font-semibold focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Launch Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-slate-950 font-black text-base sm:text-lg rounded-2xl shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Sparkles className="w-5 h-5 text-slate-950" />
                <span>🚀 LANCER LE DUEL EN DIRECT</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="w-full sm:w-auto px-5 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm rounded-2xl border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-sky-400" />
                <span>Flasher Scannettes Zebra</span>
              </button>
            </div>
          </form>
        )}

        {/* SOLO / SINGLE STATION MODE */}
        {gameMode === 'solo' && (
          <form onSubmit={handleLaunchSolo} className="bg-slate-900/90 rounded-3xl p-5 sm:p-7 border border-slate-800 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="text-center mb-6">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Challenge Logistique • 1 Duo Contre-la-Montre
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
                Défi Chrono en Binôme
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto">
                1 Collaborateur GT + 1 Invité en tandem sur un poste dédié pour établir le meilleur score du shift !
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
              {/* DUO EN COURSE */}
              <div className="bg-slate-950/80 rounded-2xl p-4 sm:p-5 border-2 border-emerald-500/40 shadow-lg space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-sm font-black font-mono text-emerald-400 uppercase tracking-wide">
                      Binôme en Course
                    </span>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                    Poste Unique
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Collaborateur GT
                  </label>
                  <input
                    type="text"
                    value={d1Cea}
                    onChange={(e) => setD1Cea(e.target.value)}
                    placeholder="Ex: Jeremy (GT)"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold focus:outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Invité
                  </label>
                  <input
                    type="text"
                    value={d1Client}
                    onChange={(e) => setD1Client(e.target.value)}
                    placeholder="Nom de l'invité"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-sm text-amber-300 font-semibold focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              {/* POSTE & DURÉE DU SHIFT */}
              <div className="bg-slate-950/80 rounded-2xl p-4 sm:p-5 border border-slate-800 flex flex-col justify-between space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">
                    Sélection du Poste de Scan
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSoloStation('poste-1')}
                      className={`p-3 rounded-xl border text-xs font-mono font-bold transition-all text-left cursor-pointer ${
                        soloStation === 'poste-1'
                          ? 'bg-sky-950/80 border-sky-400 text-sky-200 shadow-lg shadow-sky-500/20'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="block font-black text-white text-sm mb-0.5">Poste 1 (Scannette A)</span>
                      <span className="text-[10px] text-sky-300 block">Allée B • Étagère 1</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSoloStation('poste-2')}
                      className={`p-3 rounded-xl border text-xs font-mono font-bold transition-all text-left cursor-pointer ${
                        soloStation === 'poste-2'
                          ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-lg shadow-amber-500/20'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="block font-black text-white text-sm mb-0.5">Poste 2 (Scannette B)</span>
                      <span className="text-[10px] text-amber-300 block">Allée D • Étagère 2</span>
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 text-xs font-mono text-slate-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>Temps de Shift :</span>
                  </div>
                  <span className="font-bold text-amber-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                    {Math.floor((appConfig.shiftDurationSeconds || 180) / 60)}:00 Standard
                  </span>
                </div>
              </div>
            </div>

            {/* Launch Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-base sm:text-lg rounded-2xl shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Sparkles className="w-5 h-5 text-slate-950" />
                <span>🚀 DÉMARRER LE DÉFI CHRONO</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  handleLaunchSolo({ preventDefault: () => {} } as any);
                  setShowQrModal(true);
                }}
                className="w-full sm:w-auto px-5 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm rounded-2xl border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>Flasher Scannette Zebra</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Stand Quick Navigation Cards */}
      <div className="max-w-4xl w-full mx-auto z-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={onOpenTv}
          className="bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-rose-500/50 rounded-2xl p-3.5 text-left transition-all group flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white group-hover:text-rose-400 transition-colors">
              📺 Arène TV 55"
            </div>
            <p className="text-[10px] text-slate-400">Pour le grand écran public</p>
          </div>
        </button>

        <button
          onClick={onOpenPodium}
          className="bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-3.5 text-left transition-all group flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
              🏆 Podium & Records
            </div>
            <p className="text-[10px] text-slate-400">Top 5 du jour & diplômes</p>
          </div>
        </button>

        <button
          onClick={onOpenPrint}
          className="bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-3.5 text-left transition-all group flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors">
              🖨️ Étiquettes Stand
            </div>
            <p className="text-[10px] text-slate-400">Planches prêtes à imprimer</p>
          </div>
        </button>

        <button
          onClick={onOpenAdmin}
          className="bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-3.5 text-left transition-all group flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">
              ⚙️ Régie & Réglages
            </div>
            <p className="text-[10px] text-slate-400">Stocks, missions, aléas</p>
          </div>
        </button>
      </div>

      {/* QR Codes Modal for Handheld Zebra Launch */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn select-none">
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
                <QrCode className="w-6 h-6" />
              </div>
              <div className="pt-0.5">
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-sky-400 block mb-1">
                  APPAIRAGE TERMINAUX MOBILES SANS FIL
                </span>
                <h3 className="text-xl font-black text-white tracking-tight">
                  Flasher les Scannettes Zebra
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 my-2 leading-relaxed">
              Scannez ces QR codes avec vos terminaux Zebra (navigateur Chrome ou appareil photo).
              Ils s'ouvrent en <strong>mode joueur plein écran</strong> synchronisé en temps réel avec la régie et la TV !
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
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 font-mono text-[11px] font-bold rounded-xl border border-slate-700 transition-colors"
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
                <div><strong>Alternative Caméra :</strong> Un bouton <em>"Scanner Caméra"</em> permet aussi à tout smartphone ou Zebra d'utiliser son appareil photo intégré pour lire les étiquettes !</div>
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
