import React, { useState } from 'react';
import { OperatorProfile } from '../types';
import { Trophy, Medal, Award, UserPlus, Star, Clock, CheckCircle } from 'lucide-react';

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

  // Mock initial scoreboard with realistic scores
  const [leaderboard, setLeaderboard] = useState([
    { name: 'Dr. Jean-Marc L.', company: 'CEA LETI Bât. 17', score: 3250, time: '01:42', medal: 'gold' },
    { name: 'Sophie V.', company: 'Minatec Silicium', score: 2900, time: '02:05', medal: 'silver' },
    { name: 'Marc B.', company: 'Edwards Cryogénie', score: 2650, time: '02:18', medal: 'bronze' },
    { name: 'Thomas R.', company: 'Fournisseur Inox', score: 2100, time: '02:40', medal: 'standard' }
  ]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onUpdateOperatorName(nameInput.trim(), companyInput.trim() || 'Invité 25 Ans');
    }
  };

  return (
    <div className="min-h-[calc(100vh-65px)] p-4 flex flex-col gap-4 max-w-5xl mx-auto w-full">
      {/* Top Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <h2 className="text-2xl font-black text-white">CLASSEMENT DES LOGISTICIENS D'HONNEUR</h2>
          </div>
          <p className="text-sm text-slate-300">
            Qui a réalisé le meilleur temps de préparation sans aucune erreur de scan ?
          </p>
        </div>

        {/* Change Operator Button */}
        <button
          onClick={onStartNewShift}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-2 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Faire Jouer un Nouvel Invité</span>
        </button>
      </div>

      {/* Operator Registration Card */}
      <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl">
        <h3 className="text-sm font-bold font-mono text-slate-300 uppercase mb-4 flex items-center space-x-2">
          <span>Identité de l'Opérateur en Cours :</span>
        </h3>

        <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
              Enregistrer l'Opérateur
            </button>
          </div>
        </form>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden flex-1">
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex justify-between items-center">
          <span className="font-mono text-xs font-bold text-slate-300 uppercase">Tableau d'Honneur 25 Ans</span>
          <span className="text-xs text-amber-400 font-mono font-bold">Score Actuel : {currentOperator.score} pts</span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {/* Current Operator Live Row */}
          <div className="p-4 bg-sky-950/30 border-l-4 border-sky-400 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-sky-500 text-slate-950 font-black flex items-center justify-center text-sm">
                ★
              </div>
              <div>
                <span className="font-bold text-white text-sm block">
                  {currentOperator.name} <span className="text-xs text-sky-400 font-normal">(En cours)</span>
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
          {leaderboard.map((row, idx) => (
            <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
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
                  <div className="flex items-center space-x-1 text-slate-400 text-xs font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{row.time}</span>
                  </div>
                  <span className="text-base font-black font-mono text-slate-200">
                    {row.score} pts
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
