import React, { useEffect, useMemo, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { InventoryItem, Mission, Distraction } from '../types';
import { BARCODE_CATALOG } from '../data/initialData';
import { Printer, Scissors, Filter, Sparkles, CheckCircle2, X, Eye, Tag } from 'lucide-react';

interface PlancheEtiquettesViewProps {
  inventory?: InventoryItem[];
  missions?: Mission[];
  distractions?: Distraction[];
}

interface BarcodeItem {
  code: string;
  label: string;
  type: string;
}

export const PlancheEtiquettesView: React.FC<PlancheEtiquettesViewProps> = ({
  inventory,
  missions,
  distractions
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [singleItemToPrint, setSingleItemToPrint] = useState<BarcodeItem | null>(null);

  useEffect(() => {
    document.body.classList.remove('diplome-print-mode');
    document.body.classList.remove('printing-single-label');
    return () => {
      document.body.classList.remove('printing-single-label');
    };
  }, []);

  // Dynamically compute all barcodes needed from inventory, missions and distractions
  const allItems = useMemo<BarcodeItem[]>(() => {
    if (!inventory || !missions) return BARCODE_CATALOG;

    const map = new Map<string, BarcodeItem>();

    // 1. Locations and articles from inventory
    inventory.forEach((item) => {
      if (item.location && !map.has(item.location)) {
        map.set(item.location, {
          code: item.location,
          label: `Emplacement ${item.location} (${item.name})`,
          type: 'location'
        });
      }
      if (item.sku && !map.has(item.sku)) {
        map.set(item.sku, {
          code: item.sku,
          label: `${item.name} [${item.sku}]`,
          type: 'article'
        });
      }
    });

    // 2. Mission steps
    missions.forEach((m) => {
      m.steps.forEach((s) => {
        if (!map.has(s.expectedBarcode)) {
          map.set(s.expectedBarcode, {
            code: s.expectedBarcode,
            label: s.targetLabel || s.expectedBarcode,
            type: s.barcodeType || 'article'
          });
        }
      });
    });

    // 3. Emergency & Distraction barcodes (e.g. Aléas Stand)
    if (distractions && distractions.length > 0) {
      distractions.forEach((d) => {
        if (d.expected_barcode && !map.has(d.expected_barcode)) {
          map.set(d.expected_barcode, {
            code: d.expected_barcode,
            label: `⚡ ALÉA : ${d.barcode_label || d.title}`,
            type: 'seal'
          });
        }
      });
    }

    // Merge with any base catalog items
    BARCODE_CATALOG.forEach((bc) => {
      if (!map.has(bc.code)) {
        map.set(bc.code, bc);
      }
    });

    return Array.from(map.values());
  }, [inventory, missions, distractions]);

  const items = useMemo(() => {
    if (filterType === 'all') return allItems;
    if (filterType === 'package_dock') {
      return allItems.filter((i) => i.type === 'package' || i.type === 'dock');
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
      seal: allItems.filter((i) => i.type === 'seal').length
    };
  }, [allItems]);

  // Generate barcodes in the grid
  useEffect(() => {
    items.forEach((item) => {
      const el = document.getElementById(`barcode-svg-${item.code}`);
      if (el) {
        try {
          JsBarcode(el, item.code, {
            format: 'CODE128',
            lineColor: '#000000',
            width: 2.0,
            height: 50,
            displayValue: true,
            fontSize: 13,
            font: 'monospace',
            fontOptions: 'bold',
            margin: 6
          });
        } catch {
          // Fallback
        }
      }
    });
  }, [items]);

  // Generate barcode in single print preview
  useEffect(() => {
    if (singleItemToPrint) {
      const el = document.getElementById(`single-barcode-svg-${singleItemToPrint.code}`);
      if (el) {
        try {
          JsBarcode(el, singleItemToPrint.code, {
            format: 'CODE128',
            lineColor: '#000000',
            width: 2.4,
            height: 64,
            displayValue: true,
            fontSize: 15,
            font: 'monospace',
            fontOptions: 'bold',
            margin: 8
          });
        } catch {
          // Fallback
        }
      }
    }
  }, [singleItemToPrint]);

  const handlePrintSheet = (type?: string) => {
    if (type) {
      setFilterType(type);
    }
    document.body.classList.remove('diplome-print-mode');
    document.body.classList.remove('printing-single-label');
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const handlePrintSingle = (item: BarcodeItem) => {
    setSingleItemToPrint(item);
  };

  const executeSinglePrint = () => {
    document.body.classList.remove('printing-labels');
    document.body.classList.add('printing-single-label');
    window.print();
    // Reset after print dialog closes
    setTimeout(() => {
      document.body.classList.remove('printing-single-label');
      document.body.classList.add('printing-labels');
    }, 1000);
  };

  return (
    <div className="min-h-[calc(100vh-65px)] p-4 flex flex-col gap-4 print:min-h-0 print:p-0 print:m-0 print:block print:w-full">
      {/* Top Controls Banner (hidden on print) */}
      <div className="no-print bg-slate-900 rounded-2xl p-5 border border-slate-800 flex flex-col gap-4 shadow-xl shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                IMPRESSION DES ÉTIQUETTES CODE-BARRES PHYSIQUES
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {items.length} étiquettes prêtes
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Imprimez soit la planche complète, soit par catégorie (emplacements, articles, aléas), ou directement chaque étiquette à l'unité.
            </p>
          </div>

          {/* Main Action Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handlePrintSheet()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer cette sélection ({items.length} étiquettes)</span>
            </button>
          </div>
        </div>

        {/* Categories / Type Filters & Direct Print Shortcuts */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-bold uppercase text-[10px] mr-2 flex items-center">
              <Filter className="w-3 h-3 mr-1 text-amber-500" />
              Filtrer par type :
            </span>

            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              Tous ({counts.all})
            </button>

            <button
              onClick={() => setFilterType('location')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filterType === 'location'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              📍 Emplacements seuls ({counts.location})
            </button>

            <button
              onClick={() => setFilterType('article')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filterType === 'article'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              📦 Articles & Pièces ({counts.article})
            </button>

            <button
              onClick={() => setFilterType('package_dock')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filterType === 'package_dock'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              📫 Colis & Quais ({counts.package_dock})
            </button>

            {counts.seal > 0 && (
              <button
                onClick={() => setFilterType('seal')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterType === 'seal'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                ⚡ Aléas & Scellés ({counts.seal})
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-400 italic">
            Astuce : Survolez n'importe quelle étiquette ci-dessous pour l'imprimer seule à l'unité.
          </div>
        </div>
      </div>

      {/* Printable Sheet (Standard A4 White Sheet) */}
      <div
        id="printable-sheet"
        className="bg-white text-slate-900 p-8 rounded-2xl shadow-2xl max-w-5xl mx-auto w-full print:m-0 print:p-2 print:shadow-none print:w-full print:border-none print:block print:visible"
      >
        {/* Header of the sheet */}
        <div className="border-b-2 border-gray-900 pb-4 mb-6 flex justify-between items-end">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black uppercase tracking-widest text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 font-mono">
                GT LOGISTICS • ÉDITION 25 ANS
              </span>
              <span className="text-xs font-bold text-gray-500 font-mono">SITE CEA GRENOBLE</span>
            </div>
            <h1 className="text-2xl font-black text-gray-950 tracking-tight mt-1">
              PLANCHE D'ADRESSAGE & CODES-BARRES RÉELS
            </h1>
            <p className="text-xs text-gray-600 font-mono">
              Codes-barres Code-128 haute lisibilité pour douchette USB, pistolet laser et scannettes Zebra
            </p>
          </div>
          <div className="text-right font-mono text-xs text-gray-500">
            <span className="block font-bold text-gray-900 text-sm">{items.length} Étiquettes</span>
            <span>Format Standard A4 (Découpe manuelle)</span>
          </div>
        </div>

        {/* Labels Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-3">
          {items.map((item) => (
            <div
              key={item.code}
              className="group relative border-2 border-dashed border-gray-400 p-3 rounded-lg flex flex-col items-center justify-between text-center bg-white print:border-gray-500 print:break-inside-avoid shadow-xs hover:border-amber-500 transition-colors"
            >
              {/* Badge type */}
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-300 mb-1 font-mono">
                {item.type === 'location'
                  ? '📍 EMPLACEMENT / TIROIR'
                  : item.type === 'article'
                  ? '📦 ARTICLE / COMPOSANT'
                  : item.type === 'package'
                  ? '📫 COLIS CARTON'
                  : item.type === 'seal'
                  ? '⚡ SCELLÉ / ALÉA'
                  : '⚓ QUAI EXPÉDITION'}
              </span>

              {/* Designation */}
              <p className="text-xs font-bold text-gray-900 mb-2 leading-tight">
                {item.label}
              </p>

              {/* Barcode SVG */}
              <div className="bg-white p-1 rounded border border-gray-200 w-full flex items-center justify-center">
                <svg id={`barcode-svg-${item.code}`} className="max-w-full h-auto"></svg>
              </div>

              {/* Footer of label: cut indicator & single print button */}
              <div className="w-full flex items-center justify-between mt-2 pt-1 border-t border-gray-100">
                <div className="text-[8px] text-gray-500 uppercase font-mono flex items-center space-x-1">
                  <span>✂️</span>
                  <span>Découpe</span>
                </div>

                {/* Single Print Button (visible on screen only) */}
                <button
                  onClick={() => handlePrintSingle(item)}
                  className="no-print px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-500 text-amber-900 hover:text-slate-950 font-bold text-[10px] border border-amber-300 transition-all flex items-center space-x-1 cursor-pointer"
                  title="Imprimer cette étiquette individuellement"
                >
                  <Printer className="w-3 h-3" />
                  <span>Imprimer seule</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-4 border-t border-gray-300 flex justify-between items-center text-xs text-gray-500 font-mono">
          <span>© GT Logistics • Système de Picking & Traçabilité Réseau</span>
          <span>Édition Spéciale 25 Ans de Partenariat CEA</span>
        </div>
      </div>

      {/* ========================================================
          SINGLE LABEL PRINT MODAL & ISOLATED PRINT CARD
          ======================================================== */}
      {singleItemToPrint && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-center">
            {/* Close Button */}
            <button
              onClick={() => setSingleItemToPrint(null)}
              className="no-print absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="no-print mb-4 text-left">
              <div className="flex items-center space-x-2 text-amber-400">
                <Tag className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Impression d'Étiquette Unitaire</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Aperçu haute fidélité pour impression individuelle (format sticker ou feuille centrée) :
              </p>
            </div>

            {/* The Actual Isolated Single Label for Printing */}
            <div
              id="single-label-print-card"
              className="bg-white text-slate-950 p-6 rounded-2xl border-2 border-dashed border-gray-500 shadow-md my-4 flex flex-col items-center justify-center text-center"
            >
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 font-mono">
                  GT LOGISTICS • 25 ANS
                </span>
                <span className="text-[9px] font-bold text-gray-600 uppercase font-mono">
                  {singleItemToPrint.type === 'location' ? '📍 EMPLACEMENT' : '📦 ARTICLE'}
                </span>
              </div>

              <h4 className="text-sm sm:text-base font-extrabold text-gray-950 mb-3 max-w-sm leading-tight">
                {singleItemToPrint.label}
              </h4>

              <div className="bg-white p-2 rounded border border-gray-300 mb-2 w-full flex items-center justify-center">
                <svg id={`single-barcode-svg-${singleItemToPrint.code}`} className="max-w-full h-auto"></svg>
              </div>

              <div className="text-[9px] font-mono text-gray-500 flex justify-between w-full px-2 mt-1">
                <span>Réf: {singleItemToPrint.code}</span>
                <span>CEA GRENOBLE</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="no-print mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setSingleItemToPrint(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Annuler
              </button>

              <button
                onClick={executeSinglePrint}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs flex items-center space-x-2 shadow-lg shadow-amber-500/25 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Lancer l'impression de cette étiquette</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
