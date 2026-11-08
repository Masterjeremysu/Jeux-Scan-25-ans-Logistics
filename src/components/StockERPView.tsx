import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { Search, Filter, AlertCircle, MapPin, Layers, RefreshCw } from 'lucide-react';

interface StockERPViewProps {
  inventory: InventoryItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
}

export const StockERPView: React.FC<StockERPViewProps> = ({ inventory, onUpdateQuantity }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filtered = inventory.filter((item) => {
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

  return (
    <div className="min-h-[calc(100vh-65px)] p-4 flex flex-col gap-4">
      {/* Top Controls */}
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div>
          <h2 className="text-xl font-extrabold text-white">GESTION DES STOCKS & ERP TRAÇABILITÉ</h2>
          <p className="text-xs text-slate-400 font-mono">Base de données magasins centraux CEA Minatec / LETI • Traçabilité Référence GT</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher réf, code-barres, machine..."
              className="bg-slate-950 border border-slate-700 pl-9 pr-3 py-1.5 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 w-72"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat === 'all' ? 'Toutes Catégories' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 flex-1 overflow-hidden shadow-xl flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[10px] sm:text-[11px] sticky top-0 border-b border-slate-800 z-10">
              <tr>
                <th className="py-3 px-3">Réf</th>
                <th className="py-3 px-3">Code-barres (SKU)</th>
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
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                  {/* Réf (L/R) */}
                  <td className="py-3 px-3 font-mono font-black text-amber-400 text-xs whitespace-nowrap">
                    {item.lrCode || item.sku.replace('ART-', 'REF_')}
                  </td>

                  {/* Code-barres SKU */}
                  <td className="py-3 px-3 font-mono font-bold text-sky-400 whitespace-nowrap">
                    {item.sku}
                  </td>

                  {/* Désignation */}
                  <td className="py-3 px-3 min-w-[200px]">
                    <div className="font-semibold text-slate-100 uppercase text-xs">{item.crLabel || item.name}</div>
                    {item.description && (
                      <div className="text-[10px] text-slate-400 font-sans truncate max-w-xs">{item.description}</div>
                    )}
                  </td>

                  {/* Quantité en stock */}
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <span className={`text-sm font-mono font-black ${
                      item.quantity <= 5 ? 'text-rose-400' : item.quantity <= 15 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {item.quantity}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1 font-mono">{item.unit}</span>
                  </td>

                  {/* Emplacement */}
                  <td className="py-3 px-3 font-mono font-bold text-sky-300 whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{item.location}</span>
                    </div>
                  </td>

                  {/* Gestionnaire */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium text-[10px] border border-slate-700">
                      {item.gestionnaire || 'GT Logistics'}
                    </span>
                  </td>

                  {/* Machine PDT */}
                  <td className="py-3 px-3 font-mono text-slate-300 text-[11px] whitespace-nowrap">
                    {item.machinePdt || 'Standard'}
                  </td>

                  {/* Réf Équipementier */}
                  <td className="py-3 px-3 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                    {item.refEquipementier || '-'}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center space-x-1">
                      <button
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700"
                        title="Consommer 1 unité"
                      >
                        -
                      </button>
                      <button
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        className="w-6 h-6 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold"
                        title="Ajouter 1 unité"
                      >
                        +
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Stats */}
        <div className="bg-slate-950/80 p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Total Références Actives : {filtered.length}</span>
          <span>Synchronisé en temps réel avec le réceptacle douchette</span>
        </div>
      </div>
    </div>
  );
};
