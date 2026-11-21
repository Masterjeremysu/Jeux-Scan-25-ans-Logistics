import React, { useEffect, useMemo, useState } from 'react';
import { InventoryItem, Mission, Distraction, WarehouseLocation } from '../types';
import {
  Printer,
  Filter,
  X,
  Tag,
  Sliders,
  FileText,
  CheckCircle2,
  Sparkles,
  CheckSquare,
  Square,
  QrCode,
  ScanBarcode,
  AlertTriangle
} from 'lucide-react';
import { GtStockLabel, BarcodeSymbology, sanitizeForCode128 } from './GtStockLabel';

export interface ZebraFormat {
  id: string;
  name: string;
  width: string;
  height: string;
  desc: string;
}

export const ZEBRA_FORMATS: ZebraFormat[] = [
  { id: '100x50', name: '100 × 50 mm (4" × 2" - Standard Logistique GT)', width: '100mm', height: '50mm', desc: 'Format standard WMS pour casiers, armoires et cartons' },
  { id: '100x38', name: '100 × 38 mm (4" × 1.5" - Rayonnage & Casier)', width: '100mm', height: '38mm', desc: 'Idéal pour façades de tiroirs et alvéoles étroites' },
  { id: '76x51', name: '76 × 51 mm (3" × 2" - Polyvalent Compact)', width: '76mm', height: '51mm', desc: 'Format intermédiaire rouleau thermique' },
  { id: '50x30', name: '50 × 30 mm (2" × 1.2" - Petit Sachet ESD)', width: '50mm', height: '30mm', desc: 'Idéal pour petites pièces détachées et sachets' },
  { id: '102x152', name: '102 × 152 mm (4" × 6" - Fret & Expédition)', width: '102mm', height: '152mm', desc: 'Grand format transporteur pour palettes et colis' }
];

interface PlancheEtiquettesViewProps {
  inventory?: InventoryItem[];
  locations?: WarehouseLocation[];
  missions?: Mission[];
  distractions?: Distraction[];
  goldenTicketBarcode?: string;
  onOpenGoldenTicket?: () => void;
}

export interface BarcodeItem {
  code: string;
  label: string;
  type: string;
  lrCode?: string;
  crLabel?: string;
}

export const PlancheEtiquettesView: React.FC<PlancheEtiquettesViewProps> = ({
  inventory = [],
  locations = [],
  missions = [],
  distractions = [],
  goldenTicketBarcode = 'ART-GT25-VIP',
  onOpenGoldenTicket
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [printerMode, setPrinterMode] = useState<'a4' | 'zebra'>('zebra');
  const [a4Columns, setA4Columns] = useState<2 | 3>(2); // 2 colonnes par défaut en A4 = codes longs 100% scannables
  const [symbology, setSymbology] = useState<BarcodeSymbology>('qr'); // QR Code 2D par défaut : 100% scannable + étiquette design avec le nom
  const [zebraFormatId, setZebraFormatId] = useState<string>('100x50');
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [singleItemToPrint, setSingleItemToPrint] = useState<BarcodeItem | null>(null);

  const activeZebraFormat = useMemo(() => {
    return ZEBRA_FORMATS.find((f) => f.id === zebraFormatId) || ZEBRA_FORMATS[0];
  }, [zebraFormatId]);

  useEffect(() => {
    document.body.classList.remove('diplome-print-mode');
    document.body.classList.remove('printing-single-label');
    document.body.classList.remove('printing-zebra-roll');
    document.body.classList.remove('printing-single-zebra');
    return () => {
      document.body.classList.remove('printing-single-label');
      document.body.classList.remove('printing-zebra-roll');
      document.body.classList.remove('printing-single-zebra');
    };
  }, []);

  // Dynamically compute all barcodes 100% from Supabase (locations, inventory, missions, distractions)
  const allItems = useMemo<BarcodeItem[]>(() => {
    const map = new Map<string, BarcodeItem>();

    // 1. Emplacements depuis la table wms_locations
    if (locations) {
      locations.forEach((loc) => {
        if (!loc.barcode) return;
        map.set(loc.barcode, {
          code: loc.barcode,
          label: loc.label,
          type: 'location',
          lrCode: loc.lrCode || loc.barcode.replace('LOC-', 'LOC_').replace(/[^A-Za-z0-9_]/g, '_'),
          crLabel: loc.crLabel || loc.label.toUpperCase()
        });
      });
    }

    // 2. Articles & emplacements actifs depuis la table wms_inventory
    if (inventory) {
      inventory.forEach((item) => {
        if (item.location && !map.has(item.location)) {
          map.set(item.location, {
            code: item.location,
            label: `Emplacement ${item.location}`,
            type: 'location',
            lrCode: item.location.replace('LOC-', 'LOC_').replace(/[^A-Za-z0-9_]/g, '_'),
            crLabel: item.location.toUpperCase()
          });
        }
        if (item.sku && !map.has(item.sku)) {
          map.set(item.sku, {
            code: item.sku,
            label: `${item.name} [${item.sku}]`,
            type: item.itemType || 'article',
            lrCode: item.lrCode || item.sku.replace('ART-', 'REF_').replace(/[^A-Za-z0-9_]/g, '_'),
            crLabel: item.crLabel || item.name.toUpperCase()
          });
        }
      });
    }

    // 3. Étapes de missions depuis la table wms_missions
    if (missions) {
      missions.forEach((m) => {
        m.steps.forEach((s) => {
          if (s.expectedBarcode && !map.has(s.expectedBarcode)) {
            map.set(s.expectedBarcode, {
              code: s.expectedBarcode,
              label: s.targetLabel || s.expectedBarcode,
              type: s.barcodeType || 'article',
              lrCode: s.lrCode || s.expectedBarcode.replace(/^(ART|LOC)-/, '').replace(/[^A-Za-z0-9_]/g, '_'),
              crLabel: s.crLabel || (s.targetLabel || s.expectedBarcode).toUpperCase()
            });
          }
        });
      });
    }

    // 4. Aléas & distractions depuis la table distractions
    if (distractions && distractions.length > 0) {
      distractions.forEach((d) => {
        if (d.expected_barcode && !map.has(d.expected_barcode)) {
          map.set(d.expected_barcode, {
            code: d.expected_barcode,
            label: `⚡ ALÉA : ${d.barcode_label || d.title}`,
            type: 'seal',
            lrCode: 'ALEA_URG',
            crLabel: (d.barcode_label || d.title).toUpperCase()
          });
        }
      });
    }

    // 5. Ticket d'Or configurable depuis app_config.golden_ticket_barcode
    if (goldenTicketBarcode && !map.has(goldenTicketBarcode)) {
      map.set(goldenTicketBarcode, {
        code: goldenTicketBarcode,
        label: '🎟️ TICKET D\'OR • Archive Collector 25 Ans',
        type: 'golden_ticket',
        lrCode: 'GT_25ANS',
        crLabel: 'TICKET D OR 25 ANS'
      });
    }

    return Array.from(map.values());
  }, [locations, inventory, missions, distractions, goldenTicketBarcode]);

  const items = useMemo(() => {
    if (filterType === 'all') return allItems;
    if (filterType === 'package_dock') {
      return allItems.filter((i) => i.type === 'package' || i.type === 'dock');
    }
    if (filterType === 'golden_ticket') {
      return allItems.filter((i) => i.type === 'golden_ticket' || i.code === 'ART-GT25-VIP');
    }
    return allItems.filter((i) => i.type === filterType);
  }, [allItems, filterType]);

  // Counts by type
  const counts = useMemo(() => {
    return {
      all: allItems.length,
      location: allItems.filter((i) => i.type === 'location').length,
      article: allItems.filter((i) => i.type === 'article').length,
      package_dock: allItems.filter((i) => i.type === 'package' || i.type === 'dock').length,
      seal: allItems.filter((i) => i.type === 'seal').length,
      golden_ticket: allItems.filter((i) => i.type === 'golden_ticket' || i.code === 'ART-GT25-VIP').length
    };
  }, [allItems]);

  // Selection helpers
  const toggleSelectCode = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const selectByCategory = (cat: 'visible' | 'none' | 'location' | 'article' | 'package_dock' | 'seal') => {
    if (cat === 'none') {
      setSelectedCodes(new Set());
      return;
    }
    if (cat === 'visible') {
      setSelectedCodes(new Set(items.map((i) => i.code)));
      return;
    }
    setFilterType('all');
    if (cat === 'package_dock') {
      setSelectedCodes(new Set(allItems.filter((i) => i.type === 'package' || i.type === 'dock').map((i) => i.code)));
    } else {
      setSelectedCodes(new Set(allItems.filter((i) => i.type === cat).map((i) => i.code)));
    }
  };

  // How many visible labels will actually be printed
  const effectivePrintCount = useMemo(() => {
    if (selectedCodes.size === 0) return items.length;
    return items.filter((i) => selectedCodes.has(i.code)).length;
  }, [items, selectedCodes]);

  const longCodesCount = useMemo(
    () => items.filter((i) => sanitizeForCode128(i.code).length > 18).length,
    [items]
  );

  const handlePrintSheet = (type?: string) => {
    if (type) {
      setFilterType(type);
    }
    document.body.classList.remove('diplome-print-mode');
    document.body.classList.remove('printing-single-label');
    document.body.classList.remove('printing-single-zebra');

    if (printerMode === 'zebra') {
      const selectedFormat = activeZebraFormat;

      let styleTag = document.getElementById('zebra-dynamic-page-size') as HTMLStyleElement | null;
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'zebra-dynamic-page-size';
        document.head.appendChild(styleTag);
      }
      styleTag.innerHTML = `
        @media print {
          @page {
            size: ${selectedFormat.width} ${selectedFormat.height} !important;
            margin: 0mm !important;
          }
        }
      `;

      document.documentElement.style.setProperty('--zebra-width', selectedFormat.width);
      document.documentElement.style.setProperty('--zebra-height', selectedFormat.height);
      document.body.classList.add('printing-zebra-roll');

      const cleanUp = () => {
        document.body.classList.remove('printing-zebra-roll');
        if (styleTag && styleTag.parentNode) {
          styleTag.parentNode.removeChild(styleTag);
        }
        window.removeEventListener('afterprint', cleanUp);
      };

      window.addEventListener('afterprint', cleanUp);
      setTimeout(() => {
        window.print();
      }, 80);
    } else {
      document.body.classList.remove('printing-zebra-roll');
      setTimeout(() => {
        window.print();
      }, 50);
    }
  };

  const handlePrintSingle = (item: BarcodeItem) => {
    setSingleItemToPrint(item);
  };

  const executeSinglePrintA4 = () => {
    document.body.classList.remove('diplome-print-mode');
    document.body.classList.remove('printing-zebra-roll');
    document.body.classList.remove('printing-single-zebra');
    document.body.classList.add('printing-single-label');
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const executeSinglePrintZebra = () => {
    const selectedFormat = activeZebraFormat;
    let styleTag = document.getElementById('zebra-dynamic-page-size') as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'zebra-dynamic-page-size';
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `
      @media print {
        @page {
          size: ${selectedFormat.width} ${selectedFormat.height} !important;
          margin: 0mm !important;
        }
      }
    `;

    document.documentElement.style.setProperty('--zebra-width', selectedFormat.width);
    document.documentElement.style.setProperty('--zebra-height', selectedFormat.height);
    document.body.classList.remove('diplome-print-mode');
    document.body.classList.remove('printing-zebra-roll');
    document.body.classList.remove('printing-single-label');
    document.body.classList.add('printing-single-zebra');

    const cleanUp = () => {
      document.body.classList.remove('printing-single-zebra');
      if (styleTag && styleTag.parentNode) {
        styleTag.parentNode.removeChild(styleTag);
      }
      window.removeEventListener('afterprint', cleanUp);
    };

    window.addEventListener('afterprint', cleanUp);
    setTimeout(() => {
      window.print();
    }, 80);
  };

  const closeSinglePrint = () => {
    document.body.classList.remove('printing-single-label');
    document.body.classList.remove('printing-single-zebra');
    document.body.classList.remove('printing-zebra-roll');
    setSingleItemToPrint(null);
  };

  return (
    <div className="min-h-[calc(100vh-65px)] p-4 flex flex-col gap-4 print:min-h-0 print:p-0 print:m-0 print:block print:w-full">
      {/* Top Controls Banner (hidden on print) */}
      <div className="no-print bg-white rounded-2xl p-5 border border-slate-200 flex flex-col gap-4 shadow-sm shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                ÉTIQUETTES DE STOCK OFFICIELLES GT LOGISTICS
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {items.length} affichées
              </span>
              {selectedCodes.size > 0 && (
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-xs">
                  ✓ {effectivePrintCount} sélectionnée(s) à imprimer
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Code-128 haute netteté avec <strong>zones blanches de garde (Quiet Zones)</strong>, rendu vectoriel <code>crispEdges</code> anti-flou thermique et option <strong>QR Code hybride</strong> pour les codes longs.
            </p>
          </div>

          {/* Main Print Button */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handlePrintSheet()}
              disabled={effectivePrintCount === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>
                {selectedCodes.size > 0
                  ? printerMode === 'zebra'
                    ? `Imprimer la sélection (${effectivePrintCount}) sur Zebra`
                    : `Imprimer la sélection (${effectivePrintCount}) en A4`
                  : printerMode === 'zebra'
                    ? `Imprimer les ${items.length} étiquettes sur Zebra ZD421d`
                    : `Imprimer la planche A4 (${items.length} étiquettes)`}
              </span>
            </button>
          </div>
        </div>

        {/* PRINTER HARDWARE + SCANNABILITY CONFIGURATION PANEL */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <span className="text-xs font-mono font-bold uppercase text-slate-700 flex items-center">
                <Sliders className="w-4 h-4 mr-1.5 text-blue-600" />
                Imprimante :
              </span>

              <div className="flex items-center rounded-xl bg-white p-1 border border-slate-300 shadow-xs">
                <button
                  type="button"
                  onClick={() => setPrinterMode('zebra')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center space-x-1.5 transition-all cursor-pointer ${
                    printerMode === 'zebra'
                      ? 'bg-[#0c1e3a] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Rouleau Zebra ZD421d</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrinterMode('a4')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center space-x-1.5 transition-all cursor-pointer ${
                    printerMode === 'a4'
                      ? 'bg-[#0c1e3a] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Feuille Standard A4</span>
                </button>
              </div>
            </div>

            {/* Format selection (Zebra size OR A4 2-col vs 3-col) */}
            {printerMode === 'zebra' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 font-medium whitespace-nowrap">Format Rouleau :</span>
                <select
                  value={zebraFormatId}
                  onChange={(e) => setZebraFormatId(e.target.value)}
                  className="bg-white border border-slate-300 text-slate-900 text-xs font-bold font-mono px-3 py-1.5 rounded-lg focus:outline-none focus:border-blue-600 cursor-pointer shadow-xs"
                >
                  {ZEBRA_FORMATS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 font-bold">Densité A4 :</span>
                <div className="flex items-center rounded-xl bg-white p-1 border border-slate-300 text-xs">
                  <button
                    type="button"
                    onClick={() => setA4Columns(2)}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                      a4Columns === 2 ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    2 col. Large (Recommandé)
                  </button>
                  <button
                    type="button"
                    onClick={() => setA4Columns(3)}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                      a4Columns === 3 ? 'bg-[#0c1e3a] text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    3 col. Compact
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Symbology / Scannability Mode Bar */}
          <div className="pt-2.5 border-t border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase text-slate-700 flex items-center">
                <ScanBarcode className="w-4 h-4 mr-1.5 text-emerald-600" />
                Type de Code Scannable :
              </span>

              <div className="flex flex-wrap items-center rounded-xl bg-white p-1 border border-slate-300 gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSymbology('qr')}
                  className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    symbology === 'qr' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR Code Design (Recommandé • 100% Scannable)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSymbology('hybrid')}
                  className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    symbology === 'hybrid'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Code-128 + QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSymbology('code128')}
                  className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    symbology === 'code128' ? 'bg-[#0c1e3a] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ScanBarcode className="w-3.5 h-3.5" />
                  <span>Code-128 Classique</span>
                </button>
              </div>
            </div>

            {longCodesCount > 0 && symbology === 'code128' && (
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  {longCodesCount} code(s) long(s) (&gt;18 car.) : utilisez <strong>A4 2 col.</strong>, <strong>Zebra 100×50</strong> ou <strong>Code-128 + QR</strong>.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* MULTI-SELECTION TOOLBAR (SELECT SPECIFIC LABELS OR CATEGORIES TO PRINT) */}
        <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono font-black uppercase text-[11px] text-blue-900 mr-1 flex items-center gap-1">
              <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
              Sélection rapide à imprimer :
            </span>

            <button
              type="button"
              onClick={() => selectByCategory('location')}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-600 hover:text-white text-blue-900 border border-blue-300 font-bold cursor-pointer transition-all"
            >
              📍 Uniquement Emplacements ({counts.location})
            </button>

            <button
              type="button"
              onClick={() => selectByCategory('article')}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-600 hover:text-white text-blue-900 border border-blue-300 font-bold cursor-pointer transition-all"
            >
              📦 Uniquement Articles ({counts.article})
            </button>

            {counts.package_dock > 0 && (
              <button
                type="button"
                onClick={() => selectByCategory('package_dock')}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-600 hover:text-white text-blue-900 border border-blue-300 font-bold cursor-pointer transition-all"
              >
                📫 Colis & Quais ({counts.package_dock})
              </button>
            )}

            {counts.seal > 0 && (
              <button
                type="button"
                onClick={() => selectByCategory('seal')}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-600 hover:text-white text-blue-900 border border-blue-300 font-bold cursor-pointer transition-all"
              >
                ⚡ Aléas ({counts.seal})
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => selectByCategory('visible')}
              className="px-2.5 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold cursor-pointer"
            >
              Tout cocher
            </button>
            {selectedCodes.size > 0 && (
              <button
                type="button"
                onClick={() => selectByCategory('none')}
                className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold cursor-pointer"
              >
                Tout décocher ({selectedCodes.size})
              </button>
            )}
          </div>
        </div>

        {/* Categories / Type Display Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-600 font-bold uppercase text-[11px] mr-2 flex items-center font-mono">
              <Filter className="w-3.5 h-3.5 mr-1 text-blue-600" />
              Afficher :
            </span>

            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-[#0c1e3a] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:text-slate-950 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Tous ({counts.all})
            </button>

            <button
              onClick={() => setFilterType('article')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filterType === 'article'
                  ? 'bg-[#0c1e3a] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:text-slate-950 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              📦 Articles & Stock ({counts.article})
            </button>

            <button
              onClick={() => setFilterType('location')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filterType === 'location'
                  ? 'bg-[#0c1e3a] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:text-slate-950 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              📍 Emplacements ({counts.location})
            </button>

            <button
              onClick={() => setFilterType('package_dock')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filterType === 'package_dock'
                  ? 'bg-[#0c1e3a] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:text-slate-950 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              📫 Colis & Quais ({counts.package_dock})
            </button>

            {counts.seal > 0 && (
              <button
                onClick={() => setFilterType('seal')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterType === 'seal'
                    ? 'bg-[#0c1e3a] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:text-slate-950 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                ⚡ Aléas ({counts.seal})
              </button>
            )}

            {counts.golden_ticket > 0 && (
              <button
                onClick={() => setFilterType('golden_ticket')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  filterType === 'golden_ticket'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md ring-2 ring-amber-300'
                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300'
                }`}
              >
                <span>🎟️ Ticket d&apos;Or ({counts.golden_ticket})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {onOpenGoldenTicket && (
              <button
                onClick={onOpenGoldenTicket}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-amber-950 font-black text-xs flex items-center space-x-1.5 border border-amber-500/60 shadow-sm transition-all cursor-pointer"
                title="Prévisualiser le Ticket d'Or des 25 Ans"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-800" />
                <span>Tester Pop-up Ticket d&apos;Or</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Printable Sheet */}
      <div
        id="printable-sheet"
        className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 max-w-5xl mx-auto w-full print:m-0 print:p-0 print:shadow-none print:w-full print:border-none print:block print:visible"
      >
        {/* Header of the sheet (hidden in Zebra roll print mode) */}
        <div className="sheet-header border-b-2 border-gray-900 pb-3 mb-6 flex justify-between items-end">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black uppercase tracking-widest text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 font-mono">
                GT LOGISTICS • ÉDITION 25 ANS
              </span>
              <span className="text-xs font-bold text-gray-500 font-mono">SITE CEA GRENOBLE</span>
            </div>
            <h1 className="text-2xl font-black text-gray-950 tracking-tight mt-1 font-mono">
              PLANCHE D&apos;ÉTIQUETTES DE STOCK OFFICIELLES
            </h1>
            <p className="text-xs text-gray-600 font-mono">
              Modèle haute scannabilité GT Logistics • {symbology === 'qr' ? 'QR Code' : symbology === 'hybrid' ? 'Code-128 + QR Code' : 'Code-128 Haute Netteté'}
            </p>
          </div>
          <div className="text-right font-mono text-xs text-gray-500">
            <span className="block font-bold text-gray-900 text-sm">
              {effectivePrintCount} Étiquette{effectivePrintCount > 1 ? 's' : ''}
            </span>
            <span>
              {printerMode === 'zebra'
                ? `Rouleau Zebra (${activeZebraFormat.name.split(' ')[0]} mm)`
                : `Format A4 (${a4Columns} colonnes)`}
            </span>
          </div>
        </div>

        {/* Labels Grid / Roll Feed */}
        <div
          className={`grid gap-3 ${
            a4Columns === 2
              ? 'a4-cols-2 grid-cols-1 sm:grid-cols-2 print:grid-cols-2'
              : 'grid-cols-2 md:grid-cols-3 print:grid-cols-3'
          }`}
        >
          {items.map((item) => {
            const isSelected = selectedCodes.has(item.code);
            const isExcludedFromPrint = selectedCodes.size > 0 && !isSelected;
            const codeLen = sanitizeForCode128(item.code).length;
            const isLongRisk = codeLen > 18 && symbology === 'code128' && printerMode === 'a4' && a4Columns === 3;

            return (
              <div
                key={item.code}
                className={`zebra-label-item group relative bg-white rounded-xl p-2.5 transition-all flex flex-col justify-between shadow-xs print:border-none print:break-inside-avoid ${
                  isExcludedFromPrint
                    ? 'print-exclude opacity-45 border border-slate-200 hover:opacity-80'
                    : isSelected
                      ? 'border-2 border-blue-600 ring-2 ring-blue-500/20'
                      : 'border border-gray-300 hover:border-amber-500'
                }`}
              >
                {/* Top Selection & Scannability Row (screen only) */}
                <div className="no-print w-full flex items-center justify-between mb-1.5 gap-1">
                  <button
                    type="button"
                    onClick={() => toggleSelectCode(item.code)}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-blue-50 text-slate-700 border border-slate-200'
                    }`}
                    title="Cocher pour inclure dans l'impression groupée"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-3 h-3" />
                    ) : (
                      <Square className="w-3 h-3 text-slate-400" />
                    )}
                    <span>{isSelected ? 'Sélectionnée' : 'Sélectionner'}</span>
                  </button>

                  {isLongRisk ? (
                    <span
                      className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300"
                      title="Code long : passez en 2 colonnes A4 ou en mode Code-128 + QR pour une lecture garantie"
                    >
                      ⚠️ {codeLen} car.
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Scannable
                    </span>
                  )}
                </div>

                {/* Authentic GT Stock Label Component */}
                <GtStockLabel
                  barcode={item.code}
                  displayName={item.label}
                  lrCode={item.lrCode}
                  crLabel={item.crLabel}
                  type={item.type}
                  size={printerMode === 'zebra' ? 'zebra' : a4Columns === 2 ? 'large' : 'standard'}
                  symbology={symbology}
                  className="w-full"
                />

                {/* Action: Single print button (screen only) */}
                <div className="no-print w-full flex items-center justify-between mt-2 pt-1 border-t border-gray-100">
                  <span className="text-[9px] font-mono font-bold text-gray-500 uppercase">
                    {item.type === 'location'
                      ? '📍 Emplacement'
                      : item.type === 'package'
                        ? '📫 Colis'
                        : item.type === 'seal'
                          ? '⚡ Aléa'
                          : '📦 Article'}
                  </span>

                  <button
                    onClick={() => handlePrintSingle(item)}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-[#0c1e3a] text-slate-700 hover:text-white font-bold text-[10px] border border-slate-300 transition-all flex items-center space-x-1 cursor-pointer font-mono"
                    title="Imprimer cette étiquette individuellement"
                  >
                    <Printer className="w-3 h-3 text-amber-500" />
                    <span>Imprimer seule</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer (hidden in Zebra roll print mode) */}
        <div className="sheet-footer mt-8 pt-4 border-t border-gray-300 flex justify-between items-center text-xs text-gray-500 font-mono">
          <span>© GT Logistics • Modèle d&apos;Étiquetage Officiel WMS</span>
          <span>Édition 25 Ans • CEA Grenoble</span>
        </div>
      </div>

      {/* ========================================================
          SINGLE LABEL PRINT MODAL & ISOLATED PRINT CARD
          ======================================================== */}
      {singleItemToPrint && (
        <div className="single-label-modal-wrapper fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:static print:inset-auto print:bg-white print:p-0 print:m-0 print:block print:w-full">
          <div className="single-label-modal-box bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-center print:bg-white print:border-none print:p-0 print:m-0 print:shadow-none print:max-w-none print:w-full print:block">
            <button
              onClick={closeSinglePrint}
              className="no-print absolute top-4 right-4 p-2 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="no-print mb-4 text-left">
              <div className="flex items-center space-x-2 text-blue-700">
                <Tag className="w-5 h-5" />
                <h3 className="text-base font-black text-slate-900">Impression d&apos;Étiquette Unitaire GT Logistics</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Choisissez votre matériel pour imprimer cette étiquette seule :
              </p>
            </div>

            <div
              id="single-label-print-card"
              className="bg-white text-slate-950 p-4 rounded-xl border-2 border-dashed border-gray-500 shadow-md my-4 flex flex-col items-center justify-center text-center print:border-none print:m-0 print:p-2 print:w-full print:mx-auto"
            >
              <GtStockLabel
                barcode={singleItemToPrint.code}
                displayName={singleItemToPrint.label}
                lrCode={singleItemToPrint.lrCode}
                crLabel={singleItemToPrint.crLabel}
                type={singleItemToPrint.type}
                size="large"
                symbology={symbology}
                className="w-full"
              />
            </div>

            <div className="no-print mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={closeSinglePrint}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Annuler
              </button>

              <button
                onClick={executeSinglePrintZebra}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center space-x-2 shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Sortir sur Zebra ({activeZebraFormat.width}×{activeZebraFormat.height})</span>
              </button>

              <button
                onClick={executeSinglePrintA4}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center space-x-2 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Imprimer sur Papier A4</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
