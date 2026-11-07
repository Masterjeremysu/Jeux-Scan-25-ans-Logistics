import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { BARCODE_CATALOG } from '../data/initialData';
import { Printer, Download, Sparkles, Scissors, Info } from 'lucide-react';

export const PlancheEtiquettesView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate barcodes for all items in the catalog
    BARCODE_CATALOG.forEach((item) => {
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
  }, []);

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
              PRÊT POUR DOUCHETTE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Imprimez cette page sur papier A4, découpez les étiquettes et collez-les sur vos vrais cartons, tiroirs et pièces sur la table !
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
            <Scissors className="w-4 h-4 text-amber-400" />
            <span>Format Code-128 Haute Lisibilité Laser</span>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/30 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Lancer l'Impression A4 (Ctrl+P)</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet (Standard A4 Grid) */}
      <div 
        ref={containerRef}
        className="bg-white text-black p-8 rounded-3xl shadow-2xl border border-slate-700 max-w-5xl mx-auto w-full print:border-none print:shadow-none print:p-0 print:max-w-none"
      >
        <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black">CEA GRENOBLE • MAGASIN LOGISTIQUE</h1>
            <p className="text-xs text-gray-700 font-mono">Planche d'identification des colis, pièces et emplacements — Challenge 25 Ans</p>
          </div>
          <div className="text-right text-xs font-mono text-gray-600">
            Page 1/1 • Format A4
          </div>
        </div>

        {/* Barcode Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {BARCODE_CATALOG.map((item) => (
            <div
              key={item.code}
              className="border-2 border-dashed border-gray-400 p-3 rounded-lg flex flex-col items-center justify-between bg-white text-center page-break-inside-avoid relative"
            >
              {/* Badge type */}
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-300 mb-1">
                {item.type === 'location' ? '📍 EMPLACEMENT' : item.type === 'article' ? '📦 ARTICLE / PIÈCE' : item.type === 'package' ? '📫 COLIS CARTON' : '🔒 SCELLÉ'}
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
          © CEA Grenoble 2026 • Système d'Adressage & Picking WMS v25.0
        </div>
      </div>
    </div>
  );
};
