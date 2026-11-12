import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, Sparkles, Upload, Image as ImageIcon } from 'lucide-react';

interface GameLogoProps {
  customLogoUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showSubtitle?: boolean;
  onUpdateLogo?: (url: string) => void;
  allowUpload?: boolean;
  className?: string;
}

export const GameLogo: React.FC<GameLogoProps> = ({
  customLogoUrl,
  size = 'md',
  showSubtitle = true,
  onUpdateLogo,
  allowUpload = false,
  className = ''
}) => {
  const [imgError, setImgError] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [tempUrl, setTempUrl] = useState('');

  // Utilise l'URL personnalisée si explicitement définie, sinon rendu vectoriel SVG GT/CEA (évite toute erreur 404 sur /logo.png)
  const explicitUrl = customLogoUrl || (typeof window !== 'undefined' ? localStorage.getItem('gt_cea_logo_url') : null);
  const activeLogoUrl = !imgError && explicitUrl && explicitUrl.trim() !== '' ? explicitUrl : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        localStorage.setItem('gt_cea_logo_url', base64);
        if (onUpdateLogo) onUpdateLogo(base64);
        setIsUploadModalOpen(false);
        setImgError(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempUrl.trim()) {
      localStorage.setItem('gt_cea_logo_url', tempUrl.trim());
      if (onUpdateLogo) onUpdateLogo(tempUrl.trim());
      setIsUploadModalOpen(false);
      setImgError(false);
    }
  };

  const sizeClasses = {
    sm: {
      img: 'h-8 max-w-[140px]',
      icon: 'w-7 h-7',
      title: 'text-sm font-extrabold',
      subtitle: 'text-[9px]'
    },
    md: {
      img: 'h-11 max-w-[200px]',
      icon: 'w-10 h-10',
      title: 'text-base sm:text-lg font-black',
      subtitle: 'text-[11px]'
    },
    lg: {
      img: 'h-16 max-w-[280px]',
      icon: 'w-14 h-14',
      title: 'text-2xl sm:text-3xl font-black',
      subtitle: 'text-xs sm:text-sm'
    },
    hero: {
      img: 'h-24 sm:h-28 max-w-[380px]',
      icon: 'w-20 h-20 sm:w-24 sm:h-24',
      title: 'text-3xl sm:text-5xl font-black tracking-tight',
      subtitle: 'text-sm sm:text-lg'
    }
  }[size];

  return (
    <div className={`relative group inline-flex items-center gap-3 ${className}`}>
      {/* If custom image provided and loads successfully */}
      {activeLogoUrl && !imgError ? (
        <div className="relative flex items-center justify-center">
          <img
            src={activeLogoUrl}
            alt="Logo GT Logistics & CEA 25 Ans"
            className={`${sizeClasses.img} object-contain drop-shadow-[0_4px_16px_rgba(14,165,233,0.3)]`}
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        /* Fallback: Ultra-sleek vector arcade badge - Logo 25 Ans officiel */
        <div className="flex items-center gap-3.5">
          <div className={`${sizeClasses.icon} rounded-2xl bg-gradient-to-tr from-sky-600 via-blue-600 to-indigo-600 p-0.5 shadow-xl shadow-sky-600/30 flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform duration-300`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
            <div className="w-full h-full bg-slate-950/80 rounded-[14px] flex items-center justify-center">
              <ShieldCheck className="w-3/5 h-3/5 text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={`${sizeClasses.title} text-white tracking-wide uppercase bg-gradient-to-r from-white via-slate-100 to-sky-200 bg-clip-text text-transparent`}>
                GT LOGISTICS
              </span>
              <span className="text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/30 shrink-0 font-mono">
                25 ANS
              </span>
            </div>
            {showSubtitle && (
              <p className={`${sizeClasses.subtitle} text-sky-400 font-semibold tracking-wider font-mono flex items-center gap-1.5`}>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>CEA GRENOBLE • WMS ARCADE</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Upload button trigger (for quick on-the-fly logo customization) */}
      {allowUpload && (
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700 flex items-center gap-1 shadow-lg"
          title="Personnaliser le logo (image ou URL)"
        >
          <Upload className="w-3 h-3 text-sky-400" />
          <span className="text-[10px]">Logo</span>
        </button>
      )}

      {/* Upload Modal (Portal to body with z-[99999] to prevent header stacking context issues) */}
      {isUploadModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-slate-700/80 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl text-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-base text-white">Personnaliser le Logo</h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-mono px-2 py-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 my-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                  1. Importer un fichier image (PNG, SVG, JPG)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer"
                />
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-3 text-slate-500 text-xs font-mono">OU</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <form onSubmit={handleUrlSubmit} className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 font-mono">
                  2. Saisir l'URL directe du logo
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={tempUrl}
                    onChange={(e) => setTempUrl(e.target.value)}
                    placeholder="https://.../logo.png"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Valider
                  </button>
                </div>
              </form>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('gt_cea_logo_url');
                  if (onUpdateLogo) onUpdateLogo('');
                  setImgError(false);
                  setIsUploadModalOpen(false);
                }}
                className="text-rose-400 hover:underline cursor-pointer"
              >
                Réinitialiser le logo par défaut
              </button>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
