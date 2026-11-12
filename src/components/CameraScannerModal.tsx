import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, Zap, RefreshCw, AlertTriangle, CheckCircle2, Flashlight, ExternalLink } from 'lucide-react';
import { soundService } from '../services/soundService';

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
  const [isInsecureContext, setIsInsecureContext] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState(true);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [torchAvailable, setTorchAvailable] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);

  // Native BarcodeDetector elements
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const isStoppingRef = useRef(false);

  // Html5Qrcode Fallback
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'zebra-camera-reader-viewport';
  const usingNativeDetectorRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setIsStarting(true);
    setErrorMsg(null);
    setScannedResult(null);
    setTorchOn(false);
    setTorchAvailable(false);
    isStoppingRef.current = false;

    // Check secure context (Camera getUserMedia requires HTTPS or localhost)
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isLocalhost) {
        setIsInsecureContext(true);
        setErrorMsg("L'accès caméra sur smartphone nécessite obligatoirement une connexion sécurisée (HTTPS).");
        setIsStarting(false);
        return;
      }
    }

    const deliverResult = (code: string) => {
      if (isStoppingRef.current) return;
      isStoppingRef.current = true;
      const clean = code.trim().toUpperCase();
      if (!clean) return;

      setScannedResult(clean);
      soundService.playSuccessChime();

      if (navigator.vibrate) {
        try {
          navigator.vibrate([100, 50, 100]);
        } catch {}
      }

      setTimeout(() => {
        cleanup();
        onScan(clean);
        onClose();
      }, 500);
    };

    const cleanup = () => {
      isStoppingRef.current = true;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      videoTrackRef.current = null;

      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
            try {
              html5QrCodeRef.current?.clear();
            } catch {}
          });
        }
      }
    };

    const startScanner = async () => {
      try {
        // 1. Tenter l'API Native ultra-rapide BarcodeDetector (Chrome Android, Safari iOS 17+, Opera)
        const hasNativeBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

        if (hasNativeBarcodeDetector) {
          usingNativeDetectorRef.current = true;
          try {
            const detector = new (window as any).BarcodeDetector({
              formats: [
                'code_128',
                'code_39',
                'ean_13',
                'ean_8',
                'qr_code',
                'data_matrix',
                'upc_a',
                'upc_e'
              ]
            });

            const stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 }
              },
              audio: false
            });

            if (!mounted) {
              stream.getTracks().forEach((t) => t.stop());
              return;
            }

            streamRef.current = stream;
            const track = stream.getVideoTracks()[0];
            videoTrackRef.current = track;

            // Check torch
            try {
              const capabilities = (track as any).getCapabilities?.();
              if (capabilities && capabilities.torch) {
                setTorchAvailable(true);
              }
            } catch {}

            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              await videoRef.current.play();
            }

            setIsStarting(false);

            // Native Detection Animation Loop at 30/60fps
            const scanFrame = async () => {
              if (isStoppingRef.current || !mounted) return;
              if (videoRef.current && videoRef.current.readyState >= 2) {
                try {
                  const barcodes = await detector.detect(videoRef.current);
                  if (barcodes && barcodes.length > 0) {
                    const firstCode = barcodes[0].rawValue;
                    if (firstCode) {
                      deliverResult(firstCode);
                      return;
                    }
                  }
                } catch (e) {
                  // Frame capture skip
                }
              }
              if (!isStoppingRef.current && mounted) {
                animFrameIdRef.current = requestAnimationFrame(scanFrame);
              }
            };

            animFrameIdRef.current = requestAnimationFrame(scanFrame);
            return;
          } catch (nativeErr) {
            console.warn('[CameraScanner] Native BarcodeDetector failed, falling back to Html5Qrcode:', nativeErr);
            cleanup();
            isStoppingRef.current = false;
          }
        }

        // 2. Fallback robuste Html5Qrcode avec configuration grand format 1D & 2D
        usingNativeDetectorRef.current = false;
        const html5QrCode = new Html5Qrcode(readerElementId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
            Html5QrcodeSupportedFormats.UPC_A
          ],
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        });

        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 20,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const width = Math.min(Math.floor(viewfinderWidth * 0.9), 360);
              const height = Math.min(Math.floor(viewfinderHeight * 0.5), 180);
              return { width, height };
            },
            aspectRatio: 1.333333,
            videoConstraints: {
              facingMode: { ideal: 'environment' },
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 }
            }
          },
          (decodedText) => {
            deliverResult(decodedText);
          },
          () => {
            // Continuer le scan silencieusement
          }
        );

        if (mounted) {
          setIsStarting(false);
        }
      } catch (err: any) {
        if (!mounted) return;
        console.error('Camera Scanner start error:', err);
        setErrorMsg(
          err?.message || "Impossible d'accéder à l'appareil photo. Vérifiez les autorisations de caméra dans les paramètres de votre navigateur."
        );
        setIsStarting(false);
      }
    };

    const timer = setTimeout(startScanner, 150);

    return () => {
      mounted = false;
      clearTimeout(timer);
      cleanup();
    };
  }, [isOpen]);

  const toggleTorch = async () => {
    if (!videoTrackRef.current) return;
    const nextState = !torchOn;
    try {
      await (videoTrackRef.current as any).applyConstraints({
        advanced: [{ torch: nextState }]
      });
      setTorchOn(nextState);
    } catch (e) {
      console.warn('Torch toggle error:', e);
    }
  };

  const handleClose = () => {
    isStoppingRef.current = true;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
        try {
          html5QrCodeRef.current?.clear();
        } catch {}
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-4 select-none animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border-2 border-indigo-500/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 bg-slate-950/90 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>Scanner Caméra</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Code-barres 1D (Code 128) & QR Codes
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {torchAvailable && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-xl border transition-colors ${
                  torchOn
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title={torchOn ? 'Éteindre la torche' : 'Allumer la torche pour éclairer le code'}
              >
                <Flashlight className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Viewport Container */}
        <div className="relative w-full aspect-[4/3] bg-black overflow-hidden flex items-center justify-center">
          {/* Native HTML5 Video Element (if BarcodeDetector is supported) */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover"
          />

          {/* Fallback Html5Qrcode Container */}
          <div
            id={readerElementId}
            className="w-full h-full object-cover absolute inset-0 pointer-events-none"
          />

          {/* Laser Sweep & Reticle Overlay */}
          {!errorMsg && !isStarting && !scannedResult && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              {/* Target Scan Box */}
              <div className="relative w-[85%] max-w-[340px] h-[50%] max-h-[180px] border-2 border-indigo-400/80 rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.3)] overflow-hidden">
                {/* Red Laser Scanning Beam */}
                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_#ef4444] animate-pulse"
                     style={{
                       animation: 'laser-sweep 2s ease-in-out infinite'
                     }}
                />

                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-sky-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-sky-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-sky-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-sky-400 rounded-br-lg" />
              </div>

              <span className="mt-2 text-[11px] font-mono font-bold text-white bg-slate-950/80 px-3 py-1 rounded-full border border-slate-700 shadow-md">
                Centrez le code-barres dans le cadre
              </span>
            </div>
          )}

          {/* Loading Indicator */}
          {isStarting && (
            <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-3 text-white">
              <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
              <span className="text-xs font-mono font-bold">Démarrage de la caméra...</span>
            </div>
          )}

          {/* Scan Success Celebration Overlay */}
          {scannedResult && (
            <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-white animate-in zoom-in-95 duration-150">
              <div className="w-16 h-16 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-xl shadow-emerald-500/50">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="text-center px-4">
                <span className="text-xs font-mono font-bold text-emerald-300 uppercase block">
                  Scan Réussi !
                </span>
                <span className="text-base sm:text-lg font-mono font-black text-white bg-emerald-900/60 px-3 py-1 rounded-xl border border-emerald-500/60 inline-block mt-1">
                  {scannedResult}
                </span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="absolute inset-0 bg-slate-950/95 p-5 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/40">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <p className="text-xs text-rose-200 max-w-xs">{errorMsg}</p>

              {isInsecureContext && (
                <div className="mt-2 p-3 bg-slate-900 rounded-xl border border-slate-700 text-[11px] text-slate-300 space-y-2">
                  <p>
                    Pour utiliser la caméra sur smartphone, ouvrez le site sur son URL officielle sécurisée en HTTPS :
                  </p>
                  <a
                    href="https://jeux-scan-25-ans-logistics.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
                  >
                    <span>Ouvrir en HTTPS sécurisé</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Hint */}
        <div className="p-3 bg-slate-950 text-center border-t border-slate-800">
          <p className="text-[11px] font-mono text-slate-400">
            {expectedCodeHint ? (
              <>
                Code attendu : <strong className="text-amber-400 font-bold">{expectedCodeHint}</strong>
              </>
            ) : (
              'Visez une étiquette de stock, d\'armoire ou d\'étagère'
            )}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes laser-sweep {
          0% { top: 5%; }
          50% { top: 92%; }
          100% { top: 5%; }
        }
      `}</style>
    </div>
  );
};
