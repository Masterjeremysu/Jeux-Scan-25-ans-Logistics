import React, { useEffect, useState } from 'react';
import { Radio, Database, ScanBarcode, Cpu, CheckCircle2, Sparkles } from 'lucide-react';

interface SplashBootScreenProps {
  logoUrl?: string;
}

const BOOT_STEPS = [
  { id: 'rt', label: 'Synchronisation Supabase Temps Réel', icon: Radio },
  { id: 'stock', label: 'Chargement du stock & emplacements WMS', icon: Database },
  { id: 'missions', label: 'Initialisation des missions & terminaux Zebra', icon: ScanBarcode },
  { id: 'arena', label: 'Calibration Arène TV 55" & Scoring', icon: Cpu },
];

export const SplashBootScreen: React.FC<SplashBootScreenProps> = ({ logoUrl }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(18);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setActiveStep((prev) => (prev < BOOT_STEPS.length - 1 ? prev + 1 : prev));
    }, 420);

    const progInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 94) return 94;
        return Math.min(94, prev + Math.floor(Math.random() * 14 + 6));
      });
    }, 240);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progInterval);
    };
  }, []);

  const resolvedLogo =
    !imgError && logoUrl && logoUrl.trim() !== ''
      ? logoUrl
      : !imgError
        ? '/logo-gt-25ans.png'
        : null;

  return (
    <div className="min-h-screen w-full bg-[#040914] text-white relative overflow-hidden flex flex-col items-center justify-center p-6 select-none font-sans">
      {/* Perspective Cyber-Warehouse Grid Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(56,189,248,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(56,189,248,0.16) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 70% 65% at 50% 50%, black 20%, transparent 85%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 65% at 50% 50%, black 20%, transparent 85%)',
          }}
        />
        {/* Ambient Stadium Spotlights */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[640px] h-[340px] bg-sky-500/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-32 left-1/4 w-[420px] h-[320px] bg-red-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 w-[360px] h-[360px] bg-amber-500/10 rounded-full blur-[110px]" />

        {/* Horizontal Barcode Laser Sweep */}
        <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_24px_4px_rgba(239,68,68,0.75)] animate-laser-scan opacity-80" />
      </div>

      {/* Corner HUD Telemetry Brackets */}
      <div className="absolute top-5 left-5 sm:top-8 sm:left-8 flex items-center gap-2 text-[10px] sm:text-xs font-mono text-sky-400/80 tracking-widest uppercase">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <span>SYS.BOOT // GT-WMS-25</span>
      </div>
      <div className="absolute top-5 right-5 sm:top-8 sm:right-8 hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-400 tracking-widest uppercase">
        <span>ÉDITION JUBILÉ</span>
        <span className="px-2 py-0.5 rounded bg-red-600/20 border border-red-500/40 text-red-400 font-bold">
          2001 — 2026
        </span>
      </div>

      {/* Center Emblem & Orbital Scanner Rings */}
      <div className="relative z-10 flex flex-col items-center max-w-lg w-full">
        <div className="relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center mb-7">
          {/* Outer Glow Halo */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-red-600/30 via-sky-500/25 to-amber-400/30 blur-2xl animate-pulse" />

          {/* Outer Dashed Orbital Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-sky-400/40 animate-orbit-slow" />

          {/* Inner High-Speed Accent Arc */}
          <div className="absolute inset-2.5 rounded-full border-2 border-transparent border-t-red-500 border-r-sky-400 animate-orbit-reverse shadow-[0_0_20px_rgba(56,189,248,0.35)]" />

          {/* Official Round Logo Container */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white p-2 shadow-[0_0_40px_rgba(14,165,233,0.45)] ring-4 ring-white/20 flex items-center justify-center overflow-hidden">
            {resolvedLogo ? (
              <img
                src={resolvedLogo}
                alt="GT Logistics 25 Ans"
                className="w-full h-full object-contain rounded-full"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="text-center font-display font-black text-[#0c1e3a]">
                <div className="text-3xl leading-none">25</div>
                <div className="text-[10px] tracking-widest text-red-600">ANS</div>
              </div>
            )}
          </div>
        </div>

        {/* Title Block */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/15 border border-red-500/40 text-red-300 text-[11px] font-mono font-bold uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>GT LOGISTICS • 25 ANS D&apos;EXCELLENCE</span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-black tracking-tight uppercase bg-gradient-to-r from-white via-sky-200 to-white bg-clip-text text-transparent drop-shadow-[0_2px_18px_rgba(56,189,248,0.35)]">
            WMS SHIFT CHALLENGE
          </h1>
          <p className="text-xs sm:text-sm font-mono text-sky-300/80 uppercase tracking-[0.22em] mt-2">
            CONNEXION ARÈNE TEMPS RÉEL
          </p>
        </div>

        {/* Telemetry Progress Panel */}
        <div className="w-full bg-slate-900/70 backdrop-blur-xl border border-slate-700/70 rounded-2xl p-5 shadow-2xl">
          {/* Progress Bar Header */}
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-sky-400 font-bold tracking-wider uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              Initialisation du serveur
            </span>
            <span className="text-white font-black">{progress}%</span>
          </div>

          {/* Animated Laser Progress Track */}
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 mb-4 relative">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-600 via-amber-400 to-sky-400 transition-all duration-300 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer-sweep" />
            </div>
          </div>

          {/* Live Boot Checklist */}
          <div className="space-y-2">
            {BOOT_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isDone = idx < activeStep;
              const isCurrent = idx === activeStep;
              return (
                <div
                  key={step.id}
                  className={`flex items-center justify-between text-xs font-mono px-2.5 py-1.5 rounded-lg transition-all duration-300 ${
                    isCurrent
                      ? 'bg-sky-500/15 border border-sky-500/30 text-white'
                      : isDone
                        ? 'text-emerald-400/90'
                        : 'text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Icon
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isCurrent ? 'text-sky-400 animate-pulse' : 'text-slate-600'
                        }`}
                      />
                    )}
                    <span className="truncate">{step.label}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase shrink-0 ml-2">
                    {isDone ? 'OK' : isCurrent ? 'SYNC...' : 'WAIT'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Barcode Accent Strip */}
      <div className="absolute bottom-5 inset-x-0 flex items-center justify-center gap-3 text-[10px] font-mono text-slate-500 tracking-widest uppercase">
        <span>CEA GRENOBLE</span>
        <span>•</span>
        <span>SUPABASE REALTIME</span>
        <span>•</span>
        <span>ZEBRA LASER READY</span>
      </div>
    </div>
  );
};
