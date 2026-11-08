import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../types';
import { 
  Search, 
  MapPin, 
  Plus, 
  Save, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle,
  PackageCheck,
  RotateCcw
} from 'lucide-react';

interface StockERPViewProps {
  inventory: InventoryItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onUpdateInventory?: (newInv: InventoryItem[]) => Promise<void> | void;
}

export const StockERPView: React.FC<StockERPViewProps> = ({ 
  inventory, 
  onUpdateQuantity,
  onUpdateInventory 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isEditMode, setIsEditMode] = useState(false);
  const [localItems, setLocalItems] = useState<InventoryItem[]>(inventory);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Synchronisation lorsque l'inventaire distant change
  useEffect(() => {
    if (!isEditMode) {
      setLocalItems(inventory);
    }
  }, [inventory, isEditMode]);

  const filtered = localItems.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.lrCode && item.lrCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.gestionnaire && item.gestionnaire.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.machinePdt && item.machinePdt.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.refEquipementier && item.refEquipementier.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const categories = ['all', 'Vide & Cryo', 'Microélectronique', 'Consommables'];

  // Ajouter un nouvel article dans la liste
  const handleAddNewItem = () => {
    const newItem: InventoryItem = {
      id: `item-${Date.now()}`,
      sku: `REF${Date.now().toString().slice(-12)}`,
      lrCode: 'REF_NEW',
      crLabel: 'NOUVEL ARTICLE INDUSTRIEL',
      name: 'NOUVEL ARTICLE INDUSTRIEL',
      category: 'Vide & Cryo',
      location: 'ZONE_POMPE_GRILLE_41',
      quantity: 10,
      unit: 'pcs',
      critical: false,
      batch: 'LOT-2026',
      description: 'Pièce industrielle de stock...',
      gestionnaire: 'GT Logistics',
      machinePdt: 'Poste 1',
      refEquipementier: 'OEM-REF-01'
    };
    setLocalItems([...localItems, newItem]);
    if (!isEditMode) setIsEditMode(true);
  };

  // Supprimer un article
  const handleDeleteItem = (id: string) => {
    setLocalItems(localItems.filter((item) => item.id !== id));
  };

  // Enregistrer toutes les modifications dans Supabase et l'ERP
  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveStatus('Enregistrement dans Supabase en cours...');
    try {
      if (onUpdateInventory) {
        await onUpdateInventory(localItems);
      }
      setSaveStatus('✓ Stock ERP enregistré dans Supabase et synchronisé en direct !');
      setIsEditMode(false);
    } catch (err) {
      setSaveStatus('⚠️ Erreur lors de l\'enregistrement cloud.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };

  // Annuler les modifications non enregistrées
  const handleCancelEdit = () => {
    setLocalItems(inventory);
    setIsEditMode(false);
  };

  return (
    <div className="min-h-[calc(100vh-65px)] p-3 sm:p-5 flex flex-col gap-4">
      {/* Top Banner & Command Bar */}
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-white">GESTION DES STOCKS & ERP TRAÇABILITÉ</h2>
            {isEditMode && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-[10px] font-bold uppercase animate-pulse">
                Mode Édition Actif
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Base de données magasins centraux CEA Minatec / LETI • Traçabilité Référence GT Logistics
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Action Buttons: Edit / Add / Save */}
          {isEditMode ? (
            <>
              <button
                type="button"
                onClick={handleAddNewItem}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter un Article</span>
              </button>

              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Annuler</span>
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveAll}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center space-x-2 shadow-lg shadow-emerald-500/30 cursor-pointer transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Enregistrement...' : 'Enregistrer le Stock'}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsEditMode(true)}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-md shadow-sky-600/20"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modifier les Articles</span>
              </button>

              <button
                type="button"
                onClick={handleAddNewItem}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center space-x-1.5 cursor-pointer border border-slate-700"
              >
                <Plus className="w-3.5 h-3.5 text-sky-400" />
                <span>Nouvel Article</span>
              </button>
            </>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher réf, code-barres, machine..."
              className="bg-slate-950 border border-slate-700 pl-9 pr-3 py-1.5 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 w-64"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat === 'all' ? 'Tous' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save Status Notification Banner */}
      {saveStatus && (
        <div className={`p-3 rounded-2xl border text-xs font-mono font-bold flex items-center justify-between shadow-lg transition-all ${
          saveStatus.includes('✓') 
            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300' 
            : 'bg-amber-950/80 border-amber-500 text-amber-300'
        }`}>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveStatus}</span>
          </div>
          <button 
            onClick={() => setSaveStatus(null)}
            className="text-slate-400 hover:text-white text-xs underline font-sans"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Stock Table */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 flex-1 overflow-hidden shadow-xl flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/90 text-slate-400 font-mono uppercase text-[10px] sm:text-[11px] sticky top-0 border-b border-slate-800 z-10 backdrop-blur-md">
              <tr>
                <th className="py-3 px-3">Réf</th>
                <th className="py-3 px-3">Code SKU (Code-barres)</th>
                <th className="py-3 px-3">Désignation</th>
                <th className="py-3 px-3 text-right">Qté en stock</th>
                <th className="py-3 px-3">Emplacement</th>
                <th className="py-3 px-3">Gestionnaire</th>
                <th className="py-3 px-3">Machine PDT</th>
                <th className="py-3 px-3">Réf Équipementier</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filtered.map((item, idx) => {
                const realIdx = localItems.findIndex((it) => it.id === item.id);
                return (
                  <tr key={item.id || idx} className="hover:bg-slate-800/40 transition-colors">
                    {/* 1. Réf (ex: JNT_A001) */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={item.lrCode || ''}
                          placeholder="JNT_A001"
                          onChange={(e) => {
                            const updated = [...localItems];
                            updated[realIdx].lrCode = e.target.value.trim().toUpperCase();
                            setLocalItems(updated);
                          }}
                          className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-amber-400 font-mono font-bold w-24 text-xs"
                        />
                      ) : (
                        <span className="font-mono font-black text-amber-400 text-xs">
                          {item.lrCode || item.sku.replace('ART-', 'REF_')}
                        </span>
                      )}
                    </td>

                    {/* 2. Code-barres SKU */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={item.sku}
                          placeholder="REF191000..."
                          onChange={(e) => {
                            const updated = [...localItems];
                            updated[realIdx].sku = e.target.value.trim().toUpperCase();
                            setLocalItems(updated);
                          }}
                          className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-sky-400 font-mono font-bold w-36 text-xs"
                        />
                      ) : (
                        <span className="font-mono font-bold text-sky-400">
                          {item.sku}
                        </span>
                      )}
                    </td>

                    {/* 3. Désignation */}
                    <td className="py-2.5 px-3 min-w-[200px]">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={item.name}
                          placeholder="Désignation"
                          onChange={(e) => {
                            const updated = [...localItems];
                            updated[realIdx].name = e.target.value;
                            updated[realIdx].crLabel = e.target.value.toUpperCase();
                            setLocalItems(updated);
                          }}
                          className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-white font-semibold w-full text-xs"
                        />
                      ) : (
                        <div>
                          <div className="font-semibold text-slate-100 uppercase text-xs">{item.crLabel || item.name}</div>
                          {item.description && (
                            <div className="text-[10px] text-slate-400 font-sans truncate max-w-xs">{item.description}</div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* 4. Quantité en stock */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {isEditMode ? (
                        <div className="flex items-center justify-end space-x-1">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const updated = [...localItems];
                              updated[realIdx].quantity = parseInt(e.target.value) || 0;
                              setLocalItems(updated);
                            }}
                            className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-emerald-400 font-mono w-16 text-xs text-right"
                          />
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => {
                              const updated = [...localItems];
                              updated[realIdx].unit = e.target.value;
                              setLocalItems(updated);
                            }}
                            className="bg-slate-950 border border-slate-700 px-1 py-1 rounded text-slate-400 font-mono w-12 text-center text-xs"
                          />
                        </div>
                      ) : (
                        <div>
                          <span className={`text-sm font-mono font-black ${
                            item.quantity <= 5 ? 'text-rose-400' : item.quantity <= 15 ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {item.quantity}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1 font-mono">{item.unit}</span>
                        </div>
                      )}
                    </td>

                    {/* 5. Emplacement */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={item.location}
                          placeholder="ZONE_... ou LOC-..."
                          onChange={(e) => {
                            const updated = [...localItems];
                            updated[realIdx].location = e.target.value.trim().toUpperCase();
                            setLocalItems(updated);
                          }}
                          className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-sky-300 font-mono w-32 text-xs"
                        />
                      ) : (
                        <div className="flex items-center space-x-1 font-mono font-bold text-sky-300">
                          <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{item.location}</span>
                        </div>
                      )}
                    </td>

                    {/* 6. Gestionnaire */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={item.gestionnaire || ''}
                          placeholder="GT Logistics"
                          onChange={(e) => {
                            const updated = [...localItems];
                            updated[realIdx].gestionnaire = e.target.value;
                            setLocalItems(updated);
                          }}
                          className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-slate-200 text-xs w-28"
                        />
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium text-[10px] border border-slate-700">
                          {item.gestionnaire || 'GT Logistics'}
                        </span>
                      )}
                    </td>

                    {/* 7. Machine PDT */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={item.machinePdt || ''}
                          placeholder="Poste / Machine"
                          onChange={(e) => {
                            const updated = [...localItems];
                            updated[realIdx].machinePdt = e.target.value;
                            setLocalItems(updated);
                          }}
                          className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-slate-300 font-mono text-xs w-32"
                        />
                      ) : (
                        <span className="font-mono text-slate-300 text-[11px]">
                          {item.machinePdt || 'Standard'}
                        </span>
                      )}
                    </td>

                    {/* 8. Réf Équipementier */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={item.refEquipementier || ''}
                          placeholder="Réf Constructeur"
                          onChange={(e) => {
                            const updated = [...localItems];
                            updated[realIdx].refEquipementier = e.target.value;
                            setLocalItems(updated);
                          }}
                          className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-slate-400 font-mono text-xs w-32"
                        />
                      ) : (
                        <span className="font-mono text-slate-400 text-[11px]">
                          {item.refEquipementier || '-'}
                        </span>
                      )}
                    </td>

                    {/* 9. Actions */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {isEditMode ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-rose-400 hover:text-rose-300 p-1.5 rounded hover:bg-rose-950/40 cursor-pointer"
                          title="Supprimer cet article"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 cursor-pointer"
                            title="Consommer 1 unité (sauvegarde automatique)"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className="w-6 h-6 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold cursor-pointer"
                            title="Ajouter 1 unité (sauvegarde automatique)"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Bar */}
        <div className="bg-slate-950/80 p-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-emerald-400" />
            <span>Total Articles Référencés : <strong className="text-white">{filtered.length}</strong></span>
          </div>

          {isEditMode && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveAll}
                className="px-5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Enregistrement...' : 'Enregistrer les Modifications'}</span>
              </button>
            </div>
          )}

          <span>Synchronisé en temps réel avec le Cloud Supabase & la Scannette</span>
        </div>
      </div>
    </div>
  );
};
