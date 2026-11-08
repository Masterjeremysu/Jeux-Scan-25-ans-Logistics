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
 * Fonction universelle pour déclencher un toast depuis n'importe quel composant ou service
 */
export function showToast(toast: Omit<ToastItem, 'id'>) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent(TOAST_EVENT, {
      detail: {
        ...toast,
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
        setToasts((prev) => [customEvent.detail, ...prev].slice(0, 4));
      }
    };

    window.addEventListener(TOAST_EVENT, handleNewToast);
    return () => window.removeEventListener(TOAST_EVENT, handleNewToast);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div 
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none transition-all duration-300"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastCard: React.FC<{ toast: ToastItem; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  const duration = toast.duration || 3200;

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
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
          barBg: 'bg-emerald-500'
        };
      case 'hazard':
      case 'error':
        return {
          border: 'border-rose-500/60 shadow-rose-950/50',
          badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          icon: <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />,
          barBg: 'bg-rose-500'
        };
      case 'warning':
        return {
          border: 'border-amber-500/60 shadow-amber-950/40',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
          barBg: 'bg-amber-500'
        };
      case 'info':
      default:
        return {
          border: 'border-sky-500/50 shadow-sky-950/40',
          badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
          icon: <Zap className="w-5 h-5 text-sky-400 shrink-0" />,
          barBg: 'bg-sky-500'
        };
    }
  };

  const style = getStyle();

  return (
    <div
      role="status"
      className={`pointer-events-auto bg-slate-900/95 backdrop-blur-xl border ${style.border} rounded-2xl p-3.5 shadow-2xl flex flex-col justify-between overflow-hidden relative transition-all transform animate-in fade-in slide-in-from-bottom-5 duration-200 hover:scale-[1.02]`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start space-x-3">
          <div className="p-1 rounded-xl bg-slate-950/80 border border-slate-800">
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
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
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
