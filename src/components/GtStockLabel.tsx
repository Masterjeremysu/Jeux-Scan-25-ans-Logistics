import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export type BarcodeSymbology = 'code128' | 'hybrid' | 'qr';

export interface GtStockLabelProps {
  barcode: string;
  displayName?: string;
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

// Authentic GT Logistics Logo (Vector SVG reproduction)
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
  displayName,
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

  const isLocation =
    type === 'location' ||
    cleanCode.startsWith('LOC-') ||
    cleanCode.startsWith('ZONE_') ||
    cleanCode.startsWith('ETA') ||
    cleanCode.startsWith('DOCK');

  const isGolden = type === 'golden_ticket' || cleanCode === 'ART-GT25-VIP';
  const isHazard = type === 'seal';
  const isDockOrPackage = type === 'dock' || type === 'package';

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

  // Clean human-readable title shown prominently on QR labels (strips trailing "[SKU]" if redundant)
  const cleanTitle = (displayName || computedCr || cleanCode)
    .replace(/\s*\[[^\]]+\]\s*$/, '')
    .trim();

  const categoryBadge = isGolden
    ? 'TICKET D\'OR 25 ANS'
    : isHazard
      ? 'ALÉA URGENT'
      : isLocation
        ? 'EMPLACEMENT'
        : isDockOrPackage
          ? 'QUAI / COLIS'
          : 'ARTICLE STOCK';

  const headerBgClass = isGolden
    ? 'bg-amber-500 text-black'
    : isHazard
      ? 'bg-red-700 text-white'
      : isLocation
        ? 'bg-[#0c1e3a] text-white'
        : isDockOrPackage
          ? 'bg-slate-800 text-white'
          : 'bg-black text-white';

  useEffect(() => {
    if (symbology === 'qr') return;
    if (svgRef.current && safeCode128) {
      try {
        const len = safeCode128.length;
        let baseWidth =
          size === 'compact' ? 1.7 : size === 'large' ? 2.5 : size === 'zebra' ? 2.0 : 2.1;
        if (len > 22) {
          baseWidth = size === 'large' ? 1.7 : 1.35;
        } else if (len > 16) {
          baseWidth = size === 'large' ? 2.0 : 1.6;
        }

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
          marginTop: 4,
          marginBottom: 4,
          marginLeft: 14,
          marginRight: 14
        });

        svgRef.current.setAttribute('shape-rendering', 'crispEdges');
      } catch (err) {
        console.error('Barcode render error:', err);
      }
    }
  }, [safeCode128, size, isLocation, symbology]);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&ecc=M&margin=8&data=${encodeURIComponent(
    safeCode128
  )}`;

  // =========================================================================
  // PREMIUM QR CODE INDUSTRIAL CARD LAYOUT (ULTRA-SCANNABLE + CLEAN DESIGN)
  // =========================================================================
  if (symbology === 'qr') {
    const isZebra = size === 'zebra';
    const isLarge = size === 'large';

    return (
      <div
        className={`bg-white text-black rounded-xl border-2 border-black overflow-hidden flex flex-col justify-between select-none shadow-xs ${
          isZebra ? 'w-full h-full max-w-none rounded-lg' : 'w-full'
        } ${className}`}
      >
        {/* Top Brand & Type Strip */}
        <div
          className={`${headerBgClass} px-2.5 py-1 flex items-center justify-between gap-2 text-[9px] sm:text-[10px] font-mono font-black uppercase tracking-wider`}
        >
          <span className="truncate">{categoryBadge}</span>
          <span className="shrink-0 opacity-90">GT LOGISTICS • 25 ANS</span>
        </div>

        {/* Main Horizontal Split: Crisp QR Left + Bold Name & Ref Right */}
        <div className={`flex items-center gap-3 ${isZebra ? 'p-2' : 'p-3 sm:p-3.5'} flex-1`}>
          {/* QR Code Box with Guaranteed White Quiet Zone */}
          <div className="bg-white p-1 rounded-lg border border-gray-300 shrink-0 flex items-center justify-center">
            <img
              src={qrUrl}
              alt={`QR ${safeCode128}`}
              className={`${
                isLarge
                  ? 'w-28 h-28 sm:w-32 sm:h-32'
                  : isZebra
                    ? 'w-24 h-24'
                    : 'w-24 h-24 sm:w-28 sm:h-28'
              } object-contain block`}
              style={{ imageRendering: 'pixelated' }}
            />
          </div>

          {/* Right Info Column: Big Readable Name + Scanned Code + L/R */}
          <div className="flex-1 min-w-0 flex flex-col justify-between text-left space-y-1.5">
            <div>
              <div
                className={`font-sans font-black text-black leading-tight uppercase line-clamp-2 ${
                  isLarge ? 'text-base sm:text-lg' : isZebra ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
                }`}
              >
                {cleanTitle}
              </div>
              {computedCr && computedCr.toUpperCase() !== cleanTitle.toUpperCase() && !isLocation && (
                <div className="text-[10px] font-sans font-semibold text-gray-600 truncate mt-0.5">
                  {computedCr}
                </div>
              )}
            </div>

            {/* Scanned Barcode Value Pill */}
            <div className="bg-gray-100 border border-gray-400 rounded-md px-2 py-1 font-mono font-black text-black text-[11px] sm:text-xs tracking-wide break-all">
              {cleanCode}
            </div>

            {/* Footer Metadata */}
            <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-gray-700 pt-0.5 border-t border-gray-200">
              <span className="truncate font-bold">
                {isLocation ? 'ZONE WMS' : `L/R : ${computedLr}`}
              </span>
              <span className="shrink-0 font-black text-black">QR 2D</span>
            </div>
          </div>
        </div>

        {showCutLine && (
          <div className="text-[8px] text-gray-400 py-1 border-t border-dashed border-gray-300 text-center uppercase tracking-widest font-sans">
            ✂️ Découper selon le cadre
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // CLASSIC CODE-128 & HYBRID (CODE-128 + QR) LAYOUT
  // =========================================================================
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
            {categoryBadge}
          </span>
        </div>
      )}

      {/* Nom clair au-dessus du code-barres */}
      <div className="text-center font-sans font-black text-xs sm:text-sm text-black uppercase truncate mb-1">
        {cleanTitle}
      </div>

      {/* Zone Code-Barres / Hybride */}
      {symbology === 'hybrid' ? (
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
        <div className="text-center font-bold text-xs sm:text-sm tracking-wider text-black mt-1 font-mono uppercase break-all">
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
