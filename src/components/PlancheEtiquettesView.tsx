import React, { useEffect, useMemo, useState } from 'react';
import { InventoryItem, Mission, Distraction, WarehouseLocation } from '../types';
import { BARCODE_CATALOG, BarcodeItemCatalog, INITIAL_LOCATIONS } from '../data/initialData';
import { Printer, Filter, X, Tag } from 'lucide-react';
import { GtStockLabel } from './GtStockLabel';

interface PlancheEtiquettesViewProps {
  inventory?: InventoryItem[];
  locations?: WarehouseLocation[];
  missions?: Mission[];
  distractions?: Distraction[];
}

export interface BarcodeItem {
  code: string;
  label: string;
  type: string;
  lrCode?: string;
  crLabel?: string;
}

export const PlancheEtiquettesView: React.FC<PlancheEtiquettesViewProps> = ({
  inventory,
  locations = INITIAL_LOCATIONS,
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

  // Dynamically compute all barcodes needed from inventory, locations, missions and distractions
  const allItems = useMemo<BarcodeItem[]>(() => {
    const map = new Map<string, BarcodeItem>();

    // 0. Emplacements configurés par l'utilisateur en priorité
    if (locations) {
      locations.forEach((loc) => {
        map.set(loc.barcode, {
          code: loc.barcode,
          label: loc.label,
          type: 'location',
          lrCode: loc.lrCode || loc.barcode.replace('LOC-', 'LOC_').replace(/-/g, '_'),
          crLabel: loc.crLabel || loc.label.toUpperCase()
        });
      });
    }

    // 1. Base catalog first (with official GT reference lines L/R & C/R)
    BARCODE_CATALOG.forEach((bc: BarcodeItemCatalog) => {
      if (!map.has(bc.code)) {
        map.set(bc.code, {
          code: bc.code,
          label: bc.label,
          type: bc.type,
          lrCode: bc.lrCode || bc.code.replace(/^(ART|LOC)-/, '').replace(/-/g, '_'),
          crLabel: bc.crLabel || bc.label.toUpperCase()
        });
      }
    });

    // 2. Locations and articles from active inventory
    if (inventory) {
      inventory.forEach((item) => {
        if (item.location && !map.has(item.location)) {
          map.set(item.location, {
            code: item.location,
            label: `Emplacement ${item.location} (${item.name})`,
            type: 'location',
            lrCode: item.location.replace('LOC-', 'LOC_').replace(/-/g, '_'),
            crLabel: `EMPLACEMENT ${item.name.toUpperCase()}`
          });
        }
        if (item.sku && !map.has(item.sku)) {
          map.set(item.sku, {
            code: item.sku,
            label: `${item.name} [${item.sku}]`,
            type: 'article',
            lrCode: item.lrCode || item.sku.replace('ART-', 'REF_').replace(/-/g, '_'),
            crLabel: item.crLabel || item.name.toUpperCase()
          });
        }
      });
    }

    // 3. Mission steps
    if (missions) {
      missions.forEach((m) => {
        m.steps.forEach((s) => {
          if (!map.has(s.expectedBarcode)) {
            map.set(s.expectedBarcode, {
              code: s.expectedBarcode,
              label: s.targetLabel || s.expectedBarcode,
              type: s.barcodeType || 'article',
              lrCode: s.lrCode || s.expectedBarcode.replace(/^(ART|LOC)-/, '').replace(/-/g, '_'),
              crLabel: s.crLabel || s.targetLabel.toUpperCase()
            });
          }
        });
      });
    }

    // 4. Emergency & Distraction barcodes (e.g. Aléas Stand)
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
    document.body.classList.remove('diplome-print-mode');
    document.body.classList.add('printing-single-label');
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const closeSinglePrint = () => {
    document.body.classList.remove('printing-single-label');
    setSingleItemToPrint(null);
  };

  return (
    <div className="min-h-[calc(100vh-65px)] p-4 flex flex-col gap-4 print:min-h-0 print:p-0 print:m-0 print:block print:w-full">
      {/* Top Controls Banner (hidden on print) */}
      <div className="no-print bg-slate-900 rounded-2xl p-5 border border-slate-800 flex flex-col gap-4 shadow-xl shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                ÉTIQUETTES DE STOCK OFFICIELLES GT LOGISTICS
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {items.length} étiquettes au format officiel GT
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Modèle conforme à vos étiquettes de stock réelles : Logo GT officiel rouge & bleu, Code-128, lignes <strong>L/R</strong> (référence abrégée) et <strong>C/R</strong> (désignation industrielle).
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

        {/* Categories / Type Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-bold uppercase text-[10px] mr-2 flex items-center font-mono">
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
              onClick={() => setFilterType('article')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filterType === 'article'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              📦 Articles & Stock ({counts.article})
            </button>

            <button
              onClick={() => setFilterType('location')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filterType === 'location'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              📍 Emplacements & Tiroirs ({counts.location})
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
            Astuce : Chaque étiquette reproduit fidèlement le modèle thermique GT Logistics.
          </div>
        </div>
      </div>

      {/* Printable Sheet (Standard A4 White Sheet) */}
      <div
        id="printable-sheet"
        className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-2xl max-w-5xl mx-auto w-full print:m-0 print:p-2 print:shadow-none print:w-full print:border-none print:block print:visible"
      >
        {/* Header of the sheet */}
        <div className="border-b-2 border-gray-900 pb-3 mb-6 flex justify-between items-end">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black uppercase tracking-widest text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 font-mono">
                GT LOGISTICS • ÉDITION 25 ANS
              </span>
              <span className="text-xs font-bold text-gray-500 font-mono">SITE CEA GRENOBLE</span>
            </div>
            <h1 className="text-2xl font-black text-gray-950 tracking-tight mt-1 font-mono">
              PLANCHE D'ÉTIQUETTES DE STOCK OFFICIELLES
            </h1>
            <p className="text-xs text-gray-600 font-mono">
              Modèle conforme GT Logistics avec Code-128, Référence, L/R et C/R
            </p>
          </div>
          <div className="text-right font-mono text-xs text-gray-500">
            <span className="block font-bold text-gray-900 text-sm">{items.length} Étiquettes</span>
            <span>Format Standard A4 (Grille 3 colonnes)</span>
          </div>
        </div>

        {/* Labels Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2.5">
          {items.map((item) => (
            <div
              key={item.code}
              className="group relative bg-white border border-gray-300 hover:border-amber-500 rounded-xl p-2.5 transition-all flex flex-col justify-between shadow-xs print:border-dashed print:border-gray-500 print:break-inside-avoid"
            >
              {/* Authentic GT Stock Label Component */}
              <GtStockLabel
                barcode={item.code}
                lrCode={item.lrCode}
                crLabel={item.crLabel}
                type={item.type}
                size="standard"
                className="w-full"
              />

              {/* Action: Single print button (screen only) */}
              <div className="no-print w-full flex items-center justify-between mt-2 pt-1 border-t border-gray-100">
                <span className="text-[9px] font-mono font-bold text-gray-500 uppercase">
                  {item.type === 'location' ? '📍 Emplacement' : item.type === 'package' ? '📫 Colis' : '📦 Article'}
                </span>

                <button
                  onClick={() => handlePrintSingle(item)}
                  className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-500 text-amber-900 hover:text-slate-950 font-bold text-[10px] border border-amber-300 transition-all flex items-center space-x-1 cursor-pointer font-mono"
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
          <span>© GT Logistics • Modèle d'Étiquetage Officiel WMS</span>
          <span>Édition 25 Ans • CEA Grenoble</span>
        </div>
      </div>

      {/* ========================================================
          SINGLE LABEL PRINT MODAL & ISOLATED PRINT CARD
          ======================================================== */}
      {singleItemToPrint && (
        <div className="single-label-modal-wrapper fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 print:static print:inset-auto print:bg-white print:p-0 print:m-0 print:block print:w-full">
          <div className="single-label-modal-box bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-center print:bg-white print:border-none print:p-0 print:m-0 print:shadow-none print:max-w-none print:w-full print:block">
            {/* Close Button */}
            <button
              onClick={closeSinglePrint}
              className="no-print absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="no-print mb-4 text-left">
              <div className="flex items-center space-x-2 text-amber-400">
                <Tag className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Impression d'Étiquette Unitaire GT Logistics</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Aperçu de l'étiquette au format standard thermique ou feuille centrée :
              </p>
            </div>

            {/* The Actual Isolated Single Label for Printing */}
            <div
              id="single-label-print-card"
              className="bg-white text-slate-950 p-4 rounded-xl border-2 border-dashed border-gray-500 shadow-md my-4 flex flex-col items-center justify-center text-center print:border-2 print:border-dashed print:border-black print:m-0 print:p-6 print:w-[110mm] print:mx-auto"
            >
              <GtStockLabel
                barcode={singleItemToPrint.code}
                lrCode={singleItemToPrint.lrCode}
                crLabel={singleItemToPrint.crLabel}
                type={singleItemToPrint.type}
                size="large"
                className="w-full"
              />
            </div>

            {/* Modal Actions */}
            <div className="no-print mt-6 flex items-center justify-center gap-3">
              <button
                onClick={closeSinglePrint}
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
