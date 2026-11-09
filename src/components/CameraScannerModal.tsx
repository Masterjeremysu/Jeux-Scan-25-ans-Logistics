import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, Zap, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedCode: string) => void;
  expectedCodeHint?: string;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  expectedCodeHint
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'zebra-camera-reader-viewport';
  const isStoppingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setIsStarting(true);
    setErrorMsg(null);
    setScannedResult(null);
    isStoppingRef.current = false;

    const startScanner = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!mounted) return;

        if (!devices || devices.length === 0) {
          setErrorMsg("Aucune caméra détectée sur ce terminal. Utilisez la douchette laser.");
          setIsStarting(false);
          return;
        }

        setCameras(devices);

        // Prefer back camera (environment)
        const backCam = devices.find(
          (d) => d.label.toLowerCase().includes('back') || 
                 d.label.toLowerCase().includes('arrière') ||
                 d.label.toLowerCase().includes('environment')
        ) || devices[devices.length - 1]; // Often the last camera is back on Android

        const selectedId = backCam.id;
        setCurrentCameraId(selectedId);

        const html5QrCode = new Html5Qrcode(readerElementId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E
          ],
          verbose: false
        });

        scannerRef.current = html5QrCode;

        const config = {
          fps: 15,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.333333
        };

        await html5QrCode.start(
          selectedId,
          config,
          (decodedText) => {
            if (isStoppingRef.current) return;
            const cleanCode = decodedText.trim().toUpperCase();
            if (cleanCode) {
              isStoppingRef.current = true;
              setScannedResult(cleanCode);

              // Haptic feedback
              if (navigator.vibrate) {
                try {
                  navigator.vibrate([80, 40, 80]);
                } catch {}
              }

              // Deliver scan result and close after quick celebration
              setTimeout(async () => {
                try {
                  if (scannerRef.current && scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                    scannerRef.current.clear();
                  }
                } catch {}
                onScan(cleanCode);
                onClose();
              }, 400);
            }
          },
          () => {
            // Frame parse failure, continue scanning quietly
          }
        );

        if (mounted) {
          setIsStarting(false);
        }
      } catch (err: any) {
        if (!mounted) return;
        console.error('Camera Scanner start error:', err);
        setErrorMsg(
          err?.message || "Impossible d'accéder à l'appareil photo. Vérifiez les autorisations de votre navigateur."
        );
        setIsStarting(false);
      }
    };

    // Small delay to ensure modal DOM is mounted
    const timer = setTimeout(startScanner, 200);

    return () => {
      mounted = false;
      clearTimeout(timer);
      isStoppingRef.current = true;
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {}).finally(() => {
            try {
              scannerRef.current?.clear();
            } catch {}
          });
        }
      }
    };
  }, [isOpen]);

  const handleSwitchCamera = async () => {
    if (cameras.length <= 1 || !scannerRef.current) return;
    try {
      setIsStarting(true);
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      const currentIndex = cameras.findIndex((c) => c.id === currentCameraId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      const nextCam = cameras[nextIndex];
      setCurrentCameraId(nextCam.id);

      await scannerRef.current.start(
        nextCam.id,
        {
          fps: 15,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.333333
        },
        (decodedText) => {
          if (isStoppingRef.current) return;
          const cleanCode = decodedText.trim().toUpperCase();
          if (cleanCode) {
            isStoppingRef.current = true;
            setScannedResult(cleanCode);
            setTimeout(async () => {
              try {
                if (scannerRef.current?.isScanning) {
                  await scannerRef.current.stop();
                }
              } catch {}
              onScan(cleanCode);
              onClose();
            }, 400);
          }
        },
        () => {}
      );
      setIsStarting(false);
    } catch (err: any) {
      console.warn('Switch camera error:', err);
      setIsStarting(false);
    }
  };

  const handleClose = async () => {
    isStoppingRef.current = true;
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }
    } catch {}
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-4 select-none animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border-2 border-indigo-500/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Scanner Appareil Photo
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Alternative caméra pour code-barres & QR
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {cameras.length > 1 && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                title="Changer de caméra"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Viewport Container */}
        <div className="relative w-full aspect-[4/3] bg-black overflow-hidden flex items-center justify-center">
          <div id={readerElementId} className="w-full h-full object-cover" />

          {/* Aiming Reticle Overlay */}
          {!scannedResult && !errorMsg && !isStarting && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-64 h-36 border-2 border-dashed border-sky-400 rounded-2xl relative shadow-lg">
                {/* Laser scan line animation */}
                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_rgba(239,68,68,1)] animate-bounce" />
                <div className="absolute top-1 left-2 text-[9px] font-mono text-sky-300 font-bold tracking-widest uppercase bg-slate-950/80 px-1.5 py-0.5 rounded">
                  Cadrez le code
                </div>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isStarting && !errorMsg && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-mono text-slate-300">Démarrage de la caméra...</p>
            </div>
          )}

          {/* Success Flash Overlay */}
          {scannedResult && (
            <div className="absolute inset-0 bg-emerald-600/90 flex flex-col items-center justify-center space-y-2 animate-scaleIn text-white">
              <CheckCircle2 className="w-16 h-16 animate-bounce" />
              <div className="text-sm font-black uppercase tracking-wider">Code Détecté !</div>
              <div className="text-base font-mono font-black bg-slate-950/80 px-4 py-1.5 rounded-xl border border-white/40">
                {scannedResult}
              </div>
            </div>
          )}

          {/* Error State */}
          {errorMsg && (
            <div className="absolute inset-0 bg-slate-950/95 p-6 flex flex-col items-center justify-center text-center space-y-3">
              <AlertCircle className="w-12 h-12 text-rose-500" />
              <p className="text-xs text-rose-300 font-medium leading-relaxed">{errorMsg}</p>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold font-mono transition-colors"
              >
                Retourner à la Douchette
              </button>
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="p-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2 text-slate-400 truncate">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">
              {expectedCodeHint ? (
                <>Attendu : <strong className="text-amber-300">{expectedCodeHint}</strong></>
              ) : (
                'Placez l\'étiquette bien éclairée dans le cadre'
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors shrink-0 ml-2"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};
