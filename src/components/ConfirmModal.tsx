import React from 'react';
import { AlertTriangle, Trash2, Info, CheckCircle2, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  singleAction?: boolean;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  onConfirm: () => void;
  onCancel?: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  singleAction = false,
  variant = 'danger',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';
  const isSuccess = variant === 'success';

  const handleClose = () => {
    if (onCancel) onCancel();
    else onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn select-none">
      <div className="relative bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl overflow-hidden scale-100 transition-all">
        {/* Close cross */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Icon */}
        <div className="flex items-start space-x-4 mb-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              isDanger
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-lg shadow-rose-500/10'
                : isWarning
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-lg shadow-amber-500/10'
                : isSuccess
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                : 'bg-sky-500/20 text-sky-400 border-sky-500/30 shadow-lg shadow-sky-500/10'
            }`}
          >
            {isDanger ? (
              <Trash2 className="w-6 h-6" />
            ) : isWarning ? (
              <AlertTriangle className="w-6 h-6" />
            ) : isSuccess ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <Info className="w-6 h-6" />
            )}
          </div>

          <div className="pt-0.5">
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-slate-400 block mb-1">
              {isDanger ? 'ACTION IRRÉVERSIBLE' : isWarning ? 'ATTENTION' : isSuccess ? 'CONFIRMATION' : 'INFORMATION'}
            </span>
            <h3 className="text-lg font-black text-white tracking-tight">{title}</h3>
          </div>
        </div>

        {/* Message */}
        <p className="text-sm text-slate-300 leading-relaxed mb-6 font-medium">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800">
          {!singleAction && (
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
            >
              {cancelLabel}
            </button>
          )}

          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-lg transition-all flex items-center space-x-2 cursor-pointer ${
              isDanger
                ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-600/30'
                : isWarning
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/30'
                : isSuccess
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-emerald-500/30'
                : 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-sky-600/30'
            }`}
          >
            {isDanger && <Trash2 className="w-3.5 h-3.5" />}
            {isSuccess && <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
