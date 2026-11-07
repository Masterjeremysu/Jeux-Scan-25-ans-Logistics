import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { OperatorProfile } from '../types';
import { Award, ShieldCheck, Printer, X, Sparkles, Star } from 'lucide-react';

interface DiplomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  operator: OperatorProfile;
}

export const DiplomeModal: React.FC<DiplomeModalProps> = ({ isOpen, onClose, operator }) => {
  useEffect(() => {
    if (isOpen) {
      // Fire confetti burst
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch {
        // Fallback
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      {/* Modal Container */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-8 shadow-2xl overflow-hidden print:p-0 print:border-none print:shadow-none print:max-w-none">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="no-print absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* The Printable Certificate */}
        <div className="bg-gradient-to-b from-amber-50 to-orange-50 text-slate-950 p-8 rounded-2xl border-4 border-double border-amber-600/40 text-center relative shadow-inner">
          {/* Decorative Corner Ornaments */}
          <div className="absolute top-2 left-2 text-amber-600 text-lg select-none">❖</div>
          <div className="absolute top-2 right-2 text-amber-600 text-lg select-none">❖</div>
          <div className="absolute bottom-2 left-2 text-amber-600 text-lg select-none">❖</div>
          <div className="absolute bottom-2 right-2 text-amber-600 text-lg select-none">❖</div>

          {/* Badge CEA */}
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-sky-600/30">
            <Award className="w-10 h-10 text-amber-300" />
          </div>

          <span className="text-[11px] font-black uppercase font-mono tracking-widest text-amber-700 block mb-1">
            Événement Officiel • Anniversaire des 25 Ans
          </span>

          <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase mb-2 font-serif">
            DIPLÔME D'HONNEUR
          </h2>

          <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-6">
            Brevet de Logisticien d'Élite du CEA Grenoble
          </p>

          <p className="text-sm text-slate-700 italic mb-2">
            Le présent certificat atteste avec distinction que :
          </p>

          <div className="text-2xl font-black text-slate-900 underline decoration-amber-500 decoration-2 underline-offset-8 mb-2">
            {operator.name}
          </div>

          <div className="text-sm font-bold text-slate-600 font-mono mb-6">
            {operator.companyOrRole}
          </div>

          <p className="text-xs text-slate-700 max-w-md mx-auto leading-relaxed mb-6">
            A accompli avec succès les opérations de préparation, contrôle de code-barres au laser, conditionnement de précision et traçabilité de matériel sensible de pointe.
          </p>

          {/* Stats Badges */}
          <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto mb-6 text-center">
            <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200">
              <span className="text-[10px] text-slate-500 block uppercase font-mono">Score Final</span>
              <span className="text-lg font-black font-mono text-emerald-600">+{operator.score} pts</span>
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200">
              <span className="text-[10px] text-slate-500 block uppercase font-mono">Précision Scan</span>
              <span className="text-lg font-black font-mono text-sky-600">{operator.accuracy}%</span>
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200">
              <span className="text-[10px] text-slate-500 block uppercase font-mono">Missions</span>
              <span className="text-lg font-black font-mono text-amber-600">{operator.completedMissions}</span>
            </div>
          </div>

          {/* Signatures */}
          <div className="flex justify-between items-end pt-4 border-t border-amber-300 text-xs text-slate-600">
            <div>
              <span className="block font-mono text-[10px]">Délivré à Grenoble, le</span>
              <span className="font-bold text-slate-800">{currentDate}</span>
            </div>
            <div className="text-right">
              <span className="block font-mono text-[10px]">La Direction Logistique</span>
              <span className="font-serif italic font-bold text-slate-900 text-sm">Le Responsable Magasin</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="no-print mt-6 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Ce diplôme peut être imprimé en souvenir pour votre invité !
          </p>
          <div className="flex space-x-3">
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-amber-500/20 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer le Diplôme</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors"
            >
              Continuer le Quart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
