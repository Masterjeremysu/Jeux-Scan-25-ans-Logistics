import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { soundService } from '../services/soundService';
import { Sparkles, Printer, X, Award, CheckCircle2 } from 'lucide-react';
import { GtStockLabel } from './GtStockLabel';

export interface GoldenTicketModalProps {
  isOpen: boolean;
  duoName: string;
  onClose: () => void;
}

export const GoldenTicketModal: React.FC<GoldenTicketModalProps> = ({
  isOpen,
  duoName,
  onClose
}) => {
  useEffect(() => {
    if (isOpen) {
      // Play celebratory golden ticket fanfare
      soundService.playGoldenTicketFanfare();

      // Launch dazzling multi-stage golden confetti cannon
      const end = Date.now() + 2500;
      const colors = ['#f59e0b', '#fbbf24', '#d97706', '#e30613', '#0c1e3a', '#ffffff'];

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrintTicket = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn print:static print:p-0 print:bg-white print:block">
      {/* Container Box */}
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl p-2 sm:p-4 bg-gradient-to-b from-amber-500/20 to-amber-700/30 border border-amber-400/40 shadow-2xl shadow-amber-500/20 print:p-0 print:border-none print:shadow-none print:max-w-none print:overflow-visible">
        
        {/* Screen-only Close Button */}
        <button
          onClick={onClose}
          className="no-print absolute top-4 right-4 z-20 p-2.5 rounded-full bg-slate-900/80 text-amber-300 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer border border-amber-400/40"
          title="Fermer et reprendre la mission"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ========================================================
            THE WILLY WONKA STYLE "GOLDEN TICKET" CANVAS
            ======================================================== */}
        <div
          id="golden-ticket-printable"
          className="relative rounded-2xl p-6 sm:p-10 border-4 border-[#b4801e] shadow-2xl overflow-hidden select-none print:border-4 print:border-[#b4801e] print:p-8"
          style={{
            background: 'linear-gradient(135deg, #fff3c4 0%, #ffd54f 25%, #fff9c4 50%, #fbc02d 75%, #fff176 100%)',
            boxShadow: '0 25px 50px -12px rgba(180, 128, 30, 0.45), inset 0 0 20px rgba(180, 128, 30, 0.25)'
          }}
        >
          {/* Ornate Victorian / Guilloché Thin Inner Border */}
          <div className="absolute inset-2 sm:inset-3 border-2 border-dashed border-[#8d6210]/60 rounded-xl pointer-events-none" />
          <div className="absolute inset-4 sm:inset-5 border border-[#8d6210]/30 rounded-lg pointer-events-none" />

          {/* Decorative Corner Ornaments */}
          <div className="absolute top-3 left-3 text-[#8d6210] font-serif text-lg leading-none select-none">❧</div>
          <div className="absolute top-3 right-3 text-[#8d6210] font-serif text-lg leading-none select-none">☙</div>
          <div className="absolute bottom-3 left-3 text-[#8d6210] font-serif text-lg leading-none select-none">☙</div>
          <div className="absolute bottom-3 right-3 text-[#8d6210] font-serif text-lg leading-none select-none">❧</div>

          {/* Watermark Logo / Shimmer */}
          <div className="absolute -right-10 -bottom-10 w-64 h-64 opacity-10 pointer-events-none font-black text-[120px] text-[#8d6210]">
            25
          </div>

          <div className="relative z-10 text-center space-y-4">
            
            {/* Top Stars & Badge */}
            <div className="flex items-center justify-center space-x-2 text-[#7d560c]">
              <Sparkles className="w-4 h-4 fill-current animate-spin" style={{ animationDuration: '6s' }} />
              <span className="text-[11px] sm:text-xs font-serif font-bold uppercase tracking-[0.3em]">
                ★ ★ ★ TICKET D'OR OFFICIEL • ÉDITION LIMITÉE ★ ★ ★
              </span>
              <Sparkles className="w-4 h-4 fill-current animate-spin" style={{ animationDuration: '6s' }} />
            </div>

            {/* Giant Willy Wonka Style Header */}
            <div>
              <h1
                className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#4a3406] drop-shadow-sm font-serif"
                style={{
                  fontFamily: '"Cinzel", "Times New Roman", "Georgia", serif',
                  textShadow: '1px 1px 0px rgba(255,255,255,0.7), 2px 2px 2px rgba(120, 80, 10, 0.3)'
                }}
              >
                GOLDEN TICKET
              </h1>
              <div className="h-1 w-32 bg-gradient-to-r from-transparent via-[#8d6210] to-transparent mx-auto mt-1" />
              <p className="text-xs sm:text-sm font-serif font-black uppercase tracking-[0.2em] text-[#7d560c] mt-1.5">
                Félicitations à l'Heureux Découvreur !
              </p>
            </div>

            {/* Recipient Duo Box */}
            <div className="inline-block bg-[#fffbe6]/90 border-2 border-[#b4801e] px-6 py-2.5 rounded-xl shadow-inner max-w-full">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#7d560c] block font-bold">
                Décerné en direct sur le stand au binôme :
              </span>
              <span className="text-base sm:text-xl font-black text-[#3a2905] font-serif">
                {duoName || 'Invité & Opérateur GT Logistics'}
              </span>
            </div>

            {/* The Historical Double Anniversary Proclamation */}
            <div className="max-w-2xl mx-auto space-y-2 py-1 text-[#4a3406]">
              <div className="p-3 bg-amber-500/10 border border-[#b4801e]/40 rounded-xl text-center space-y-1">
                <div className="text-xs sm:text-sm font-black font-serif uppercase tracking-wide text-[#5a3f06]">
                  🏛️ 25 ANS DU GROUPE GT LOGISTICS (2001 — 2026)
                </div>
                <div className="text-[11px] sm:text-xs font-bold font-serif uppercase tracking-wide text-[#7d560c]">
                  🔬 10 ANS D'ANCRAGE & D'EXCELLENCE SUR LE SITE DU CEA GRENOBLE (DEPUIS 2016)
                </div>
              </div>

              <p className="text-xs sm:text-sm font-serif italic leading-relaxed px-2 text-[#4a3406]">
                « Ce précieux sésame atteste de votre œil d'aigle et de votre sagacité d'explorateur en logistique de pointe.
                En déterrant cette archive secrète dissimulée dans les rayonnages du magasin, vous inscrivez votre binôme au panthéon du stand ! »
              </p>
            </div>

            {/* Bonus Pill & Secret Barcode Box */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="flex items-center space-x-2 bg-[#4a3406] text-[#ffd54f] px-4 py-2 rounded-xl shadow-md border border-[#ffd54f]/50">
                <Award className="w-5 h-5 text-amber-300" />
                <span className="text-xs sm:text-sm font-mono font-black uppercase tracking-wider">
                  BONUS IMMÉDIAT : +2 500 PTS
                </span>
              </div>

              <div className="text-[11px] font-mono text-[#7d560c] bg-white/70 px-3 py-1.5 rounded-lg border border-[#b4801e]/30">
                Code Collector : <strong className="text-black font-bold">ART-GT25-VIP</strong>
              </div>
            </div>

            {/* Signatures & Seal */}
            <div className="pt-4 border-t border-[#8d6210]/30 grid grid-cols-2 gap-4 items-center text-xs font-serif text-[#5a3f06]">
              <div className="text-left">
                <span className="block text-[10px] font-mono uppercase text-[#7d560c]">Pour le Groupe :</span>
                <span className="font-bold">GT Logistics (25 Ans)</span>
              </div>

              <div className="text-right">
                <span className="block text-[10px] font-mono uppercase text-[#7d560c]">Sur le Site :</span>
                <span className="font-bold">Partenariat CEA Grenoble (10 Ans)</span>
              </div>
            </div>

          </div>
        </div>

        {/* Screen-only Modal Bottom Actions */}
        <div className="no-print mt-4 p-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-amber-300 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Bonus de <strong>+2 500 pts</strong> crédité au score de votre session !</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrintTicket}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center space-x-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer le Ticket d'Or</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
            >
              Reprendre la Mission
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
