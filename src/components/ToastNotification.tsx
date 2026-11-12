import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  ShieldAlert, 
  X, 
  Zap, 
  Sparkles 
} from 'lucide-react';

export type ToastType = 'success' | 'info' | 'warning' | 'hazard' | 'error';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  duration?: number;
}

// Custom event name for triggering toasts from anywhere in the app
const TOAST_EVENT = 'gt_cea_show_toast';

/**
 * Fonction universelle pour déclencher un toast éphémère et discret
 */
export function showToast(toast: Omit<ToastItem, 'id'>) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent(TOAST_EVENT, {
      detail: {
        ...toast,
        // Durée par défaut rapide (2000ms max) pour ne jamais gêner l'utilisateur
        duration: toast.duration ? Math.min(toast.duration, 2500) : 2000,
        id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      }
    });
    window.dispatchEvent(event);
  }
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleNewToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastItem>;
      if (customEvent.detail) {
        // Limité à 2 toasts max à la fois pour ne jamais encombrer l'écran
        setToasts((prev) => [customEvent.detail, ...prev].slice(0, 2));
      }
    };

    // Vider immédiatement tous les toasts si une boîte de dialogue d'impression s'ouvre
    const handleBeforePrint = () => {
      setToasts([]);
    };

    window.addEventListener(TOAST_EVENT, handleNewToast);
    window.addEventListener('beforeprint', handleBeforePrint);
    return () => {
      window.removeEventListener(TOAST_EVENT, handleNewToast);
      window.removeEventListener('beforeprint', handleBeforePrint);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div 
      aria-live="polite"
      className="no-print print:hidden fixed bottom-4 right-4 z-[99999] flex flex-col gap-2 max-w-sm w-full pointer-events-none select-none transition-all duration-200"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastCard: React.FC<{ toast: ToastItem; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  // Durée rapide par défaut : 2 secondes (auto-dismiss automatique sans forcer l'utilisateur à cliquer)
  const duration = toast.duration || 2000;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const getStyle = () => {
    switch (toast.type) {
      case 'success':
        return {
          border: 'border-emerald-500/50 shadow-emerald-950/40',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
          barBg: 'bg-emerald-500'
        };
      case 'hazard':
      case 'error':
        return {
          border: 'border-red-500/60 shadow-red-950/50',
          icon: <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />,
          barBg: 'bg-red-500'
        };
      case 'warning':
        return {
          border: 'border-amber-500/60 shadow-amber-950/40',
          icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
          barBg: 'bg-amber-500'
        };
      case 'info':
      default:
        return {
          border: 'border-sky-500/50 shadow-sky-950/40',
          icon: <Zap className="w-4 h-4 text-sky-400 shrink-0" />,
          barBg: 'bg-sky-500'
        };
    }
  };

  const style = getStyle();

  return (
    <div
      role="status"
      onClick={onDismiss}
      className={`no-print print:hidden pointer-events-auto bg-[#0a192f]/95 backdrop-blur-xl border ${style.border} rounded-2xl p-3 shadow-2xl flex flex-col justify-between overflow-hidden relative cursor-pointer transition-all transform animate-in fade-in slide-in-from-bottom-3 duration-150 hover:opacity-80`}
      title="Cliquer pour fermer immédiatement"
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start space-x-2.5">
          <div className="p-1 rounded-xl bg-slate-950/80 border border-slate-800 shrink-0 mt-0.5">
            {style.icon}
          </div>
          <div className="text-left space-y-0.5">
            <h4 className="text-xs font-black text-white tracking-wide font-sans">
              {toast.title}
            </h4>
            {toast.message && (
              <p className="text-[11px] text-slate-300 font-sans leading-tight">
                {toast.message}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          title="Fermer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress countdown indicator line */}
      <div className="w-full bg-slate-800/80 h-0.5 mt-2 rounded-full overflow-hidden">
        <div 
          className={`h-full ${style.barBg} transition-all`}
          style={{
            animation: `shrinkWidth ${duration}ms linear forwards`
          }}
        />
      </div>

      <style>{`
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};
