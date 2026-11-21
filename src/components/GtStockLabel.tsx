import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export type BarcodeSymbology = 'code128' | 'hybrid' | 'qr';

export interface GtStockLabelProps {
  barcode: string;
  lrCode?: string;
  crLabel?: string;
  type?: string;
  size?: 'compact' | 'standard' | 'large' | 'zebra';
  symbology?: BarcodeSymbology;
  idSuffix?: string;
  className?: string;
  showCutLine?: boolean;
  showLogo?: boolean;
}

// Sanitize string for Code-128B (strictly printable ASCII 32..126, no accents that break JsBarcode)
export const sanitizeForCode128 = (raw: string): string =>
  raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();

// Authentic GT Logistics Logo (Vector SVG reproduction - can be re-enabled when logo is finalized)
export const GtLogisticsLogo: React.FC<{ className?: string }> = ({ className = 'h-5 sm:h-6' }) => (
  <svg
    viewBox="0 0 140 45"
    className={`${className} w-auto`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* 3 Red diagonal speed stripes */}
    <g fill="#c5161d">
      <polygon points="6,40 13,40 25,6 18,6" />
      <polygon points="16,40 23,40 35,6 28,6" />
      <polygon points="26,40 33,40 45,6 38,6" />
    </g>

    {/* 'gt' stylized lettering in deep navy */}
    <g fill="#002d62">
      <path
        d="M58,22 C53,22 48,25 48,31 C48,37 52,40 58,40 C63,40 67,37 68,33 L68,40 L75,40 L75,24 C75,14 68,9 56,9 L56,16 C62,16 66,18 66,23 L66,26 C64,23 61,22 58,22 Z M59,28 C63,28 66,30 66,33 C66,35 63,37 59,37 C56,37 54,35 54,33 C54,30 56,28 59,28 Z"
      />
      <path
        d="M82,14 L82,7 L75,7 L75,14 L69,14 L69,21 L75,21 L75,34 C75,38 78,41 85,41 L89,41 L89,34 L86,34 C83,34 82,33 82,30 L82,21 L89,21 L89,14 L82,14 Z"
      />
    </g>
  </svg>
);

export const GtStockLabel: React.FC<GtStockLabelProps> = ({
  barcode,
  lrCode,
  crLabel,
  type = 'article',
  size = 'standard',
  symbology = 'code128',
  className = '',
  showCutLine = false,
  showLogo = false
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const cleanCode = barcode.trim();
  const safeCode128 = sanitizeForCode128(cleanCode) || 'CODE-INVALIDE';

  // Détection du type emplacement (aucune mention superflue, uniquement code-barres + texte)
  const isLocation =
    type === 'location' ||
    cleanCode.startsWith('LOC-') ||
    cleanCode.startsWith('ZONE_') ||
    cleanCode.startsWith('ETA') ||
    cleanCode.startsWith('DOCK');

  // Valeurs par défaut de référence et désignation
  const computedLr =
    lrCode ||
    (cleanCode.startsWith('LOC-')
      ? cleanCode.replace('LOC-', 'LOC_')
      : cleanCode.startsWith('ART-')
        ? cleanCode.replace('ART-', 'REF_')
        : cleanCode.slice(0, 12));

  const computedCr =
    crLabel ||
    (cleanCode.includes('7490')
      ? 'JOINT TORIQUE KALREZ (TUBE)'
      : cleanCode.includes('0478')
        ? 'JOINT TORIQUE KALREZ (TUBE)'
        : cleanCode.includes('KF40')
          ? 'BRIDE A VIDE KF40 INOX 316L'
          : cleanCode.includes('VITON')
            ? 'JOINT ELASTOMERE VITON KF40'
            : cleanCode.includes('WAFER')
              ? 'LOT WAFERS SILICIUM PUR 300MM'
              : cleanCode.includes('SACHET')
                ? 'SACHET DOUBLE ENSACHAGE ESD'
                : cleanCode.includes('PUMP')
                  ? 'POMPE TURBO-MOLECULAIRE EDWARDS'
                  : cleanCode.includes('CARTON')
                    ? 'CARTON EXPEDITION SECURISE CEA'
                    : cleanCode.includes('SCEL')
                      ? 'SCELLE NUMEROTE INVIOLABLE IATA'
                      : cleanCode.toUpperCase());

  useEffect(() => {
    if (symbology === 'qr') return;
    if (svgRef.current && safeCode128) {
      try {
        const len = safeCode128.length;
        // Dynamic bar width: shorter codes get thicker bars, longer codes avoid sub-pixel squishing
        let baseWidth =
          size === 'compact' ? 1.7 : size === 'large' ? 2.5 : size === 'zebra' ? 2.0 : 2.1;
        if (len > 22) {
          baseWidth = size === 'large' ? 1.7 : 1.35;
        } else if (len > 16) {
          baseWidth = size === 'large' ? 2.0 : 1.6;
        }

        // Taller bars make laser sweeps much more forgiving
        const barHeight = isLocation
          ? size === 'compact'
            ? 46
            : size === 'large'
              ? 72
              : size === 'zebra'
                ? 54
                : 58
          : size === 'compact'
            ? 42
            : size === 'large'
              ? 66
              : size === 'zebra'
                ? 48
                : 54;

        JsBarcode(svgRef.current, safeCode128, {
          format: 'CODE128',
          lineColor: '#000000',
          background: '#FFFFFF',
          width: baseWidth,
          height: barHeight,
          displayValue: false,
          // Mandatory Code-128 Quiet Zone (>= 10x module width on left & right) for instant Zebra laser read
          marginTop: 4,
          marginBottom: 4,
          marginLeft: 14,
          marginRight: 14
        });

        // Enforce razor-sharp edges for 203 DPI thermal printers (Zebra ZD421d) & A4 laser
        svgRef.current.setAttribute('shape-rendering', 'crispEdges');
      } catch (err) {
        console.error('Barcode render error:', err);
      }
    }
  }, [safeCode128, size, isLocation, symbology]);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&ecc=M&margin=6&data=${encodeURIComponent(
    safeCode128
  )}`;

  return (
    <div
      className={`bg-white text-black p-3 sm:p-4 rounded-xl border-2 border-black flex flex-col justify-between select-none shadow-xs transition-all ${
        size === 'compact'
          ? 'max-w-xs text-xs'
          : size === 'large'
            ? 'max-w-md text-sm'
            : size === 'zebra'
              ? 'w-full h-full max-w-none text-xs p-2 sm:p-2.5 rounded-lg'
              : 'w-full text-xs'
      } ${className}`}
      style={{
        fontFamily: '"JetBrains Mono", Consolas, "Courier New", monospace'
      }}
    >
      {/* Header optionnel avec Logo si activé */}
      {showLogo && (
        <div className="flex items-center justify-between mb-1.5 w-full">
          <GtLogisticsLogo className={size === 'compact' ? 'h-4' : 'h-6'} />
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-sans">
            {isLocation ? 'Emplacement' : 'Stock'}
          </span>
        </div>
      )}

      {/* Zone Code-Barres / QR Code Haute Netteté */}
      {symbology === 'qr' ? (
        <div className="w-full flex items-center justify-center py-1 bg-white">
          <img
            src={qrUrl}
            alt={`QR ${safeCode128}`}
            className={`${
              size === 'large' ? 'w-32 h-32' : size === 'zebra' ? 'w-24 h-24' : 'w-28 h-28'
            } object-contain`}
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      ) : symbology === 'hybrid' ? (
        <div className="w-full flex items-center justify-between gap-2 py-1 bg-white">
          <div className="flex-1 min-w-0 flex items-center justify-center">
            <svg
              ref={svgRef}
              shapeRendering="crispEdges"
              className="gt-barcode-svg max-w-full h-auto block mx-auto"
            />
          </div>
          <img
            src={qrUrl}
            alt={`QR ${safeCode128}`}
            className={`${
              size === 'large' ? 'w-16 h-16' : 'w-12 h-12'
            } shrink-0 object-contain border border-gray-200 rounded`}
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      ) : (
        <div className="w-full flex items-center justify-center py-1 bg-white">
          <svg
            ref={svgRef}
            shapeRendering="crispEdges"
            className="gt-barcode-svg max-w-full h-auto block mx-auto"
          />
        </div>
      )}

      {/* Rendu spécifique selon type : Emplacement VS Article */}
      {isLocation ? (
        <div className="text-center font-bold text-xs sm:text-base tracking-wider text-black mt-1.5 font-mono uppercase break-all">
          {cleanCode}
        </div>
      ) : (
        <>
          <div className="text-center font-bold text-xs sm:text-sm tracking-wider text-black my-1 break-all">
            {cleanCode}
          </div>

          <div className="mt-1 pt-1.5 border-t border-gray-300 text-left text-[11px] sm:text-xs leading-tight font-bold text-gray-900 space-y-0.5">
            <div className="truncate">
              <span className="text-gray-600 font-normal">L/R : </span>
              <span className="font-extrabold">{computedLr}</span>
            </div>
            <div className="truncate">
              <span className="text-gray-600 font-normal">C/R : </span>
              <span className="font-extrabold uppercase">{computedCr}</span>
            </div>
          </div>
        </>
      )}

      {showCutLine && (
        <div className="text-[8px] text-gray-400 mt-2 pt-1 border-t border-dashed border-gray-300 text-center uppercase tracking-widest font-sans">
          ✂️ Découper selon le cadre
        </div>
      )}
    </div>
  );
};
