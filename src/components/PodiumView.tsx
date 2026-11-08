import React, { useState, useEffect, useMemo } from 'react';
import { OperatorProfile } from '../types';
import { 
  Trophy, 
  Medal, 
  Award, 
  UserPlus, 
  Star, 
  Clock, 
  CheckCircle, 
  Cloud, 
  RefreshCw, 
  Send, 
  Trash2, 
  Target, 
  Users, 
  Zap, 
  Download,
  Flame,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  getRemoteLeaderboard, 
  submitScore, 
  deleteScoreById,
  resetAllScores,
  subscribeToScores, 
  RemoteScore, 
  isSupabaseConfigured 
} from '../services/supabaseClient';

interface PodiumViewProps {
  currentOperator: OperatorProfile;
  onUpdateOperatorName: (name: string, company: string) => void;
  onStartNewShift: () => void;
}

export const PodiumView: React.FC<PodiumViewProps> = ({
  currentOperator,
  onUpdateOperatorName,
  onStartNewShift
}) => {
  const [nameInput, setNameInput] = useState(currentOperator.name);
  const [companyInput, setCompanyInput] = useState(currentOperator.companyOrRole);
  const [leaderboard, setLeaderboard] = useState<RemoteScore[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hasSubmittedCurrent, setHasSubmittedCurrent] = useState<boolean>(false);
  const [stationName, setStationName] = useState<string>('Poste 1 (Douchette A)');
  const [isRegisterOpen, setIsRegisterOpen] = useState<boolean>(false);

  // Refresh leaderboard from Supabase
  const refreshScores = async () => {
    setIsLoading(true);
    const scores = await getRemoteLeaderboard();
    setLeaderboard(scores);
    setIsLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      const scores = await getRemoteLeaderboard();
      if (isMounted) {
        setLeaderboard(scores);
        setIsLoading(false);
      }
    }
    loadData();

    // Subscribe to live score sync
    const unsubscribe = subscribeToScores(() => {
      refreshScores();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Compute key stats for dashboard KPIs
  const stats = useMemo(() => {
    if (leaderboard.length === 0) {
      return {
        topScore: 0,
        topDuo: 'En attente...',
        bestTime: '--:--',
        avgAccuracy: 100,
        totalParticipants: 0
      };
    }
    const top = leaderboard[0];
    const totalAccuracy = leaderboard.reduce((acc, s) => acc + (s.accuracy || 100), 0);
    return {
      topScore: top.score,
      topDuo: top.name,
      bestTime: top.time_spent || '02:00',
      avgAccuracy: Math.round(totalAccuracy / leaderboard.length),
      totalParticipants: leaderboard.length
    };
  }, [leaderboard]);

  // Extract Top 3 for Olympic Podium
  const top1 = leaderboard[0] || null;
  const top2 = leaderboard[1] || null;
  const top3 = leaderboard[2] || null;
  const restLeaderboard = leaderboard.slice(3);

  const handleDeleteScore = async (id?: string, name?: string) => {
    if (!id) return;
    const displayName = name || 'ce score';
    if (window.confirm(`Supprimer définitivement le score de "${displayName}" du classement ?`)) {
      const ok = await deleteScoreById(id);
      if (ok) {
        setLeaderboard((prev) => prev.filter((s) => s.id !== id));
      } else {
        alert('Erreur lors de la suppression.');
      }
    }
  };

  const handleResetAll = async () => {
    if (
      window.confirm(
        '⚠️ ATTENTION : Voulez-vous vraiment EFFACER TOUS LES SCORES du classement ? Cette action est irréversible.'
      )
    ) {
      const ok = await resetAllScores();
      if (ok) {
        setLeaderboard([]);
      } else {
        alert('Erreur lors de la remise à zéro.');
      }
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onUpdateOperatorName(nameInput.trim(), companyInput.trim() || 'GT Logistics • 25 Ans');
      setIsRegisterOpen(false);
    }
  };

  const handlePublishScore = async () => {
    if (isSubmitting || hasSubmittedCurrent || currentOperator.score === 0) return;
    setIsSubmitting(true);
    const success = await submitScore({
      name: currentOperator.name || 'Invité 25 Ans',
      company: currentOperator.companyOrRole || 'GT Logistics',
      score: currentOperator.score,
      time_spent: '02:15',
      completed_missions: currentOperator.completedMissions || 1,
      accuracy: currentOperator.accuracy || 100
    });
    if (success) {
      setHasSubmittedCurrent(true);
      refreshScores();
    }
    setIsSubmitting(false);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (leaderboard.length === 0) return;
    const headers = ['Rang', 'Nom Participant / Duo', 'Organisme / Role', 'Score', 'Temps', 'Missions', 'Precision'];
    const rows = leaderboard.map((s, idx) => [
      idx + 1,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${(s.company || '').replace(/"/g, '""')}"`,
      s.score,
      s.time_spent || '02:00',
      s.completed_missions || 1,
      `${s.accuracy || 100}%`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `classement-25ans-gt-logistics-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Clean duo string for presentation
  const parseDuoNames = (fullName: string) => {
    const clean = fullName.replace(/\(Invité\)/gi, '').trim();
    if (clean.includes('(Duo avec')) {
      const parts = clean.split('(Duo avec');
      return {
        guest: parts[0].trim(),
        collab: parts[1].replace(')', '').trim()
      };
    }
    return { guest: clean, collab: 'GT Logistics' };
  };

  return (
    <div className="min-h-[calc(100vh-65px)] p-4 sm:p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* ========================================================
          1. HERO HEADER: TITLE, LIVE CLOUD STATUS & ACTIONS
          ======================================================== */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Trophy className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-amber-400">
                ÉDITION 25 ANS • CEA GRENOBLE
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                TABLEAU D'HONNEUR & PODIUM OFFICIEL
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Classement en direct des meilleurs binômes de l'événement. Épreuves de préparation, contrôle de code-barres au laser et respect de la cadence.
          </p>
        </div>

        {/* Action Controls */}
        <div className="relative z-10 flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {isSupabaseConfigured && (
            <span className="flex items-center space-x-1.5 text-xs font-mono px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Cloud Live Sync</span>
            </span>
          )}

          <button
            onClick={() => setIsRegisterOpen(!isRegisterOpen)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shadow-sm"
          >
            <UserPlus className="w-4 h-4 text-sky-400" />
            <span>Nouveau Joueur / Binôme</span>
            {isRegisterOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={refreshScores}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            title="Actualiser les scores"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================================
          2. KPI METRIC CARDS (Record, Chrono, Precision, Participants)
          ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Record du jour */}
        <div className="bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-800/90 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Top Record 25 Ans</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Star className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400 tracking-tight">
              +{stats.topScore.toLocaleString()} pts
            </div>
            <div className="text-xs text-slate-400 truncate mt-1 font-medium">
              👑 {stats.topDuo}
            </div>
          </div>
        </div>

        {/* Meilleur Chrono */}
        <div className="bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-800/90 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Chrono Éclair</span>
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-sky-400 tracking-tight">
              {stats.bestTime}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-medium">
              Vitesse de préparation
            </div>
          </div>
        </div>

        {/* Taux d'Excellence */}
        <div className="bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-800/90 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Précision Moyenne</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 tracking-tight">
              {stats.avgAccuracy}%
            </div>
            <div className="text-xs text-slate-400 mt-1 font-medium">
              Zéro erreur de picking
            </div>
          </div>
        </div>

        {/* Duos Enregistrés */}
        <div className="bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-800/90 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Duos en Compétition</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-indigo-300 tracking-tight">
              {stats.totalParticipants}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-medium">
              Participants enregistrés
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          OPTIONAL: ACCORDION REGISTRATION FORM (Clean & Non-intrusive)
          ======================================================== */}
      {isRegisterOpen && (
        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-700/80 shadow-2xl transition-all animate-fadeIn">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <UserPlus className="w-4 h-4 text-sky-400" />
              <span>Configurer un Nouveau Binôme pour la Session :</span>
            </h3>
            <button
              onClick={() => setIsRegisterOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Fermer
            </button>
          </div>

          <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Prénom / Nom de l'Invité :</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Ex: Thomas"
                className="w-full bg-slate-950 border border-slate-700 px-3.5 py-2 rounded-xl text-sm text-amber-300 focus:outline-none focus:border-amber-400 font-semibold"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Collaborateur GT (Copilote) :</label>
              <input
                type="text"
                value={companyInput}
                onChange={(e) => setCompanyInput(e.target.value)}
                placeholder="Ex: Jeremy (GT)"
                className="w-full bg-slate-950 border border-slate-700 px-3.5 py-2 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500 font-semibold"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-sm shadow-md shadow-sky-600/30 transition-all cursor-pointer"
              >
                Activer ce Binôme
              </button>
            </div>
          </form>

          {/* Quick Publish Current Live Score */}
          {currentOperator.score > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl">
              <div className="text-xs text-slate-300">
                Score actuel du poste : <strong className="text-emerald-400 font-mono">+{currentOperator.score} pts</strong>
              </div>
              <button
                onClick={handlePublishScore}
                disabled={isSubmitting || hasSubmittedCurrent}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
                  hasSubmittedCurrent
                    ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/30 cursor-default'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                }`}
              >
                {hasSubmittedCurrent ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Score Déjà Publié au Classement !</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Publier ce Score (+{currentOperator.score} pts)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          3. THE 3D OLYMPIC PODIUM (Top 1 Gold, Top 2 Silver, Top 3 Bronze)
          ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4">
        {/* 🥈 RANG 2 : ARGENT (Gauche) */}
        <div className="order-2 md:order-1 bg-gradient-to-b from-slate-800/90 via-slate-900 to-slate-950 rounded-3xl p-5 border-2 border-slate-600/60 shadow-xl flex flex-col justify-between text-center relative overflow-hidden h-72">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-400 to-slate-200 text-slate-950 flex items-center justify-center font-black text-xl shadow-md mb-2">
              🥈 2
            </div>
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-slate-300">
              MÉDAILLE D'ARGENT
            </span>

            {top2 ? (
              <>
                <h3 className="text-lg font-black text-white mt-2 truncate w-full px-2">
                  {parseDuoNames(top2.name).guest}
                </h3>
                <span className="text-xs text-slate-400 font-medium truncate w-full">
                  avec {parseDuoNames(top2.name).collab}
                </span>

                <div className="text-2xl font-black font-mono text-slate-200 mt-3">
                  +{top2.score.toLocaleString()} pts
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-1">
                  ⏱️ {top2.time_spent || '02:00'} • {top2.accuracy || 100}% précision
                </div>
              </>
            ) : (
              <div className="text-slate-500 text-xs italic mt-8">
                Place vacante... Prêt pour le prochain binôme !
              </div>
            )}
          </div>

          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 border-t border-slate-800 pt-2">
            Vice-Champion Logistique
          </div>
        </div>

        {/* 🥇 RANG 1 : OR (Centre, Surélevé et Majestueux) */}
        <div className="order-1 md:order-2 bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-950 rounded-3xl p-6 border-2 border-amber-500 shadow-2xl shadow-amber-500/10 flex flex-col justify-between text-center relative overflow-hidden h-84 scale-105 z-10">
          {/* Golden glow */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col items-center relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center font-black text-2xl shadow-xl shadow-amber-500/30 border-2 border-amber-300 mb-2">
              👑 1
            </div>
            <span className="text-xs font-mono font-black tracking-widest uppercase text-amber-400">
              ★ GRAND CHAMPION 25 ANS ★
            </span>

            {top1 ? (
              <>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-2 truncate w-full px-2 font-serif">
                  {parseDuoNames(top1.name).guest}
                </h2>
                <div className="inline-block bg-amber-500/10 border border-amber-500/30 px-3 py-0.5 rounded-full text-xs text-amber-300 font-semibold mt-1 truncate max-w-full">
                  Copilote GT : {parseDuoNames(top1.name).collab}
                </div>

                <div className="text-3xl sm:text-4xl font-black font-mono text-amber-400 mt-4 tracking-tight drop-shadow-md">
                  +{top1.score.toLocaleString()} pts
                </div>
                <div className="text-xs font-mono text-slate-300 mt-1 flex items-center justify-center space-x-2">
                  <span>⏱️ {top1.time_spent || '02:00'}</span>
                  <span>•</span>
                  <span>🎯 {top1.accuracy || 100}% sans faute</span>
                </div>
              </>
            ) : (
              <div className="text-slate-500 text-xs italic mt-12">
                Aucun score enregistré. Soyez le premier sur la plus haute marche !
              </div>
            )}
          </div>

          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 border-t border-amber-500/30 pt-2">
            Record Officiel du Stand
          </div>
        </div>

        {/* 🥉 RANG 3 : BRONZE (Droite) */}
        <div className="order-3 bg-gradient-to-b from-amber-950/20 via-slate-900 to-slate-950 rounded-3xl p-5 border-2 border-amber-700/60 shadow-xl flex flex-col justify-between text-center relative overflow-hidden h-68">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-700 to-amber-600 text-white flex items-center justify-center font-black text-xl shadow-md mb-2">
              🥉 3
            </div>
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-amber-600">
              MÉDAILLE DE BRONZE
            </span>

            {top3 ? (
              <>
                <h3 className="text-lg font-black text-white mt-2 truncate w-full px-2">
                  {parseDuoNames(top3.name).guest}
                </h3>
                <span className="text-xs text-slate-400 font-medium truncate w-full">
                  avec {parseDuoNames(top3.name).collab}
                </span>

                <div className="text-2xl font-black font-mono text-amber-500 mt-3">
                  +{top3.score.toLocaleString()} pts
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-1">
                  ⏱️ {top3.time_spent || '02:00'} • {top3.accuracy || 100}% précision
                </div>
              </>
            ) : (
              <div className="text-slate-500 text-xs italic mt-8">
                Place vacante... Prêt pour le prochain binôme !
              </div>
            )}
          </div>

          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-600 border-t border-slate-800 pt-2">
            Troisième Marche du Podium
          </div>
        </div>
      </div>

      {/* ========================================================
          4. DETAILED LEADERBOARD TABLE (Ranks 4+)
          ======================================================== */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Table Header Controls */}
        <div className="p-4 sm:p-5 bg-slate-950/80 border-b border-slate-800 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
              Suite du Classement (Rangs 4 et suivants)
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 font-mono font-bold">
              {leaderboard.length} Binômes au Total
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Exporter tout le tableau en fichier CSV / Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter CSV</span>
            </button>

            {leaderboard.length > 0 && (
              <button
                onClick={handleResetAll}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Effacer tous les scores pour réinitialiser le jeu"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Purger les scores</span>
              </button>
            )}
          </div>
        </div>

        {/* Table Rows */}
        <div className="overflow-x-auto">
          {leaderboard.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
              <Trophy className="w-12 h-12 text-slate-700 mb-3" />
              <p className="text-sm font-semibold text-slate-400">Aucun score enregistré pour l'instant.</p>
              <p className="text-xs text-slate-500 mt-1">
                Lancez une première manche au pistolet laser pour inscrire le premier binôme au tableau d'honneur !
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/40 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-16 text-center">Rang</th>
                  <th className="py-3 px-4">Invité d'Honneur (Bénéficiaire)</th>
                  <th className="py-3 px-4">Copilote GT</th>
                  <th className="py-3 px-4 text-center">Missions</th>
                  <th className="py-3 px-4 text-center">Précision</th>
                  <th className="py-3 px-4 text-center">Temps</th>
                  <th className="py-3 px-4 text-right">Score Final</th>
                  <th className="py-3 px-4 w-12 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {leaderboard.map((item, index) => {
                  const rank = index + 1;
                  const parsed = parseDuoNames(item.name);
                  const isTop3 = rank <= 3;
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isTop3 ? 'bg-amber-500/[0.03]' : ''
                      }`}
                    >
                      {/* Rank badge */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-xl font-mono font-black text-xs ${
                            rank === 1
                              ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30'
                              : rank === 2
                              ? 'bg-slate-300 text-slate-950'
                              : rank === 3
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {rank}
                        </span>
                      </td>

                      {/* Guest Name */}
                      <td className="py-3 px-4 font-bold text-white">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-slate-100">{parsed.guest}</span>
                          {rank === 1 && <span className="text-amber-400">👑</span>}
                        </div>
                      </td>

                      {/* GT Copilot */}
                      <td className="py-3 px-4 text-slate-400 font-medium">
                        <span className="px-2 py-0.5 rounded-lg bg-sky-950/60 text-sky-300 border border-sky-800/40 text-[11px] font-mono">
                          {parsed.collab}
                        </span>
                      </td>

                      {/* Missions */}
                      <td className="py-3 px-4 text-center font-mono text-slate-300">
                        {item.completed_missions || 1}
                      </td>

                      {/* Accuracy */}
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold">
                          {item.accuracy || 100}%
                        </span>
                      </td>

                      {/* Time spent */}
                      <td className="py-3 px-4 text-center font-mono text-slate-400">
                        {item.time_spent || '02:00'}
                      </td>

                      {/* Score */}
                      <td className="py-3 px-4 text-right font-mono font-black text-sm text-amber-400">
                        +{item.score.toLocaleString()} pts
                      </td>

                      {/* Delete action */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDeleteScore(item.id, item.name)}
                          className="p-1 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Supprimer cette ligne"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
