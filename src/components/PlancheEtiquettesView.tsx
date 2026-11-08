import React, { useEffect, useRef, useMemo } from 'react';
import JsBarcode from 'jsbarcode';
import { InventoryItem, Mission, Distraction } from '../types';
import { BARCODE_CATALOG } from '../data/initialData';
import { Printer, Download, Sparkles, Scissors, Info } from 'lucide-react';

interface PlancheEtiquettesViewProps {
  inventory?: InventoryItem[];
  missions?: Mission[];
  distractions?: Distraction[];
}

export const PlancheEtiquettesView: React.FC<PlancheEtiquettesViewProps> = ({
  inventory,
  missions,
  distractions
}) => {
  // Dynamically compute all barcodes needed from inventory, missions and distractions
  const items = useMemo(() => {
    if (!inventory || !missions) return BARCODE_CATALOG;

    const map = new Map<string, { code: string; label: string; type: string }>();

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

  useEffect(() => {
    // Generate barcodes for all items in the computed catalog
    items.forEach((item) => {
      const el = document.getElementById(`barcode-svg-${item.code}`);
      if (el) {
        try {
          JsBarcode(el, item.code, {
            format: 'CODE128',
            lineColor: '#000000',
            width: 1.8,
            height: 48,
            displayValue: true,
            fontSize: 13,
            font: 'monospace',
            fontOptions: 'bold',
            margin: 6
          });
        } catch {
          // Fallback if already rendered
        }
      }
    });
  }, [items]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-[calc(100vh-65px)] p-4 flex flex-col gap-4">
      {/* Top Banner (hidden on print) */}
      <div className="no-print bg-slate-900 rounded-2xl p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-lg shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-extrabold text-white">PLANCHE D'ÉTIQUETTES CODE-BARRES À IMPRIMER</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {items.length} CODES GÉNÉRÉS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Imprimez cette page sur papier A4, découpez les étiquettes et collez-les sur vos vrais cartons, tiroirs et pièces sur la table !
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center space-x-2 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimer la Planche A4 (Ctrl+P)</span>
        </button>
      </div>

      {/* Printable Sheet (Standard A4 White Sheet) */}
      <div 
        id="printable-sheet" 
        className="bg-white text-slate-900 p-8 rounded-2xl shadow-2xl max-w-5xl mx-auto w-full print:m-0 print:p-2 print:shadow-none print:w-full"
      >
        {/* Header of the sheet */}
        <div className="border-b-2 border-gray-900 pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black text-gray-950 tracking-tight">CEA GRENOBLE • WMS & ERP LOGISTIQUE</h1>
            <p className="text-xs text-gray-600 font-mono">Planche d'adressage et codes-barres réels Code-128 pour douchette USB</p>
          </div>
          <div className="text-right font-mono text-xs text-gray-500">
            <span>Événement 25 Ans • Format Standard A4</span>
          </div>
        </div>

        {/* Labels Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-3">
          {items.map((item) => (
            <div
              key={item.code}
              className="border-2 border-dashed border-gray-400 p-3 rounded-lg flex flex-col items-center justify-between text-center bg-white print:border-gray-500 print:break-inside-avoid"
            >
              {/* Badge type */}
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-300 mb-1">
                {item.type === 'location' ? '📍 EMPLACEMENT' : item.type === 'article' ? '📦 ARTICLE / PIÈCE' : item.type === 'package' ? '📫 COLIS CARTON' : item.type === 'seal' ? '🔒 SCELLÉ' : '⚓ QUAI'}
              </span>

              {/* Designation */}
              <p className="text-xs font-bold text-gray-900 mb-2 leading-tight">
                {item.label}
              </p>

              {/* Barcode SVG */}
              <svg id={`barcode-svg-${item.code}`} className="max-w-full h-auto"></svg>

              {/* Small cut indicator */}
              <div className="text-[8px] text-gray-400 mt-1 uppercase font-mono">
                ✂️ Découper le long des pointillés
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500 font-mono">
          © CEA Grenoble • Système d'Adressage & Picking WMS v25.0
        </div>
      </div>
    </div>
  );
};
