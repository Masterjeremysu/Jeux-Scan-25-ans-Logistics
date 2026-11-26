import React, { useEffect, useState } from 'react';
import { toPng } from 'html-to-image';
import { OperatorProfile, AppConfig } from '../types';
import { Award, Printer, X, Download, Mail } from 'lucide-react';

interface DiplomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  operator: OperatorProfile;
  collaboratorName?: string;
  guestName?: string;
  stationName?: string;
  appConfig?: AppConfig;
  hasGoldenTicket?: boolean;
}

export const DiplomeModal: React.FC<DiplomeModalProps> = ({
  isOpen,
  onClose,
  operator,
  collaboratorName,
  guestName,
  stationName,
  appConfig,
  hasGoldenTicket
}) => {
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('diplome-print-mode');
      return () => {
        document.body.classList.remove('diplome-print-mode');
      };
    }
    document.body.classList.remove('diplome-print-mode');
  }, [isOpen]);

  if (!isOpen) return null;

  const currentDate = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const rawEvent = (appConfig?.eventTitle || 'CEA GRENOBLE').trim();
  const eventTitle =
    rawEvent.toLowerCase().includes('gt') && rawEvent.toLowerCase().includes('logistics')
      ? 'CEA GRENOBLE'
      : rawEvent;
  const badgeLabel = appConfig?.badgeLabel || 'ÉDITION 25 ANS';
  const diplomaTitle = appConfig?.diplomaTitle || "DIPLÔME D'HONNEUR";
  const diplomaDesc =
    appConfig?.diplomaDescription ||
    "Décerné pour la maîtrise des opérations de préparation de commandes, contrôle laser et traçabilité logistique en flux tendu.";
  const diplomaSign = appConfig?.diplomaSignatory || 'Direction Logistique & Supply Chain • GT Logistics';
  const logoSrc = appConfig?.customLogoUrl || '/logo-gt-25ans.png';

  const rawGuest = guestName || operator.name || "Invité d'Honneur";
  const cleanGuest =
    rawGuest
      .replace(/\(Invité\)/gi, '')
      .replace(/Client/gi, '')
      .replace(/^Duo\s+/i, '')
      .trim() || "Invité d'Honneur";

  const rawCollab = collaboratorName || 'Collaborateur GT';
  const cleanCollab =
    rawCollab
      .replace(/\(GT\)/gi, '')
      .replace(/\(CEA\)/gi, '')
      .replace(/Agent/gi, '')
      .trim() || 'Collaborateur GT';

  const stationLabel = stationName || 'Poste 1 (Étagère A)';
  const podiumUrl = `${(appConfig?.publicUrl || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '')}/#podium`;

  // Niveau de distinction corporate selon le score
  const distinction =
    operator.score >= 2500
      ? { label: 'OR — EXCELLENCE', color: 'text-amber-700', border: 'border-t-amber-500' }
      : operator.score >= 1500
      ? { label: 'ARGENT — MAÎTRISE', color: 'text-slate-700', border: 'border-t-slate-500' }
      : { label: 'BRONZE — CERTIFIÉ', color: 'text-[#0c1e3a]', border: 'border-t-[#0c1e3a]' };

  const certRef = `GT25-${new Date().getFullYear()}-${String(Math.max(100, operator.score)).slice(-4)}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = async () => {
    const el = document.getElementById('diplome-printable-card');
    if (!el) return;
    try {
      setIsExporting(true);
      const dataUrl = await toPng(el, {
        quality: 0.98,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        cacheBust: true
      });
      const link = document.createElement('a');
      link.download = `Diplome_GT_Logistics_25ans_${cleanGuest.replace(/[^a-zA-Z0-9À-ÿ_-]+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.warn('Erreur lors du téléchargement du diplôme :', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrepareEmail = () => {
    const subject = encodeURIComponent(`Votre Diplôme Officiel — 25 Ans GT Logistics (${cleanGuest})`);
    const body = encodeURIComponent(
      `Bonjour ${cleanGuest},\n\n` +
        `Merci pour votre participation sur notre stand à l'occasion des 25 ans de GT Logistics !\n\n` +
        `Vous trouverez en pièce jointe votre Diplôme d'Honneur officiel (Score : ${operator.score.toLocaleString('fr-FR')} pts • Précision : ${operator.accuracy}% • Distinction : ${distinction.label}), réalisé en binôme avec ${cleanCollab}.\n\n` +
        `Bien cordialement,\n` +
        `L'équipe GT Logistics`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="diplome-modal-wrapper fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:relative print:inset-auto print:bg-white print:p-0 print:m-0 print:block print:z-auto print:backdrop-blur-none">
      {/* Dynamic Print Page Orientation */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: ${orientation === 'landscape' ? 'landscape' : 'portrait'};
                margin: 8mm;
              }
            }
          `
        }}
      />

      {/* Modal Container */}
      <div className="relative bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full p-4 sm:p-7 shadow-2xl overflow-hidden print:bg-white print:border-none print:p-0 print:m-0 print:shadow-none print:max-w-none print:w-full print:block">
        {/* Top bar (screen only) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 text-white border border-white/15 flex items-center justify-center">
              <Award className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Diplôme Corporate GT Logistics • 25 Ans
              </h3>
              <p className="text-xs text-slate-400">
                Téléchargez l'image PNG HD puis cliquez sur « Mail » pour l'envoyer à l'invité
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  orientation === 'landscape'
                    ? 'bg-white text-[#0c1e3a] shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Paysage
              </button>
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  orientation === 'portrait'
                    ? 'bg-white text-[#0c1e3a] shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Portrait
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isExporting}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer transition-all disabled:opacity-50"
              title="Télécharger l'image PNG haute définition"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Export...' : 'Image HD (PNG)'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrepareEmail}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs flex items-center space-x-1.5 border border-sky-500/40 cursor-pointer transition-all"
              title="Ouvrir un email pré-rempli pour envoyer le diplôme"
            >
              <Mail className="w-4 h-4" />
              <span>Mail</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-[#0c1e3a] font-extrabold text-xs flex items-center space-x-1.5 cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================
            OFFICIAL CORPORATE GT LOGISTICS CERTIFICATE (25 ANS)
            Clean Navy (#0c1e3a) + GT Red (#e30613) + 25 Ans Gold
            ======================================================== */}
        <div
          id="diplome-printable-card"
          className={`bg-white text-slate-900 relative mx-auto overflow-hidden shadow-2xl print:shadow-none border border-slate-300 ${
            orientation === 'landscape'
              ? 'max-w-4xl rounded-xl print:w-full print:max-w-none'
              : 'max-w-2xl rounded-xl print:w-full print:max-w-none'
          }`}
        >
          {/* Left vertical GT corporate stripe */}
          <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#0c1e3a]" />
          <div className="absolute left-2 top-0 bottom-0 w-1 bg-[#e30613]" />

          {/* Top Corporate Navy Banner */}
          <div className="bg-[#0c1e3a] text-white pl-7 pr-6 sm:pl-10 sm:pr-10 py-5 flex items-center justify-between gap-4 border-b-4 border-[#e30613]">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white p-1.5 shadow-lg ring-2 ring-[#d4a017] shrink-0 flex items-center justify-center overflow-hidden">
                <img
                  src={logoSrc}
                  alt="GT Logistics 25 Ans"
                  crossOrigin="anonymous"
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-sans font-black text-lg sm:text-2xl tracking-tight uppercase">
                    GT LOGISTICS
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded bg-[#d4a017] text-[#0c1e3a]">
                    {badgeLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-sans mt-0.5">
                  Site {eventTitle} • Challenge Logistique Officiel
                </p>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-200 italic font-sans">
                « Vous êtes unique, nos prestations <strong className="text-red-400 not-italic">aussi.</strong> »
              </p>
              <span className="text-[10px] font-mono text-slate-400 block mt-1">
                Réf. {certRef}
              </span>
            </div>
          </div>

          {/* Main Certificate Body */}
          <div className="pl-8 pr-6 sm:pl-12 sm:pr-10 py-7 sm:py-9 text-center space-y-6">
            {/* Title Block */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.25em] text-[#e30613] block">
                CERTIFICAT DE PERFORMANCE LOGISTIQUE
              </span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#0c1e3a] uppercase font-sans">
                {diplomaTitle}
              </h1>
              <div className="w-20 h-0.5 bg-[#d4a017] mx-auto mt-2" />
            </div>

            {/* Recipient Block */}
            <div className="space-y-2 py-1">
              <p className="text-xs uppercase tracking-widest text-slate-500 font-mono">
                Décerné officiellement à
              </p>
              <div className="text-3xl sm:text-4xl font-black text-[#0c1e3a] tracking-tight font-serif">
                {cleanGuest}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 font-sans">
                en binôme avec <strong className="text-[#0c1e3a]">{cleanCollab}</strong> (GT Logistics) •{' '}
                <span className="font-mono text-xs text-slate-500">{stationLabel}</span>
              </p>
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed font-sans">
              {diplomaDesc}
            </p>

            {/* Golden Ticket Mention (Clean corporate ribbon, only if found) */}
            {hasGoldenTicket && (
              <div className="max-w-lg mx-auto bg-amber-50 border border-[#d4a017] rounded-lg px-4 py-2 text-xs font-mono font-bold text-amber-950 uppercase tracking-wider">
                Mention Spéciale : Découvreur du Ticket d'Or 25 Ans (+2 500 pts)
              </div>
            )}

            {/* 3 Clean Corporate KPI Cards */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-xl mx-auto pt-1">
              <div className="bg-slate-50 border border-slate-200 border-t-[3px] border-t-[#0c1e3a] rounded-lg p-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">
                  Score Final
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-[#0c1e3a] block mt-0.5">
                  {operator.score.toLocaleString('fr-FR')} <span className="text-xs font-bold text-slate-500">pts</span>
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 border-t-[3px] border-t-[#e30613] rounded-lg p-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">
                  Précision Scan
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-[#0c1e3a] block mt-0.5">
                  {operator.accuracy}%
                </span>
              </div>

              <div className={`bg-slate-50 border border-slate-200 border-t-[3px] ${distinction.border} rounded-lg p-3`}>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">
                  Distinction
                </span>
                <span className={`text-xs sm:text-sm font-black font-mono ${distinction.color} block mt-1.5`}>
                  {distinction.label}
                </span>
              </div>
            </div>

            {/* Corporate Footer */}
            <div className="pt-5 mt-2 border-t border-slate-200 flex items-end justify-between text-left gap-4">
              {/* Date & Place */}
              <div>
                <span className="block font-mono text-[10px] text-slate-500 uppercase tracking-wider">
                  Fait à Grenoble, le
                </span>
                <span className="font-bold text-[#0c1e3a] text-xs sm:text-sm block mt-0.5">
                  {currentDate}
                </span>
                <span className="block text-[10px] text-slate-500 font-sans mt-0.5">
                  Stand GT Logistics • {eventTitle}
                </span>
              </div>

              {/* Official QR Code (with crossOrigin for crisp PNG export) */}
              <div className="flex items-center gap-2.5 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(podiumUrl)}`}
                  alt="QR Classement 25 Ans"
                  crossOrigin="anonymous"
                  className="w-10 h-10 object-contain"
                />
                <div className="text-left font-mono leading-tight">
                  <span className="block text-[8px] text-slate-500 font-bold uppercase">
                    Classement 25 Ans
                  </span>
                  <span className="block text-[9px] text-[#0c1e3a] font-black">
                    Hall of Fame en ligne
                  </span>
                </div>
              </div>

              {/* Signatory */}
              <div className="text-right">
                <span className="block font-mono text-[10px] text-slate-500 uppercase tracking-wider">
                  Validation Officielle
                </span>
                <div className="w-36 h-px bg-slate-300 ml-auto my-2" />
                <span className="font-bold text-[#0c1e3a] text-xs block">
                  {diplomaSign}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
