import React, { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Mission, DuoStation, LiveHazard } from '../types';
import { 
  CheckCircle2, 
  MapPin, 
  Package, 
  Flame, 
  Users, 
  Clock, 
  ShieldAlert, 
  Sparkles, 
  Zap, 
  Swords,
  ChevronRight,
  Truck
} from 'lucide-react';
import { barcodeListener } from '../services/barcodeListener';

interface ZebraPlayViewProps {
  stationId: string;
  stationName: string;
  operatorCea: string;
  clientGuest: string;
  score: number;
  combo: number;
  shiftSecondsRemaining: number;
  missions: Mission[];
  currentMissionIndex: number;
  lastScannedCode: string | null;
  flashState: 'green' | 'red' | null;
  activeHazard: LiveHazard | null;
  hazardSecondsRemaining: number;
  otherStations: DuoStation[];
}

export const ZebraPlayView: React.FC<ZebraPlayViewProps> = ({
  stationId,
  stationName,
  operatorCea,
  clientGuest,
  score,
  combo,
  shiftSecondsRemaining,
  missions,
  currentMissionIndex,
  lastScannedCode,
  flashState,
  activeHazard,
  hazardSecondsRemaining,
  otherStations
}) => {
  const isPoste1 = stationId === 'poste-1';
  const mission = missions[currentMissionIndex] || missions[0];
  const currentStep = mission ? mission.steps.find((s) => !s.completed) || null : null;
  const completedStepsCount = mission ? mission.steps.filter((s) => s.completed).length : 0;
  const totalStepsCount = mission ? mission.steps.length : 1;
  const progressPercent = Math.round((completedStepsCount / totalStepsCount) * 100);

  const rival = otherStations.find((s) => s.station_id !== stationId);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.max(0, seconds) % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Keyboard shortcut Spacebar for dev test
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (activeHazard) {
          barcodeListener.simulateScan(activeHazard.expected_barcode);
        } else if (currentStep) {
          barcodeListener.simulateScan(currentStep.expectedBarcode);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, activeHazard]);

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col p-3 sm:p-5 select-none transition-colors duration-200 ${
      flashState === 'green' ? 'bg-emerald-950/40' : flashState === 'red' ? 'bg-rose-950/40' : ''
    }`}>
      {/* 1. TOP LOCKED ZEBRA HUD (No tabs, no admin, purely gaming status) */}
      <header className="bg-slate-900 rounded-2xl p-3 border border-slate-800 shadow-xl flex items-center justify-between gap-2 shrink-0">
        {/* Station Badge & Duo Name */}
        <div className="flex items-center space-x-2 min-w-0">
          <span className={`text-[11px] font-black font-mono px-2.5 py-1 rounded-xl uppercase shrink-0 ${
            isPoste1 ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20' : 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
          }`}>
            {stationName.split(' ')[0]} {stationName.includes('1') ? 'Bleu' : 'Orange'}
          </span>
          <div className="truncate">
            <span className="text-xs font-bold text-white block truncate">
              {operatorCea} 🤝 {clientGuest}
            </span>
          </div>
        </div>

        {/* Center: Match Countdown */}
        <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800 font-mono text-sm font-black text-amber-300 shrink-0">
          <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>{formatTime(shiftSecondsRemaining)}</span>
        </div>

        {/* Right: Score & Combo */}
        <div className="flex items-center space-x-2 shrink-0">
          {combo > 1 && (
            <div className="hidden sm:flex items-center space-x-1 text-xs font-black font-mono px-2 py-0.5 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 animate-pulse">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>x{combo}</span>
            </div>
          )}
          <div className="text-right">
            <span className="text-sm sm:text-base font-black font-mono text-emerald-400">
              {score} <span className="text-[10px] text-slate-400 font-normal">pts</span>
            </span>
          </div>
        </div>
      </header>

      {/* 2. RIVAL RADAR (Mini duel progress bar vs the other station) */}
      {rival && (
        <div className="mt-2.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs font-mono shrink-0">
          <div className="flex items-center space-x-1.5 text-slate-400 truncate">
            <Swords className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-bounce" />
            <span className="truncate">Rival ({rival.station_name.split(' ')[0]}) : <strong className="text-slate-200">{rival.team_name}</strong></span>
          </div>
          <div className="flex items-center space-x-2 shrink-0 ml-2">
            <div className="w-16 sm:w-24 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div className="bg-amber-400 h-full rounded-full transition-all duration-300" style={{ width: `${rival.progress_percent}%` }} />
            </div>
            <span className="text-amber-400 font-bold">{rival.progress_percent}%</span>
          </div>
        </div>
      )}

      {/* 3. EMERGENCY HAZARD TAKE-OVER (If triggered by Admin) */}
      {activeHazard && (
        <div className="mt-3 bg-gradient-to-r from-red-950 via-rose-900 to-amber-950 rounded-2xl p-4 border-2 border-red-500 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-red-600/30 border border-red-400 flex items-center justify-center text-red-300 shrink-0">
              <ShieldAlert className="w-7 h-7 text-red-400 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500 text-slate-950">
                  ALÉA FLASH EN DIRECT
                </span>
                <span className="text-xs font-mono font-bold text-amber-300">
                  +{activeHazard.points_bonus} PTS BONUS
                </span>
              </div>
              <h2 className="text-base font-black text-white mt-0.5">
                {activeHazard.title}
              </h2>
              <p className="text-xs text-rose-200 leading-tight">
                {activeHazard.message}
              </p>
              <div className="mt-2 text-xs font-mono text-white bg-red-950/90 px-3 py-1 rounded-xl border border-red-500/40 inline-block">
                ⚡ SCANNEZ : <strong className="text-amber-300">{activeHazard.expected_barcode}</strong>
              </div>
            </div>
          </div>

          <div className="bg-black/60 px-4 py-2 rounded-xl border border-red-500/40 font-mono text-center shrink-0">
            <span className="text-[10px] text-red-400 block font-bold">COMPTE À REBOURS</span>
            <span className="text-2xl font-black text-amber-300">{hazardSecondsRemaining}s</span>
          </div>
        </div>
      )}

      {/* 4. MAIN ACTION CARD : CURRENT PICKING ORDER */}
      <main className="my-auto py-3 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
        {currentStep ? (
          <div className="w-full bg-slate-900 rounded-3xl p-5 sm:p-7 border-2 border-indigo-500/40 shadow-2xl space-y-5">
            {/* Mission Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-mono font-bold text-sky-400 uppercase tracking-wider block">
                  {mission.code} • Mission {currentMissionIndex + 1}/{missions.length}
                </span>
                <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                  {mission.title}
                </h1>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-mono text-slate-400 block">Étape</span>
                <span className="text-base sm:text-lg font-black font-mono text-sky-400">
                  {completedStepsCount + 1} / {totalStepsCount}
                </span>
              </div>
            </div>

            {/* Instruction Prompt */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-[11px] font-mono uppercase font-bold text-amber-400 flex items-center space-x-1">
                <Zap className="w-3.5 h-3.5" />
                <span>Consigne d'action immédiate :</span>
              </span>
              <p className="text-base sm:text-xl font-extrabold text-white leading-snug">
                {currentStep.instruction}
              </p>
            </div>

            {/* Big Physical Target Display */}
            <div className="bg-gradient-to-br from-slate-950 to-slate-900 p-4 sm:p-5 rounded-2xl border-2 border-dashed border-sky-500/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div className="space-y-1">
                <span className="text-xs uppercase font-mono text-slate-400 block font-bold">
                  {currentStep.barcodeType === 'location' ? '📍 Emplacement Étagère à viser :' : currentStep.barcodeType === 'dock' ? '🚚 Quai d\'Expédition :' : '📦 Pièce / Colis à scanner :'}
                </span>
                <div className="text-base sm:text-lg font-black text-white flex items-center justify-center sm:justify-start space-x-2">
                  <span>{currentStep.targetLabel}</span>
                </div>
                {currentStep.hint && (
                  <p className="text-xs text-slate-400 italic pt-1">
                    💡 {currentStep.hint}
                  </p>
                )}
              </div>

              {/* Expected Barcode High-Vis Badge */}
              <div className="bg-slate-950 px-4 py-3 rounded-2xl border-2 border-amber-500/50 shadow-lg text-center shrink-0">
                <span className="text-[10px] text-slate-400 font-mono block">Code-barres étiquette</span>
                <span className="text-base sm:text-xl font-black font-mono text-amber-300 tracking-wider">
                  {currentStep.expectedBarcode}
                </span>
              </div>
            </div>

            {/* Scanner Ready Indicator & Dev Fallback Click */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2">
              <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span className="text-emerald-400 font-bold">Scannez l'étiquette avec votre douchette</span>
              </div>

              {/* Dev Simulation Button */}
              <button
                type="button"
                onClick={() => barcodeListener.simulateScan(currentStep.expectedBarcode)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold border border-slate-700 transition-colors"
                title="Simule le scan si la douchette physique n'est pas connectée"
              >
                Simuler le Scan (Mode Test)
              </button>
            </div>
          </div>
        ) : (
          /* Mission Completed Card */
          <div className="w-full bg-emerald-950/40 rounded-3xl p-8 border-2 border-emerald-500 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
              <Sparkles className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-black text-white">COMMANDE EXPÉDIÉE AVEC SUCCÈS !</h2>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              Félicitations au binôme ! Regardez la grande TV 55" pour voir votre place au classement en direct.
            </p>
            <div className="text-3xl font-black font-mono text-emerald-400">
              Score : {score} pts
            </div>
          </div>
        )}
      </main>

      {/* 5. FOOTER FEEDBACK (Last scan log) */}
      <footer className="mt-auto pt-2 shrink-0 text-center font-mono text-xs text-slate-500">
        {lastScannedCode ? (
          <span>Dernier code flashé : <strong className="text-white">{lastScannedCode}</strong></span>
        ) : (
          <span>Visez les étiquettes de vos étagères et quais avec le laser de la scannette.</span>
        )}
      </footer>
    </div>
  );
};
