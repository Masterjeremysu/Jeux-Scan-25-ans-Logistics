import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { InventoryItem, WarehouseLocation } from '../types';
import { INITIAL_LOCATIONS, INITIAL_INVENTORY } from '../data/initialData';
import { 
  Search, 
  MapPin, 
  Plus, 
  Save, 
  Trash2, 
  Copy,
  CheckCircle2, 
  AlertCircle,
  Package,
  Layers,
  ArrowRight,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { showToast } from './ToastNotification';

interface StockERPViewProps {
  inventory: InventoryItem[];
  locations?: WarehouseLocation[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onUpdateInventory?: (newInv: InventoryItem[]) => Promise<void> | void;
  onNavigateToAdminLocations?: () => void;
}

export const StockERPView: React.FC<StockERPViewProps> = ({ 
  inventory, 
  locations = INITIAL_LOCATIONS,
  onUpdateQuantity,
  onUpdateInventory,
  onNavigateToAdminLocations
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [localItems, setLocalItems] = useState<InventoryItem[]>(inventory);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);

  // Synchroniser avec les props extérieures UNIQUEMENT si l'utilisateur n'a pas de modifications en cours
  useEffect(() => {
    if (!hasChanges) {
      setLocalItems(inventory);
    }
  }, [inventory, hasChanges]);

  // Raccourci clavier Ctrl+S / Cmd+S pour sauvegarder instantanément
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [localItems, onUpdateInventory]);

  // Modification immuable et stable d'un champ sans casser les sélections ou copier-coller
  const handleFieldChange = useCallback((id: string, field: keyof InventoryItem, value: any) => {
    setLocalItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        // Si le nom change, synchroniser le crLabel pour l'impression
        if (field === 'name') {
          updated.crLabel = String(value).toUpperCase();
        }
        return updated;
      })
    );
    setHasChanges(true);
  }, []);

  // Liste des emplacements disponibles pour le datalist
  const locationOptions = useMemo(() => {
    const locMap = new Map<string, string>();
    // Emplacements configurés
    locations.forEach((loc) => {
      locMap.set(loc.barcode, loc.label);
    });
    // Emplacements déjà présents dans l'inventaire
    localItems.forEach((it) => {
      if (it.location && !locMap.has(it.location)) {
        locMap.set(it.location, `Emplacement ${it.location}`);
      }
    });
    return Array.from(locMap.entries()).map(([barcode, label]) => ({ barcode, label }));
  }, [locations, localItems]);

  const categories = useMemo(() => {
    const set = new Set<string>(['Vide & Cryo', 'Microélectronique', 'Consommables']);
    localItems.forEach((it) => {
      if (it.category) set.add(it.category);
    });
    return ['all', ...Array.from(set)];
  }, [localItems]);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return localItems.filter((item) => {
      const matchesSearch = 
        !q ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.lrCode && item.lrCode.toLowerCase().includes(q)) ||
        (item.location && item.location.toLowerCase().includes(q)) ||
        (item.gestionnaire && item.gestionnaire.toLowerCase().includes(q)) ||
        (item.machinePdt && item.machinePdt.toLowerCase().includes(q)) ||
        (item.refEquipementier && item.refEquipementier.toLowerCase().includes(q));
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [localItems, searchTerm, selectedCategory]);

  // Ajouter un nouvel article
  const handleAddNewItem = () => {
    const newSku = `REF${Date.now().toString().slice(-9)}`;
    const newItem: InventoryItem = {
      id: `item-${Date.now()}`,
      sku: newSku,
      lrCode: `REF_${Date.now().toString().slice(-4)}`,
      name: 'NOUVEL ARTICLE INDUSTRIEL',
      crLabel: 'NOUVEL ARTICLE INDUSTRIEL',
      category: selectedCategory !== 'all' ? selectedCategory : 'Consommables',
      location: locations[0]?.barcode || 'LOC-B01-T03',
      quantity: 10,
      unit: 'pcs',
      critical: false,
      batch: `LOT-${new Date().getFullYear()}`,
      description: 'Pièce industrielle référencée GT Logistics',
      gestionnaire: 'GT Logistics',
      machinePdt: 'Poste 1',
      refEquipementier: 'OEM-GT-01'
    };
    setLocalItems((prev) => [newItem, ...prev]);
    setHasChanges(true);
    showToast({
      title: 'Nouvelle Référence Créée',
      message: 'Complétez les champs et cliquez sur "Enregistrer les Modifications"',
      type: 'info'
    });
  };

  // Dupliquer un article existant
  const handleDuplicateItem = (item: InventoryItem) => {
    const duplicated: InventoryItem = {
      ...item,
      id: `item-${Date.now()}`,
      sku: `${item.sku}-BIS`,
      lrCode: `${item.lrCode || 'REF'}_BIS`,
      name: `${item.name} (COPIE)`,
      crLabel: `${item.crLabel || item.name} (COPIE)`
    };
    setLocalItems((prev) => [duplicated, ...prev]);
    setHasChanges(true);
    showToast({
      title: 'Référence Dupliquée',
      message: `${duplicated.name} ajoutée au stock`,
      type: 'info'
    });
  };

  // Supprimer un article
  const handleDeleteItem = (id: string, name: string) => {
    if (window.confirm(`Supprimer définitivement l'article "${name}" du stock ?`)) {
      setLocalItems((prev) => prev.filter((it) => it.id !== id));
      setHasChanges(true);
      showToast({
        title: 'Article Supprimé',
        message: 'Pensez à cliquer sur "Enregistrer" pour synchroniser',
        type: 'warning'
      });
    }
  };

  // Enregistrer toutes les modifications
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      if (onUpdateInventory) {
        await onUpdateInventory(localItems);
      }
      setHasChanges(false);
      showToast({
        title: 'Stock ERP Enregistré',
        message: `${localItems.length} références synchronisées en direct sur tous les postes`,
        type: 'success'
      });
    } catch (err) {
      showToast({
        title: 'Erreur Enregistrement',
        message: 'Impossible de synchroniser avec Supabase pour le moment',
        type: 'warning'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Réinitialiser les modifications non enregistrées
  const handleCancelChanges = () => {
    if (window.confirm('Annuler toutes les modifications non enregistrées ?')) {
      setLocalItems(inventory);
      setHasChanges(false);
    }
  };

  // Réinitialisation du stock physique nominal après qu'un ou plusieurs duos ont manipulé les bacs
  const handleResetPhysicalStockNominal = () => {
    if (window.confirm("🔄 Remise à Niveau Physique du Stock (Fin de Shift) :\n\nRéinitialiser l'ensemble des 20 références (Silicium, Wafers, Salle Blanche & Pièces Détachées) à leurs quantités nominales et bacs d'origine ?")) {
      setLocalItems(INITIAL_INVENTORY);
      setHasChanges(true);
      if (onUpdateInventory) {
        onUpdateInventory(INITIAL_INVENTORY);
      }
      showToast({
        title: 'Stock Physique Réinitialisé',
        message: 'Les 20 références sont remises à niveau pour les prochains duos !',
        type: 'success'
      });
    }
  };

  return (
    <div className="min-h-[calc(100vh-65px)] p-3 sm:p-5 flex flex-col gap-4 font-sans bg-slate-50 text-slate-900">
      {/* Datalist invisible pour les suggestions d'emplacements rapides */}
      <datalist id="warehouse-locations-list">
        {locationOptions.map((loc) => (
          <option key={loc.barcode} value={loc.barcode}>
            {loc.label}
          </option>
        ))}
      </datalist>

      {/* Top Banner & Command Bar GT Logistics */}
      <div className="bg-[#0c1e3a] text-white rounded-2xl p-4 border-b-2 border-red-600 flex flex-wrap items-center justify-between gap-4 shadow-md relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-sans font-black italic tracking-tight text-white text-lg">
              <span>gt</span>
              <span className="ml-1 not-italic font-bold text-slate-200 lowercase">logistics</span>
            </span>
            <span className="text-slate-400">•</span>
            <h2 className="text-base sm:text-lg font-black text-white tracking-wide uppercase">
              GESTION DES STOCKS & ERP TRAÇABILITÉ
            </h2>
            {hasChanges && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono text-[10px] font-bold uppercase animate-pulse">
                Modifications en attente
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300 font-sans mt-0.5 flex items-center gap-2">
            <span>Base de données magasins centraux CEA LETI</span>
            <span className="text-red-400">•</span>
            <span className="italic text-slate-300">Tous les champs sont éditables directement (Réf, Code-barres, Désignation, Emplacement)</span>
          </p>
        </div>

        {/* Action Buttons: Add / Save / Locations */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Nouveau Référence */}
          <button
            type="button"
            onClick={handleAddNewItem}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-sky-600/30 cursor-pointer transition-all"
            title="Créer une nouvelle référence d'article"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>+ Nouvel Article</span>
          </button>

          {/* Gérer Emplacements */}
          {onNavigateToAdminLocations && (
            <button
              type="button"
              onClick={onNavigateToAdminLocations}
              className="px-3 py-2 rounded-xl bg-[#0e2752] hover:bg-[#13356e] text-sky-300 hover:text-white border border-sky-500/40 font-bold text-xs flex items-center space-x-1.5 cursor-pointer transition-all"
              title="Configurer les étagères, tiroirs et zones physiques de l'entrepôt"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Gérer les Emplacements</span>
            </button>
          )}

          {/* Remise à Niveau Physique Fin de Shift */}
          <button
            type="button"
            onClick={handleResetPhysicalStockNominal}
            className="px-3 py-2 rounded-xl bg-amber-950/70 hover:bg-amber-900/90 text-amber-300 hover:text-white border border-amber-500/50 font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-amber-900/20 cursor-pointer transition-all"
            title="Remettre les 20 pièces à leurs quantités et bacs nominaux après le passage des duos"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>🔄 Remise à Niveau Physique (Fin de Shift)</span>
          </button>

          {/* Annuler si modifications */}
          {hasChanges && (
            <button
              type="button"
              onClick={handleCancelChanges}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center space-x-1.5 cursor-pointer border border-slate-700"
              title="Annuler les modifications en cours"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Annuler</span>
            </button>
          )}

          {/* Enregistrer les modifications */}
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveAll}
            className={`px-5 py-2 rounded-xl font-black text-xs flex items-center space-x-2 shadow-md cursor-pointer transition-all ${
              hasChanges
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 ring-2 ring-emerald-300 animate-pulse'
                : 'bg-white text-slate-800 hover:bg-slate-100 border border-slate-300'
            }`}
            title="Enregistrer toutes les modifications dans la base (Ctrl + S)"
          >
            <Save className="w-4 h-4 text-current" />
            <span>{isSaving ? 'Enregistrement...' : hasChanges ? 'Enregistrer les Modifications (Ctrl+S)' : 'Stock à Jour'}</span>
          </button>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher réf, SKU, emplacement..."
              className="bg-white border border-slate-300 pl-9 pr-3 py-1.5 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 w-56 sm:w-64 shadow-sm"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {cat === 'all' ? 'Tous' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stock Table avec Édition Directe Fiable - Modern Light ERP Styling */}
      <div className="bg-white rounded-2xl border border-slate-200 flex-1 overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-mono uppercase text-[10px] sm:text-[11px] sticky top-0 border-b border-slate-200 z-10">
              <tr>
                <th className="py-3 px-3">Réf Article</th>
                <th className="py-3 px-3">Code-barres SKU</th>
                <th className="py-3 px-3">Désignation & Description</th>
                <th className="py-3 px-3 text-right">Qté en stock</th>
                <th className="py-3 px-3">Emplacement Physique</th>
                <th className="py-3 px-3">Gestionnaire</th>
                <th className="py-3 px-3">Machine / Poste</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-mono">
                    Aucun article trouvé. Cliquez sur "+ Nouvel Article" pour en ajouter un.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/50 transition-colors group">
                    {/* 1. Réf article (ex: JNT_A001) */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <input
                        type="text"
                        value={item.lrCode || ''}
                        onChange={(e) => handleFieldChange(item.id, 'lrCode', e.target.value)}
                        placeholder="JNT_A001"
                        className="bg-amber-50 border border-amber-200 focus:border-amber-500 px-2.5 py-1 rounded-lg text-amber-900 font-mono font-bold w-28 text-xs focus:outline-none shadow-sm"
                        title="Référence courte article imprimée sur le ticket L/R"
                      />
                    </td>

                    {/* 2. Code-barres SKU (ex: REF191000007490) */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <input
                        type="text"
                        value={item.sku || ''}
                        onChange={(e) => handleFieldChange(item.id, 'sku', e.target.value)}
                        placeholder="REF191000..."
                        className="bg-slate-50 border border-slate-200 focus:border-blue-500 px-2.5 py-1 rounded-lg text-slate-800 font-mono font-bold w-40 text-xs focus:outline-none shadow-sm"
                        title="Code-barres scanné au laser par les joueurs"
                      />
                    </td>

                    {/* 3. Désignation & Description */}
                    <td className="py-2.5 px-3 min-w-[240px]">
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={item.name || ''}
                          onChange={(e) => handleFieldChange(item.id, 'name', e.target.value)}
                          placeholder="Nom de la pièce..."
                          className="bg-white border border-slate-200 focus:border-blue-500 px-2.5 py-1 rounded-lg text-slate-900 font-bold w-full text-xs focus:outline-none shadow-sm"
                        />
                        <input
                          type="text"
                          value={item.description || ''}
                          onChange={(e) => handleFieldChange(item.id, 'description', e.target.value)}
                          placeholder="Description / utilisation..."
                          className="bg-slate-50 border border-slate-200 focus:border-slate-300 px-2 py-0.5 rounded text-[10px] text-slate-500 w-full focus:outline-none"
                        />
                      </div>
                    </td>

                    {/* 4. Quantité en stock & Boutons delta */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            const newQ = Math.max(0, item.quantity - 1);
                            handleFieldChange(item.id, 'quantity', newQ);
                            onUpdateQuantity(item.id, -1);
                          }}
                          className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer shadow-sm"
                          title="-1 pièce"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleFieldChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
                          className="bg-slate-100 border border-slate-200 text-slate-900 px-1 py-1 rounded-lg font-mono font-bold w-14 text-xs text-right focus:outline-none shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newQ = item.quantity + 1;
                            handleFieldChange(item.id, 'quantity', newQ);
                            onUpdateQuantity(item.id, 1);
                          }}
                          className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer shadow-sm"
                          title="+1 pièce"
                        >
                          +
                        </button>
                        <input
                          type="text"
                          value={item.unit || 'pcs'}
                          onChange={(e) => handleFieldChange(item.id, 'unit', e.target.value)}
                          className="bg-slate-50 border border-slate-200 px-1 py-1 rounded text-slate-600 font-mono w-10 text-center text-[10px] focus:outline-none"
                          title="Unité de mesure (pcs, boîtes, etc.)"
                        />
                      </div>
                    </td>

                    {/* 5. Emplacement Physique (Avec Datalist & Choix Rapide) */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <input
                          type="text"
                          list="warehouse-locations-list"
                          value={item.location || ''}
                          onChange={(e) => handleFieldChange(item.id, 'location', e.target.value)}
                          placeholder="LOC-B01-T03..."
                          className="bg-blue-50/70 border border-blue-200 focus:border-blue-500 px-2.5 py-1 rounded-lg text-blue-900 font-mono font-bold w-40 text-xs focus:outline-none shadow-sm"
                          title="Emplacement physique dans l'entrepôt (tapez ou choisissez dans la liste)"
                        />
                      </div>
                    </td>

                    {/* 6. Gestionnaire */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <input
                        type="text"
                        value={item.gestionnaire || ''}
                        onChange={(e) => handleFieldChange(item.id, 'gestionnaire', e.target.value)}
                        placeholder="GT Logistics"
                        className="bg-white border border-slate-200 focus:border-slate-400 px-2.5 py-1 rounded-lg text-slate-700 text-xs w-28 focus:outline-none shadow-sm"
                      />
                    </td>

                    {/* 7. Machine / Poste */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <input
                        type="text"
                        value={item.machinePdt || ''}
                        onChange={(e) => handleFieldChange(item.id, 'machinePdt', e.target.value)}
                        placeholder="Poste / Bâti..."
                        className="bg-white border border-slate-200 focus:border-slate-400 px-2.5 py-1 rounded-lg text-slate-700 font-mono text-[11px] w-32 focus:outline-none shadow-sm"
                      />
                    </td>

                    {/* 8. Actions (Dupliquer / Supprimer) */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicateItem(item)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 border border-slate-200 transition-colors cursor-pointer shadow-sm"
                          title="Dupliquer cette référence"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id, item.name)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer shadow-sm"
                          title="Supprimer cette référence du stock"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info bar */}
        <div className="p-3 bg-[#08152c] border-t border-slate-700 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span>{filtered.length} référence(s) affichée(s)</span>
            <span className="text-slate-600">•</span>
            <span>Total stock : {filtered.reduce((acc, it) => acc + (it.quantity || 0), 0)} unités</span>
          </div>

          <div className="flex items-center gap-2">
            {hasChanges ? (
              <span className="text-amber-400 flex items-center gap-1 font-bold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>N'oubliez pas d'enregistrer vos modifications (Ctrl + S)</span>
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Toutes les références sont synchronisées</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
