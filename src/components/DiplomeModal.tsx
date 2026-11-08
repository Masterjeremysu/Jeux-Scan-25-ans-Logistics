import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { OperatorProfile, AppConfig } from '../types';
import { Award, Printer, X, Star } from 'lucide-react';

interface DiplomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  operator: OperatorProfile;
  collaboratorName?: string;
  guestName?: string;
  stationName?: string;
  appConfig?: AppConfig;
}

export const DiplomeModal: React.FC<DiplomeModalProps> = ({
  isOpen,
  onClose,
  operator,
  collaboratorName,
  guestName,
  stationName,
  appConfig
}) => {
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('diplome-print-mode');
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch {
        // Fallback
      }
      return () => {
        document.body.classList.remove('diplome-print-mode');
      };
    } else {
      document.body.classList.remove('diplome-print-mode');
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

  // Clean event title to avoid duplicate "GT LOGISTICS • GT LOGISTICS"
  const rawEvent = (appConfig?.eventTitle || 'CEA GRENOBLE').trim();
  const eventTitle =
    rawEvent.toLowerCase().includes('gt') && rawEvent.toLowerCase().includes('logistics')
      ? 'CEA GRENOBLE'
      : rawEvent;
  const badgeLabel = appConfig?.badgeLabel || 'ÉDITION 25 ANS';
  const diplomaTitle = appConfig?.diplomaTitle || "DIPLÔME D'HONNEUR";
  const diplomaDesc =
    appConfig?.diplomaDescription ||
    'Attribué avec distinction pour l\'excellence des opérations de picking, contrôle laser et traçabilité logistique en flux tendu.';
  const diplomaSign = appConfig?.diplomaSignatory || 'La Direction Logistique & Supply Chain GT';

  // Format participant names cleanly: GUEST FIRST in spotlight, then GT collaborator
  const rawGuest = guestName || operator.name || 'Invité d\'Honneur';
  const cleanGuest = rawGuest
    .replace(/\(Invité\)/gi, '')
    .replace(/Client/gi, '')
    .replace(/^Duo\s+/i, '')
    .trim() || 'Invité d\'Honneur';

  const rawCollab = collaboratorName || 'Collaborateur GT';
  const cleanCollab = rawCollab
    .replace(/\(GT\)/gi, '')
    .replace(/\(CEA\)/gi, '')
    .replace(/Agent/gi, '')
    .trim() || 'Collaborateur GT';

  const stationLabel = stationName || 'Poste 1 (Scannette A)';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Modal Container */}
      <div className="relative bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full p-4 sm:p-8 shadow-2xl overflow-hidden print:p-0 print:m-0 print:border-none print:shadow-none print:max-w-none print:w-full">
        {/* Top bar (screen only) */}
        <div className="no-print flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Aperçu du Diplôme d'Honneur 25 Ans</h3>
              <p className="text-xs text-slate-400">Invité mis à l'honneur en premier • Impression propre sans aucun fond sombre</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 text-xs">
              <button
                onClick={() => setOrientation('landscape')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  orientation === 'landscape'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Paysage (Recommandé)
              </button>
              <button
                onClick={() => setOrientation('portrait')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  orientation === 'portrait'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Portrait
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs flex items-center space-x-2 shadow-lg shadow-amber-500/25 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer (Ctrl+P)</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================
            THE PRINTABLE CERTIFICATE (High-prestige official styling)
            ======================================================== */}
        <div
          id="diplome-printable-card"
          className={`bg-[#fffdf9] text-slate-950 rounded-2xl relative shadow-xl mx-auto transition-all ${
            orientation === 'landscape'
              ? 'p-6 sm:p-10 border-[6px] border-amber-600/70 max-w-4xl'
              : 'p-8 border-[6px] border-amber-600/70 max-w-2xl'
          }`}
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, rgba(254, 243, 199, 0.45) 0%, rgba(255, 253, 249, 1) 100%)'
          }}
        >
          {/* Inner Golden Ornate Border */}
          <div className="absolute inset-2 sm:inset-3 border-2 border-amber-500/50 rounded-xl pointer-events-none" />
          <div className="absolute inset-3 sm:inset-4 border border-dashed border-amber-700/30 rounded-lg pointer-events-none" />

          {/* Corner Floral Ornaments */}
          <div className="absolute top-4 left-4 text-amber-700 text-xl font-serif select-none">❖</div>
          <div className="absolute top-4 right-4 text-amber-700 text-xl font-serif select-none">❖</div>
          <div className="absolute bottom-4 left-4 text-amber-700 text-xl font-serif select-none">❖</div>
          <div className="absolute bottom-4 right-4 text-amber-700 text-xl font-serif select-none">❖</div>

          {/* Certificate Content Wrapper */}
          <div className="relative z-10 text-center flex flex-col justify-between h-full">
            {/* Header Logos & Subtitles */}
            <div className="mb-3">
              <div className="flex items-center justify-center space-x-3 mb-1.5">
                <span className="h-[2px] w-12 bg-gradient-to-r from-transparent to-amber-600" />
                <span className="text-xs font-black uppercase tracking-[0.22em] text-amber-800 font-mono">
                  GT LOGISTICS • {badgeLabel} • {eventTitle}
                </span>
                <span className="h-[2px] w-12 bg-gradient-to-l from-transparent to-amber-600" />
              </div>

              {/* Gold Medal Badge */}
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 shadow-md border-2 border-amber-600/60 my-1">
                <Award className="w-8 h-8 text-amber-950" />
              </div>

              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 uppercase font-serif mt-1">
                {diplomaTitle}
              </h1>
              <p className="text-xs font-bold text-amber-900 uppercase tracking-widest font-mono mt-0.5">
                Brevet Officiel de Logisticien d'Élite & Traçabilité Réseau
              </p>
            </div>

            {/* Recipient Duo Box (GUEST IN SPOTLIGHT FIRST) */}
            <div className="my-2 sm:my-4">
              <p className="text-xs text-slate-600 italic font-serif mb-2">
                Le jury de certification logistique et la direction décernent ce présent brevet avec distinction à :
              </p>

              <div className="inline-block bg-white/95 border-2 border-amber-500/70 rounded-2xl px-8 py-3.5 shadow-sm max-w-xl w-full">
                {/* 1. INVITÉ EN PREMIER EN GRAND */}
                <div className="flex flex-col items-center justify-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300 font-mono mb-1">
                    ★ INVITÉ D'HONNEUR ★
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-slate-950 font-serif tracking-tight">
                    {cleanGuest}
                  </div>
                </div>

                {/* 2. COPILOTE GT EN BINÔME */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-2 pt-2 border-t border-amber-200/80 text-xs text-slate-700">
                  <span className="italic font-serif">en binôme officiel avec son copilote :</span>
                  <span className="font-extrabold text-slate-900 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-lg font-mono">
                    {cleanCollab} (Collaborateur GT)
                  </span>
                </div>

                <div className="text-[10px] font-semibold text-slate-500 font-mono mt-1">
                  Duo en direct • {stationLabel}
                </div>
              </div>

              <p className="text-xs text-slate-700 max-w-xl mx-auto leading-relaxed mt-2.5 px-4 font-sans">
                {diplomaDesc}
              </p>
            </div>

            {/* Performance Stats Cards */}
            <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto my-2 sm:my-3">
              <div className="bg-white/90 p-2 sm:p-2.5 rounded-xl border border-amber-300/80 shadow-xs">
                <span className="text-[10px] text-slate-500 uppercase font-mono font-bold block">Score Final</span>
                <span className="text-lg sm:text-2xl font-black font-mono text-emerald-700">
                  +{operator.score.toLocaleString()} pts
                </span>
              </div>

              <div className="bg-white/90 p-2 sm:p-2.5 rounded-xl border border-amber-300/80 shadow-xs">
                <span className="text-[10px] text-slate-500 uppercase font-mono font-bold block">Précision Scan</span>
                <span className="text-lg sm:text-2xl font-black font-mono text-sky-700">
                  {operator.accuracy}%
                </span>
              </div>

              <div className="bg-white/90 p-2 sm:p-2.5 rounded-xl border border-amber-300/80 shadow-xs">
                <span className="text-[10px] text-slate-500 uppercase font-mono font-bold block">Missions</span>
                <span className="text-lg sm:text-2xl font-black font-mono text-amber-700">
                  {Math.max(1, operator.completedMissions)} Validée{operator.completedMissions > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Footer with Signatures & Seal */}
            <div className="pt-3 mt-1 border-t-2 border-amber-500/40 flex items-end justify-between text-left px-2 sm:px-4">
              {/* Date & Location */}
              <div>
                <span className="block font-mono text-[9px] text-slate-500 uppercase">Délivré à Grenoble le</span>
                <span className="font-bold text-slate-900 text-xs sm:text-sm">{currentDate}</span>
                <span className="block text-[9px] text-slate-500 font-mono">Stand GT Logistics • Site CEA Grenoble</span>
              </div>

              {/* Official Seal Badge */}
              <div className="hidden sm:flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-amber-600/70 flex flex-col items-center justify-center text-center p-1 bg-amber-100/50">
                  <Star className="w-3 h-3 text-amber-700" />
                  <span className="text-[7px] font-black uppercase text-amber-900 leading-tight">GT 25 ANS</span>
                  <span className="text-[6px] font-bold text-amber-800">CERTIFIÉ</span>
                </div>
              </div>

              {/* Signatory */}
              <div className="text-right">
                <span className="block font-mono text-[9px] text-slate-500 uppercase">Attribution Officielle</span>
                <span className="font-serif italic font-bold text-slate-950 text-xs sm:text-sm block">
                  {diplomaSign}
                </span>
                <span className="text-[9px] font-mono text-amber-800">Sceau & Validation du Jury</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Note (screen only) */}
        <div className="no-print mt-3 text-center">
          <p className="text-xs text-slate-400">
            Conseil : Dans les options d'impression du navigateur, activez « Graphiques d'arrière-plan » pour conserver toutes les dorures officielles.
          </p>
        </div>
      </div>
    </div>
  );
};
