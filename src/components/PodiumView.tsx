import React, { useState, useEffect } from 'react';
import { OperatorProfile } from '../types';
import { Trophy, Medal, Award, UserPlus, Star, Clock, CheckCircle, Wifi, Cloud, Radio, RefreshCw, Send } from 'lucide-react';
import { 
  getRemoteLeaderboard, 
  submitScore, 
  subscribeToScores, 
  subscribeToLiveActivity,
  RemoteScore, 
  LiveActivityEvent,
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
  const [liveActivities, setLiveActivities] = useState<LiveActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hasSubmittedCurrent, setHasSubmittedCurrent] = useState<boolean>(false);
  const [stationName, setStationName] = useState<string>('Poste 1');

  // Load scores on mount and subscribe to realtime
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

    // Subscribe to real-time score additions
    const unsubscribeScores = subscribeToScores((newScore) => {
      setLeaderboard((prev) => {
        const updated = [newScore, ...prev.filter((s) => s.id !== newScore.id)];
        return updated.sort((a, b) => b.score - a.score);
      });
    });

    // Subscribe to live scan activity across stations
    const unsubscribeActivity = subscribeToLiveActivity((activity) => {
      setLiveActivities((prev) => [activity, ...prev].slice(0, 10));
    });

    return () => {
      isMounted = false;
      unsubscribeScores();
      unsubscribeActivity();
    };
  }, []);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onUpdateOperatorName(nameInput.trim(), companyInput.trim() || 'Invité 25 Ans');
    }
  };

  const handlePublishScore = async () => {
    if (isSubmitting || hasSubmittedCurrent || currentOperator.score === 0) return;
    setIsSubmitting(true);
    const success = await submitScore({
      name: currentOperator.name || 'Invité 25 Ans',
      company: currentOperator.companyOrRole || 'CEA Grenoble',
      score: currentOperator.score,
      time_spent: '02:15',
      completed_missions: currentOperator.completedMissions || 1,
      accuracy: currentOperator.accuracy || 100
    });
    if (success) {
      setHasSubmittedCurrent(true);
      const freshScores = await getRemoteLeaderboard();
      if (freshScores.length > 0) setLeaderboard(freshScores);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-[calc(100vh-65px)] p-4 flex flex-col gap-4 max-w-5xl mx-auto w-full">
      {/* Top Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <h2 className="text-2xl font-black text-white">CLASSEMENT DES LOGISTICIENS D'HONNEUR</h2>
            {isSupabaseConfigured ? (
              <span className="flex items-center space-x-1.5 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <Cloud className="w-3.5 h-3.5 animate-pulse" />
                <span>Supabase Live</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <span>Mode Local</span>
              </span>
            )}
          </div>
          <p className="text-sm text-slate-300">
            Qui a réalisé le meilleur temps de préparation sans aucune erreur de scan ? Synchronisé en temps réel sur tous les postes de l'événement.
          </p>
        </div>

        {/* Change Operator Button */}
        <button
          onClick={() => {
            setHasSubmittedCurrent(false);
            onStartNewShift();
          }}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-2 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Faire Jouer un Nouvel Invité</span>
        </button>
      </div>

      {/* Operator Registration & Score Publish Card */}
      <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold font-mono text-slate-300 uppercase flex items-center space-x-2">
            <span>Identité de l'Opérateur en Cours :</span>
          </h3>
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <span>Station :</span>
            <select
              value={stationName}
              onChange={(e) => setStationName(e.target.value)}
              className="bg-slate-950 border border-slate-700 px-2.5 py-1 rounded-lg text-sky-400 font-bold focus:outline-none"
            >
              <option value="Poste 1">Poste 1 (Douchette A)</option>
              <option value="Poste 2">Poste 2 (Douchette B)</option>
              <option value="Poste 3">Poste 3 (Zebra Scan)</option>
            </select>
          </div>
        </div>

        <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Nom / Prénom du client :</label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Ex: Jean Dupont"
              className="w-full bg-slate-950 border border-slate-700 px-3.5 py-2 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500 font-semibold"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Entreprise / Organisme / Labo :</label>
            <input
              type="text"
              value={companyInput}
              onChange={(e) => setCompanyInput(e.target.value)}
              placeholder="Ex: CEA LETI, Partenaire..."
              className="w-full bg-slate-950 border border-slate-700 px-3.5 py-2 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500 font-semibold"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-md shadow-sky-600/30 transition-all"
            >
              Mettre à jour l'Opérateur
            </button>
          </div>
        </form>

        {/* Live Score Submit Box */}
        {currentOperator.score > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-2xl">
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-semibold text-slate-200">
                Score du shift actuel : <strong className="text-emerald-400 font-mono">{currentOperator.score} pts</strong> ({currentOperator.completedMissions} missions)
              </span>
            </div>
            <button
              onClick={handlePublishScore}
              disabled={isSubmitting || hasSubmittedCurrent}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-md ${
                hasSubmittedCurrent
                  ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/30 cursor-default'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
              }`}
            >
              {hasSubmittedCurrent ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Score Enregistré sur le Podium Cloud !</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Publication en cours...' : 'Publier mon Score au Classement Général'}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Leaderboard Table */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden flex-1">
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs font-bold text-slate-300 uppercase">Tableau d'Honneur Cloud 25 Ans</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 font-mono">
              {leaderboard.length} participants
            </span>
          </div>
          <span className="text-xs text-amber-400 font-mono font-bold">Session en cours : {currentOperator.score} pts</span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {/* Current Operator Live Row */}
          <div className="p-4 bg-sky-950/30 border-l-4 border-sky-400 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-sky-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-md shadow-sky-500/20">
                ★
              </div>
              <div>
                <span className="font-bold text-white text-sm block">
                  {currentOperator.name} <span className="text-xs text-sky-400 font-normal">({stationName} • En cours)</span>
                </span>
                <span className="text-xs text-slate-400 font-mono">{currentOperator.companyOrRole}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-lg font-black font-mono text-emerald-400">
                {currentOperator.score} pts
              </span>
              <span className="text-xs text-slate-400 block font-mono">
                {currentOperator.completedMissions} mission(s) finie(s)
              </span>
            </div>
          </div>

          {/* Historical Rows */}
          {leaderboard.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-bold text-slate-300">Aucun score enregistré pour l'instant</p>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                Le tableau d'honneur est vierge et prêt pour l'événement. Réalisez votre première mission pour prendre la tête !
              </p>
            </div>
          ) : (
            leaderboard.map((row, idx) => (
            <div key={row.id || idx} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full font-black flex items-center justify-center text-sm ${
                  idx === 0 
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20' 
                    : idx === 1 
                    ? 'bg-slate-300 text-slate-950' 
                    : idx === 2 
                    ? 'bg-amber-700 text-white' 
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {idx + 1}
                </div>
                <div>
                  <span className="font-bold text-slate-100 text-sm block">{row.name}</span>
                  <span className="text-xs text-slate-400 font-mono">{row.company}</span>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <div className="flex items-center space-x-1 text-slate-400 text-xs font-mono justify-end">
                    <Clock className="w-3 h-3" />
                    <span>{row.time_spent || '02:00'}</span>
                  </div>
                  <span className="text-base font-black font-mono text-slate-200">
                    {row.score} pts
                  </span>
                </div>
              </div>
            </div>
          )))}
        </div>
      </div>

      {/* Live Activity Ticker (Spectator / Grand Écran Mode) */}
      {liveActivities.length > 0 && (
        <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800/80">
          <div className="flex items-center space-x-2 mb-2 text-xs font-mono text-slate-400">
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-ping" />
            <span className="font-bold uppercase text-slate-300">Activité Scanner Réseau en Direct :</span>
          </div>
          <div className="space-y-1.5 font-mono text-xs">
            {liveActivities.slice(0, 3).map((act, i) => (
              <div key={act.id || i} className="flex items-center justify-between text-slate-400 bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-800/50">
                <span className="text-sky-400 font-bold">{act.station_name} ({act.operator_name})</span>
                <span className="text-slate-200">{act.message}</span>
                <span className="text-[10px] text-slate-500">{act.created_at ? new Date(act.created_at).toLocaleTimeString('fr-FR') : 'à l\'instant'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
