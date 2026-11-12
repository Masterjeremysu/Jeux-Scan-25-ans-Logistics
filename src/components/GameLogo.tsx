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
        /* Official GT Logistics Vector Brand Identity */
        <div className="flex items-center gap-3">
          {/* Official GT Logistics Chevron & Monogram Badge */}
          <div className="flex items-center">
            <svg
              className={`${sizeClasses.icon} shrink-0`}
              viewBox="0 0 120 70"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* GT Logistics Signature Speed Stripes (Red & Navy/White) */}
              <path d="M12 58L26 12H34L20 58H12Z" fill="#d71920" />
              <path d="M24 58L38 12H44L30 58H24Z" fill="#ffffff" fillOpacity="0.9" />
              <path d="M34 58L48 12H54L40 58H34Z" fill="#d71920" />

              {/* Monogram "gt" dynamic italic cut */}
              <g transform="skewX(-18)">
                {/* Letter 'g' */}
                <path
                  d="M58 24C52 24 47 28 47 36C47 44 52 48 58 48C63 48 67 45 69 41V47C69 54 64 57 58 57C53 57 50 55 49 53L44 57C47 61 52 63 58 63C68 63 75 58 75 46V25H69V29C67 26 63 24 58 24ZM61 42C56 42 53 39 53 36C53 33 56 30 61 30C65 30 69 33 69 36C69 39 65 42 61 42Z"
                  fill="#ffffff"
                />
                {/* Letter 't' */}
                <path
                  d="M80 18V24H74V30H80V44C80 47 82 49 86 49C88 49 90 48.5 91 48L91 42C90.5 42.2 89.5 42.5 88.5 42.5C87 42.5 86.5 41.8 86.5 40V30H92V24H86.5V18H80Z"
                  fill="#d71920"
                />
              </g>
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-sans font-black italic tracking-tight text-white flex items-center text-lg sm:text-xl">
                <span>gt</span>
                <span className="ml-1 not-italic font-bold text-slate-100 font-sans tracking-normal lowercase">logistics</span>
              </span>
              <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-md bg-gradient-to-r from-red-600 to-rose-700 text-white border border-red-400/40 shadow-md shadow-red-600/30 shrink-0 font-mono italic">
                25 ANS
              </span>
            </div>
            {showSubtitle && (
              <p className={`${sizeClasses.subtitle} text-slate-400 font-medium tracking-wide flex items-center gap-1.5`}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                <span>CEA GRENOBLE • Challenge Logistique</span>
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
