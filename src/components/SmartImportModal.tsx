import React, { useMemo, useRef, useState } from 'react';
import {
  X,
  Download,
  Upload,
  FileSpreadsheet,
  ClipboardPaste,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  MapPin,
  Package,
  Target,
  RefreshCw
} from 'lucide-react';
import { AppConfig, InventoryItem, Mission, WarehouseLocation } from '../types';
import {
  downloadStockTemplateCsv,
  exportCurrentStockCsv,
  downloadMissionsTemplateCsv,
  parseSmartStockText,
  parseSmartMissionsText
} from '../services/smartSpreadsheetImport';
import { generateAutoBalancedMissions } from '../services/autoLoopMissionGenerator';
import { showToast } from './ToastNotification';

interface SmartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  locations: WarehouseLocation[];
  missions: Mission[];
  appConfig: AppConfig;
  onApplyStockImport: (
    nextInventory: InventoryItem[],
    nextLocations: WarehouseLocation[],
    nextMissions?: Mission[]
  ) => void;
  onApplyMissionsImport: (nextMissions: Mission[]) => void;
}

export const SmartImportModal: React.FC<SmartImportModalProps> = ({
  isOpen,
  onClose,
  inventory,
  locations,
  missions,
  appConfig,
  onApplyStockImport,
  onApplyMissionsImport
}) => {
  const [tab, setTab] = useState<'stock' | 'missions'>('stock');
  const [rawStockText, setRawStockText] = useState('');
  const [stockImportMode, setStockImportMode] = useState<'replace' | 'merge'>('replace');
  const [autoRegenerateMissions, setAutoRegenerateMissions] = useState(true);
  const [keepSystemLocations, setKeepSystemLocations] = useState(true);

  const [rawMissionsText, setRawMissionsText] = useState('');
  const [missionsImportMode, setMissionsImportMode] = useState<'replace' | 'append'>('replace');

  const stockFileRef = useRef<HTMLInputElement>(null);
  const missionsFileRef = useRef<HTMLInputElement>(null);

  const parsedStock = useMemo(
    () => (rawStockText.trim() ? parseSmartStockText(rawStockText, locations) : null),
    [rawStockText, locations]
  );

  const parsedMissions = useMemo(
    () =>
      rawMissionsText.trim()
        ? parseSmartMissionsText(rawMissionsText, inventory, locations)
        : null,
    [rawMissionsText, inventory, locations]
  );

  if (!isOpen) return null;

  const handleReadFile = (file: File, target: 'stock' | 'missions') => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || '');
      if (target === 'stock') setRawStockText(content);
      else setRawMissionsText(content);
      showToast({
        title: 'Fichier chargé',
        message: `${file.name} analysé — vérifiez l'aperçu puis validez.`,
        type: 'info'
      });
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleConfirmStockImport = () => {
    if (!parsedStock || parsedStock.items.length === 0) return;

    // 1. Build final Inventory
    let finalInventory: InventoryItem[];
    if (stockImportMode === 'replace') {
      finalInventory = parsedStock.items;
    } else {
      const bySku = new Map<string, InventoryItem>();
      inventory.forEach((it) => bySku.set(it.sku.trim().toUpperCase(), it));
      parsedStock.items.forEach((it) => bySku.set(it.sku.trim().toUpperCase(), it));
      finalInventory = Array.from(bySku.values());
    }

    // 2. Build final Locations (auto-creating all discovered locations + preserving Delivery/Collect tables!)
    const systemBarcodes = new Set([
      (appConfig.deliveryTableBarcode || 'LOC-ETAGERE-LIVRAISON').toUpperCase(),
      (appConfig.collectTableBarcode || 'LOC-ETAGERE-COLLECTE').toUpperCase(),
      'ZONE_RECEPTION_CENTRALE'
    ]);

    const locByCode = new Map<string, WarehouseLocation>();
    if (stockImportMode === 'merge') {
      locations.forEach((l) => locByCode.set(l.barcode.trim().toUpperCase(), l));
    } else if (keepSystemLocations) {
      locations.forEach((l) => {
        const key = l.barcode.trim().toUpperCase();
        if (systemBarcodes.has(key) || parsedStock.allLocationCodes.some((c) => c.toUpperCase() === key)) {
          locByCode.set(key, l);
        }
      });
    }

    parsedStock.newLocations.forEach((nl) => {
      locByCode.set(nl.barcode.trim().toUpperCase(), nl);
    });

    // Ensure Delivery & Collect tables always exist so Auto-Loop missions & labels never break
    const deliveryCode = appConfig.deliveryTableBarcode || 'LOC-ETAGERE-LIVRAISON';
    const collectCode = appConfig.collectTableBarcode || 'LOC-ETAGERE-COLLECTE';
    if (!locByCode.has(deliveryCode.toUpperCase())) {
      locByCode.set(deliveryCode.toUpperCase(), {
        id: `loc-sys-delivery-${Date.now()}`,
        barcode: deliveryCode,
        label: 'Table de Livraison Client',
        lrCode: 'ETA_LIVR',
        crLabel: 'TABLE LIVRAISON CLIENT',
        zone: 'Quai Expédition',
        description: 'Table de dépôt des commandes préparées',
        aliases: [],
        sortOrder: locByCode.size
      });
    }
    if (!locByCode.has(collectCode.toUpperCase())) {
      locByCode.set(collectCode.toUpperCase(), {
        id: `loc-sys-collect-${Date.now()}`,
        barcode: collectCode,
        label: 'Table de Collecte & Retours',
        lrCode: 'ETA_COLLECT',
        crLabel: 'TABLE COLLECTE RETOURS',
        zone: 'Quai Retours',
        description: 'Table de collecte pour réintégration en stock',
        aliases: [],
        sortOrder: locByCode.size
      });
    }

    const finalLocations = Array.from(locByCode.values()).map((l, idx) => ({ ...l, sortOrder: idx }));

    // 3. Optionally auto-generate the 3 balanced zero-restock missions immediately!
    let finalMissions: Mission[] | undefined = undefined;
    if (autoRegenerateMissions) {
      const generated = generateAutoBalancedMissions(finalInventory, finalLocations, appConfig, 2);
      if (generated.length > 0) {
        finalMissions = generated;
      }
    }

    onApplyStockImport(finalInventory, finalLocations, finalMissions);
    showToast({
      title: '🚀 Import Excel appliqué & synchronisé !',
      message: `${finalInventory.length} articles, ${finalLocations.length} emplacements${
        finalMissions ? ` + ${finalMissions.length} missions équilibrées` : ''
      } prêts !`,
      type: 'success',
      duration: 5000
    });
    setRawStockText('');
    onClose();
  };

  const handleConfirmMissionsImport = () => {
    if (!parsedMissions || parsedMissions.missions.length === 0) return;
    const finalMissions =
      missionsImportMode === 'replace'
        ? parsedMissions.missions
        : [...missions, ...parsedMissions.missions];
    onApplyMissionsImport(finalMissions);
    showToast({
      title: '🎯 Missions importées & synchronisées !',
      message: `${parsedMissions.missions.length} mission(s) prêtes sur tous les terminaux.`,
      type: 'success',
      duration: 4500
    });
    setRawMissionsText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0c1e3a] via-[#102a52] to-[#0c1e3a] text-white px-5 py-4 flex items-center justify-between border-b-2 border-red-600 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-sky-300 block">
                IMPORT INTELLIGENT EXCEL / CSV • SUPABASE TEMPS RÉEL
              </span>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                Importer mon Stock, Étiquettes & Missions en 1 Clic
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="px-5 pt-3 pb-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setTab('stock')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
              tab === 'stock'
                ? 'bg-[#0c1e3a] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4 text-emerald-400" />
            <span>1. Stock + Emplacements + Boucle Auto (Recommandé)</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('missions')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
              tab === 'missions'
                ? 'bg-[#0c1e3a] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Target className="w-4 h-4 text-amber-400" />
            <span>2. Missions sur mesure (.csv)</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {tab === 'stock' ? (
            <>
              {/* Step 1: Download Template / Export Current */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono font-black uppercase text-blue-700 block">
                    ÉTAPE 1 • PRÉPARER DANS EXCEL
                  </span>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Télécharge le modèle prêt pour Excel (UTF-8, colonnes automatiques), colle tes vraies pièces, puis importe-le ci-dessous.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      downloadStockTemplateCsv();
                      showToast({
                        title: '📥 Modèle téléchargé',
                        message: 'Ouvre MODELE_STOCK_GT_25ANS.csv dans Excel et colle tes vraies données !',
                        type: 'success'
                      });
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Modèle Excel (.csv)</span>
                  </button>

                  {inventory.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        exportCurrentStockCsv(inventory);
                        showToast({
                          title: '📤 Stock actuel exporté',
                          message: `${inventory.length} articles exportés au format Excel.`,
                          type: 'info'
                        });
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                      <span>Exporter stock actuel ({inventory.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Step 2: Upload OR Copy-Paste from Excel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div
                  onClick={() => stockFileRef.current?.click()}
                  className="bg-blue-50/70 hover:bg-blue-50 border-2 border-dashed border-blue-300 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all"
                >
                  <Upload className="w-7 h-7 text-blue-600 mb-2" />
                  <span className="text-xs font-black text-blue-950">Charger un fichier .CSV</span>
                  <span className="text-[11px] text-blue-700/80 mt-1">
                    Format Excel (;), virgule (,) ou TSV
                  </span>
                  <input
                    ref={stockFileRef}
                    type="file"
                    accept=".csv,.tsv,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleReadFile(f, 'stock');
                      e.target.value = '';
                    }}
                  />
                </div>

                <div className="md:col-span-2 bg-slate-50 rounded-2xl p-3 border border-slate-200 flex flex-col">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono font-bold text-slate-700 flex items-center gap-1.5">
                      <ClipboardPaste className="w-3.5 h-3.5 text-emerald-600" />
                      OU Copier-Coller directement depuis Excel (Ctrl+C → Ctrl+V) :
                    </span>
                    {rawStockText && (
                      <button
                        type="button"
                        onClick={() => setRawStockText('')}
                        className="text-[11px] text-rose-600 hover:underline font-bold cursor-pointer"
                      >
                        Effacer
                      </button>
                    )}
                  </div>
                  <textarea
                    value={rawStockText}
                    onChange={(e) => setRawStockText(e.target.value)}
                    placeholder={'SKU;Designation;Emplacement;Quantite\nREF191000004264;WIRE ASSY PBN-NF RF 350;BAT 41 - MB - D04 / D;2'}
                    rows={4}
                    className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl p-2.5 text-xs font-mono text-slate-800 focus:outline-none select-text"
                  />
                </div>
              </div>

              {/* Step 3: Smart Preview & Options */}
              {parsedStock && (
                <div className="bg-white rounded-2xl border-2 border-emerald-300 p-4 space-y-3 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {parsedStock.items.length} article(s) détecté(s)
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-100 text-sky-900 text-xs font-black font-mono">
                        <MapPin className="w-3.5 h-3.5 text-sky-600" />
                        {parsedStock.allLocationCodes.length} emplacement(s) ({parsedStock.newLocations.length} nouveau(x))
                      </span>
                    </div>

                    {/* Import mode selector */}
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setStockImportMode('replace')}
                        className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                          stockImportMode === 'replace'
                            ? 'bg-[#0c1e3a] text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Remplacer tout (Recommandé Lundi)
                      </button>
                      <button
                        type="button"
                        onClick={() => setStockImportMode('merge')}
                        className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                          stockImportMode === 'merge'
                            ? 'bg-[#0c1e3a] text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Fusionner / Ajouter
                      </button>
                    </div>
                  </div>

                  {/* Warnings */}
                  {parsedStock.warnings.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-900 space-y-0.5">
                      {parsedStock.warnings.slice(0, 4).map((w, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Auto-wiring checkboxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoRegenerateMissions}
                        onChange={(e) => setAutoRegenerateMissions(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-amber-600"
                      />
                      <div className="text-xs">
                        <span className="font-black text-amber-950 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          Régénérer les 3 missions équilibrées
                        </span>
                        <span className="text-[11px] text-amber-900/80 block mt-0.5">
                          Crée automatiquement Livraison + Collecte Retour + Contrôle (zéro remplissage animateur).
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 p-3 rounded-xl bg-sky-50/70 border border-sky-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={keepSystemLocations}
                        onChange={(e) => setKeepSystemLocations(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-sky-600"
                      />
                      <div className="text-xs">
                        <span className="font-black text-sky-950 flex items-center gap-1">
                          <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
                          Conserver les tables Livraison / Collecte
                        </span>
                        <span className="text-[11px] text-sky-900/80 block mt-0.5">
                          Garde les étiquettes de quai actives et ajoute automatiquement tes nouveaux bacs.
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Preview table */}
                  {parsedStock.items.length > 0 && (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-48">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-100 text-slate-700 sticky top-0">
                          <tr>
                            <th className="px-3 py-1.5">SKU</th>
                            <th className="px-3 py-1.5">Désignation</th>
                            <th className="px-3 py-1.5">Emplacement</th>
                            <th className="px-3 py-1.5 text-right">Qté</th>
                            <th className="px-3 py-1.5">L/R</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedStock.items.slice(0, 12).map((it) => (
                            <tr key={it.id} className="hover:bg-slate-50">
                              <td className="px-3 py-1.5 font-bold text-blue-700">{it.sku}</td>
                              <td className="px-3 py-1.5 font-sans font-semibold text-slate-900 max-w-[200px] truncate">
                                {it.name}
                              </td>
                              <td className="px-3 py-1.5 text-emerald-700 font-bold">{it.location}</td>
                              <td className="px-3 py-1.5 text-right font-black">{it.quantity}</td>
                              <td className="px-3 py-1.5 text-slate-500">{it.lrCode}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {parsedStock.items.length > 12 && (
                        <div className="text-center text-[11px] text-slate-500 py-1.5 bg-slate-50 border-t border-slate-200">
                          + {parsedStock.items.length - 12} autre(s) article(s)...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* TAB 2: CUSTOM MISSIONS CSV IMPORT */
            <>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono font-black uppercase text-amber-700 block">
                    MISSIONS SUR MESURE (OPTIONNEL)
                  </span>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Si tu veux écrire tes propres scénarios dans Excel (1 ligne = 1 étape, regroupées par <code>Code_Mission</code>).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    downloadMissionsTemplateCsv();
                    showToast({
                      title: '📥 Modèle Missions téléchargé',
                      message: 'Ouvre MODELE_MISSIONS_GT_25ANS.csv dans Excel.',
                      type: 'success'
                    });
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Modèle Missions (.csv)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div
                  onClick={() => missionsFileRef.current?.click()}
                  className="bg-amber-50/70 hover:bg-amber-50 border-2 border-dashed border-amber-300 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all"
                >
                  <Upload className="w-7 h-7 text-amber-600 mb-2" />
                  <span className="text-xs font-black text-amber-950">Charger Missions .CSV</span>
                  <input
                    ref={missionsFileRef}
                    type="file"
                    accept=".csv,.tsv,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleReadFile(f, 'missions');
                      e.target.value = '';
                    }}
                  />
                </div>

                <div className="md:col-span-2 bg-slate-50 rounded-2xl p-3 border border-slate-200">
                  <span className="text-[11px] font-mono font-bold text-slate-700 block mb-1.5">
                    OU Coller les lignes de missions depuis Excel :
                  </span>
                  <textarea
                    value={rawMissionsText}
                    onChange={(e) => setRawMissionsText(e.target.value)}
                    placeholder="Code_Mission;Titre_Mission;Client;Sens_Stock;Type_Etape;Code_Barre;Libelle_Etape;Quantite;Instruction"
                    rows={4}
                    className="w-full bg-white border border-slate-300 focus:border-amber-500 rounded-xl p-2.5 text-xs font-mono text-slate-800 focus:outline-none select-text"
                  />
                </div>
              </div>

              {parsedMissions && (
                <div className="bg-white rounded-2xl border-2 border-amber-300 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                      {parsedMissions.missions.length} mission(s) détectée(s)
                    </span>
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setMissionsImportMode('replace')}
                        className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                          missionsImportMode === 'replace' ? 'bg-[#0c1e3a] text-white' : 'text-slate-600'
                        }`}
                      >
                        Remplacer les missions
                      </button>
                      <button
                        type="button"
                        onClick={() => setMissionsImportMode('append')}
                        className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                          missionsImportMode === 'append' ? 'bg-[#0c1e3a] text-white' : 'text-slate-600'
                        }`}
                      >
                        Ajouter à la suite
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {parsedMissions.missions.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div>
                          <span className="font-mono font-bold text-amber-700 mr-2">{m.code}</span>
                          <span className="font-bold text-slate-900">{m.title}</span>
                        </div>
                        <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200 font-bold">
                          {m.steps.length} étapes
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold cursor-pointer"
          >
            Annuler
          </button>

          {tab === 'stock' ? (
            <button
              type="button"
              disabled={!parsedStock || parsedStock.items.length === 0}
              onClick={handleConfirmStockImport}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Appliquer & Synchroniser Supabase
                {parsedStock && parsedStock.items.length > 0 ? ` (${parsedStock.items.length} réf.)` : ''}
              </span>
            </button>
          ) : (
            <button
              type="button"
              disabled={!parsedMissions || parsedMissions.missions.length === 0}
              onClick={handleConfirmMissionsImport}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Importer les Missions
                {parsedMissions && parsedMissions.missions.length > 0
                  ? ` (${parsedMissions.missions.length})`
                  : ''}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
