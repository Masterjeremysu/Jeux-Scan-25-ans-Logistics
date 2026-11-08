import React, { useState } from 'react';
import { Mission, InventoryItem, AppConfig } from '../types';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Trash2, 
  Plus, 
  Check, 
  Cloud, 
  Download, 
  Upload, 
  AlertTriangle,
  Layers,
  Boxes,
  FileText,
  Clock,
  Award
} from 'lucide-react';
import { saveAppConfig, resetAllScores } from '../services/supabaseClient';
import { INITIAL_INVENTORY } from '../data/initialData';
import { MISSIONS } from '../data/missions';

interface AdminConfigViewProps {
  appConfig: AppConfig;
  onUpdateAppConfig: (config: AppConfig) => void;
  missions: Mission[];
  onUpdateMissions: (missions: Mission[]) => void;
  inventory: InventoryItem[];
  onUpdateInventory: (inventory: InventoryItem[]) => void;
}

export const AdminConfigView: React.FC<AdminConfigViewProps> = ({
  appConfig,
  onUpdateAppConfig,
  missions,
  onUpdateMissions,
  inventory,
  onUpdateInventory
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'missions' | 'inventory' | 'reset'>('general');
  const [localConfig, setLocalConfig] = useState<AppConfig>(appConfig);
  const [localMissions, setLocalMissions] = useState<Mission[]>(missions);
  const [localInventory, setLocalInventory] = useState<InventoryItem[]>(inventory);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [selectedMissionIndex, setSelectedMissionIndex] = useState<number>(0);

  // Save to Cloud and State
  const handleSaveAll = async () => {
    setSaveStatus('Sauvegarde en cours...');
    onUpdateAppConfig(localConfig);
    onUpdateMissions(localMissions);
    onUpdateInventory(localInventory);

    const success = await saveAppConfig({
      ...localConfig,
      missions: localMissions,
      inventory: localInventory
    });

    if (success) {
      setSaveStatus('✓ Modifications enregistrées et synchronisées sur le Cloud !');
    } else {
      setSaveStatus('✓ Enregistré localement (hors-ligne)');
    }
    setTimeout(() => setSaveStatus(null), 3500);
  };

  // Reset to default CEA stock & missions
  const handleRestoreDefaults = () => {
    if (confirm('Voulez-vous rétablir les missions et articles par défaut du CEA ?')) {
      setLocalMissions(MISSIONS);
      setLocalInventory(INITIAL_INVENTORY);
      setLocalConfig({
        eventTitle: 'CEA GRENOBLE',
        eventSubtitle: 'WMS Industrial Terminal • Shift Challenge',
        badgeLabel: 'ÉDITION 25 ANS',
        shiftDurationSeconds: 300
      });
      setSaveStatus('Valeurs d\'origine rechargées. Cliquez sur Sauvegarder pour appliquer.');
    }
  };

  // Reset scores on podium
  const handleClearScores = async () => {
    if (confirm('Attention : Voulez-vous vraiment effacer tous les scores du classement pour repartir à zéro ?')) {
      await resetAllScores();
      alert('Le tableau des scores a été remis à zéro avec succès !');
    }
  };

  // Export JSON configuration file
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(
      JSON.stringify({ config: localConfig, missions: localMissions, inventory: localInventory }, null, 2)
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `config_cea_wms_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Add step to mission
  const handleAddStep = (missionIdx: number) => {
    const updated = [...localMissions];
    const m = updated[missionIdx];
    const newStep = {
      id: `step-${Date.now()}`,
      instruction: 'Nouvelle instruction de scan...',
      expectedBarcode: 'ART-NEW-CODE',
      barcodeType: 'article' as const,
      targetLabel: 'Nouvel Article',
      completed: false,
      hint: 'Scannez le code-barres indiqué.'
    };
    m.steps.push(newStep);
    setLocalMissions(updated);
  };

  // Remove step from mission
  const handleRemoveStep = (missionIdx: number, stepIdx: number) => {
    const updated = [...localMissions];
    updated[missionIdx].steps.splice(stepIdx, 1);
    setLocalMissions(updated);
  };

  // Add new mission
  const handleAddMission = () => {
    const newMission: Mission = {
      id: `mission-${Date.now()}`,
      title: 'Nouvelle Mission Personnalisée',
      code: `ORD-CUSTOM-${Date.now().toString().slice(-4)}`,
      client: 'Laboratoire CEA / Partenaire',
      priority: 'STANDARD',
      description: 'Description de la mission à accomplir...',
      timeLimitSeconds: 120,
      basePoints: 1000,
      steps: [
        {
          id: `step-1`,
          instruction: 'Scannez l\'emplacement de stockage.',
          expectedBarcode: 'LOC-B01-T03',
          barcodeType: 'location',
          targetLabel: 'Emplacement Tiroir T03',
          completed: false,
          hint: 'Visez l\'étiquette d\'emplacement.'
        }
      ]
    };
    setLocalMissions([...localMissions, newMission]);
    setSelectedMissionIndex(localMissions.length);
  };

  return (
    <div className="min-h-[calc(100vh-65px)] p-4 flex flex-col gap-4 max-w-6xl mx-auto w-full">
      {/* Top Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Settings className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center space-x-2">
              <span>ADMINISTRATION & PERSONNALISATION DE L'APPLICATION</span>
            </h2>
            <p className="text-xs text-slate-300">
              Modifiez tout en direct sans toucher au code : titres, missions, codes-barres, pièces et chronos.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleSaveAll}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Enregistrer & Synchroniser</span>
          </button>
        </div>
      </div>

      {/* Save Notification */}
      {saveStatus && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Navigation Sub-tabs */}
      <div className="flex space-x-2 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'general' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>1. Général & Titres</span>
        </button>

        <button
          onClick={() => setActiveTab('missions')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'missions' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>2. Éditeur de Missions ({localMissions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'inventory' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>3. Articles & Stocks ({localInventory.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reset')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'reset' ? 'bg-rose-900/60 text-rose-300' : 'text-slate-400 hover:text-rose-300'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>4. Remise à Zéro & Sauvegarde</span>
        </button>
      </div>

      {/* TAB 1: General Settings */}
      {activeTab === 'general' && (
        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold font-mono text-slate-300 uppercase">Paramètres de l'Événement :</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Titre Principal dans l'En-tête :</label>
              <input
                type="text"
                value={localConfig.eventTitle}
                onChange={(e) => setLocalConfig({ ...localConfig, eventTitle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 px-3.5 py-2 rounded-xl text-sm text-white font-bold"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Badge Thématique (en doré) :</label>
              <input
                type="text"
                value={localConfig.badgeLabel}
                onChange={(e) => setLocalConfig({ ...localConfig, badgeLabel: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 px-3.5 py-2 rounded-xl text-sm text-white font-bold"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Sous-titre / Description :</label>
              <input
                type="text"
                value={localConfig.eventSubtitle}
                onChange={(e) => setLocalConfig({ ...localConfig, eventSubtitle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 px-3.5 py-2 rounded-xl text-sm text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Durée du Chrono de Shift (secondes) :</label>
              <input
                type="number"
                value={localConfig.shiftDurationSeconds}
                onChange={(e) => setLocalConfig({ ...localConfig, shiftDurationSeconds: parseInt(e.target.value) || 300 })}
                className="w-full bg-slate-950 border border-slate-700 px-3.5 py-2 rounded-xl text-sm text-white font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Exemple : 300 = 5 minutes • 180 = 3 minutes
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Missions Editor */}
      {activeTab === 'missions' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Mission List Sidebar */}
          <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-xl space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold font-mono text-slate-400 uppercase">Missions actives</span>
              <button
                onClick={handleAddMission}
                className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs flex items-center space-x-1"
                title="Ajouter une mission"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter</span>
              </button>
            </div>

            <div className="space-y-2">
              {localMissions.map((m, idx) => (
                <div
                  key={m.id || idx}
                  onClick={() => setSelectedMissionIndex(idx)}
                  className={`p-3 rounded-2xl cursor-pointer border transition-all text-left ${
                    selectedMissionIndex === idx
                      ? 'bg-indigo-950/40 border-indigo-500 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 mb-1 inline-block">
                    {m.code}
                  </span>
                  <h4 className="text-xs font-bold line-clamp-1">{m.title}</h4>
                  <span className="text-[10px] text-slate-500 font-mono block">
                    {m.steps.length} étapes • {m.basePoints} pts
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mission Details & Steps Editor */}
          {localMissions[selectedMissionIndex] && (
            <div className="md:col-span-2 bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white">
                  Édition de : {localMissions[selectedMissionIndex].title}
                </h3>
                {localMissions.length > 1 && (
                  <button
                    onClick={() => {
                      if (confirm('Supprimer cette mission ?')) {
                        const updated = localMissions.filter((_, i) => i !== selectedMissionIndex);
                        setLocalMissions(updated);
                        setSelectedMissionIndex(0);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-rose-900/40 hover:bg-rose-800 text-rose-300 text-xs flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Titre de la Mission :</label>
                  <input
                    type="text"
                    value={localMissions[selectedMissionIndex].title}
                    onChange={(e) => {
                      const updated = [...localMissions];
                      updated[selectedMissionIndex].title = e.target.value;
                      setLocalMissions(updated);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Code Mission :</label>
                  <input
                    type="text"
                    value={localMissions[selectedMissionIndex].code}
                    onChange={(e) => {
                      const updated = [...localMissions];
                      updated[selectedMissionIndex].code = e.target.value;
                      setLocalMissions(updated);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Client / Demandeur :</label>
                  <input
                    type="text"
                    value={localMissions[selectedMissionIndex].client}
                    onChange={(e) => {
                      const updated = [...localMissions];
                      updated[selectedMissionIndex].client = e.target.value;
                      setLocalMissions(updated);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-white"
                  />
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 block mb-1">Points :</label>
                    <input
                      type="number"
                      value={localMissions[selectedMissionIndex].basePoints}
                      onChange={(e) => {
                        const updated = [...localMissions];
                        updated[selectedMissionIndex].basePoints = parseInt(e.target.value) || 1000;
                        setLocalMissions(updated);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-white font-mono"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 block mb-1">Temps (sec) :</label>
                    <input
                      type="number"
                      value={localMissions[selectedMissionIndex].timeLimitSeconds}
                      onChange={(e) => {
                        const updated = [...localMissions];
                        updated[selectedMissionIndex].timeLimitSeconds = parseInt(e.target.value) || 120;
                        setLocalMissions(updated);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Steps List */}
              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold font-mono text-slate-300 uppercase">
                    Étapes de Scan ({localMissions[selectedMissionIndex].steps.length})
                  </h4>
                  <button
                    onClick={() => handleAddStep(selectedMissionIndex)}
                    className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter une Étape</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {localMissions[selectedMissionIndex].steps.map((step, sIdx) => (
                    <div key={step.id || sIdx} className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-sky-400">Étape #{sIdx + 1}</span>
                        {localMissions[selectedMissionIndex].steps.length > 1 && (
                          <button
                            onClick={() => handleRemoveStep(selectedMissionIndex, sIdx)}
                            className="text-rose-400 hover:text-rose-300 p-1"
                            title="Supprimer cette étape"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div className="md:col-span-2">
                          <label className="text-[10px] text-slate-500 block">Instruction affichée à l'écran :</label>
                          <input
                            type="text"
                            value={step.instruction}
                            onChange={(e) => {
                              const updated = [...localMissions];
                              updated[selectedMissionIndex].steps[sIdx].instruction = e.target.value;
                              setLocalMissions(updated);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-amber-400 font-bold block">Code-Barres Attendu :</label>
                          <input
                            type="text"
                            value={step.expectedBarcode}
                            onChange={(e) => {
                              const updated = [...localMissions];
                              updated[selectedMissionIndex].steps[sIdx].expectedBarcode = e.target.value.trim().toUpperCase();
                              setLocalMissions(updated);
                            }}
                            className="w-full bg-slate-900 border border-amber-600/60 px-2.5 py-1 rounded-lg text-xs text-amber-300 font-mono font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 block">Nom / Libellé Cible :</label>
                          <input
                            type="text"
                            value={step.targetLabel}
                            onChange={(e) => {
                              const updated = [...localMissions];
                              updated[selectedMissionIndex].steps[sIdx].targetLabel = e.target.value;
                              setLocalMissions(updated);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg text-xs text-white"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-[10px] text-slate-500 block">Indice / Aide :</label>
                          <input
                            type="text"
                            value={step.hint}
                            onChange={(e) => {
                              const updated = [...localMissions];
                              updated[selectedMissionIndex].steps[sIdx].hint = e.target.value;
                              setLocalMissions(updated);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg text-xs text-slate-400"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Inventory Editor */}
      {activeTab === 'inventory' && (
        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-mono text-slate-300 uppercase">
              Catalogue Pièces & Emplacements ({localInventory.length})
            </h3>
            <button
              onClick={() => {
                const newItem: InventoryItem = {
                  id: `item-${Date.now()}`,
                  sku: `ART-NEW-${Date.now().toString().slice(-3)}`,
                  name: 'Nouvelle Pièce CEA',
                  category: 'Consommables',
                  location: 'LOC-A01-T01',
                  quantity: 10,
                  unit: 'pcs',
                  critical: false,
                  batch: 'LOT-2026-NEW',
                  description: 'Description du nouvel article...'
                };
                setLocalInventory([...localInventory, newItem]);
              }}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter un Article</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Code SKU (Code-Barres)</th>
                  <th className="p-2.5">Désignation</th>
                  <th className="p-2.5">Casier / Emplacement</th>
                  <th className="p-2.5">Qté</th>
                  <th className="p-2.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {localInventory.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-800/30">
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={item.sku}
                        onChange={(e) => {
                          const updated = [...localInventory];
                          updated[idx].sku = e.target.value.trim().toUpperCase();
                          setLocalInventory(updated);
                        }}
                        className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-amber-300 font-mono font-bold w-36"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => {
                          const updated = [...localInventory];
                          updated[idx].name = e.target.value;
                          setLocalInventory(updated);
                        }}
                        className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-white font-semibold w-full"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={item.location}
                        onChange={(e) => {
                          const updated = [...localInventory];
                          updated[idx].location = e.target.value.trim().toUpperCase();
                          setLocalInventory(updated);
                        }}
                        className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-sky-400 font-mono w-28"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...localInventory];
                          updated[idx].quantity = parseInt(e.target.value) || 0;
                          setLocalInventory(updated);
                        }}
                        className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-emerald-400 font-mono w-16"
                      />
                    </td>
                    <td className="p-2.5">
                      <button
                        onClick={() => {
                          const updated = localInventory.filter((_, i) => i !== idx);
                          setLocalInventory(updated);
                        }}
                        className="text-rose-400 hover:text-rose-300 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Reset & Backup */}
      {activeTab === 'reset' && (
        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
          <h3 className="text-sm font-bold font-mono text-slate-300 uppercase">
            Gestion des Données, Sauvegardes & Remise à Zéro :
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Clear Scores */}
            <div className="bg-slate-950/80 p-5 rounded-2xl border border-rose-900/40 space-y-3">
              <div className="flex items-center space-x-2 text-rose-400">
                <Trash2 className="w-5 h-5" />
                <h4 className="text-xs font-bold uppercase">Remise à zéro du Podium</h4>
              </div>
              <p className="text-[11px] text-slate-400">
                Efface tous les scores enregistrés pour démarrer une nouvelle journée d'animation avec un classement vierge.
              </p>
              <button
                onClick={handleClearScores}
                className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                Vider le Classement
              </button>
            </div>

            {/* Restore CEA Defaults */}
            <div className="bg-slate-950/80 p-5 rounded-2xl border border-amber-900/40 space-y-3">
              <div className="flex items-center space-x-2 text-amber-400">
                <RotateCcw className="w-5 h-5" />
                <h4 className="text-xs font-bold uppercase">Rétablir Scénarios CEA</h4>
              </div>
              <p className="text-[11px] text-slate-400">
                Rétablit les 3 missions d'origine (LETI Bât. 17, Wafers Minatec, Réception Edwards).
              </p>
              <button
                onClick={handleRestoreDefaults}
                className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
              >
                Rétablir Valeurs d'Origine
              </button>
            </div>

            {/* Export JSON */}
            <div className="bg-slate-950/80 p-5 rounded-2xl border border-sky-900/40 space-y-3">
              <div className="flex items-center space-x-2 text-sky-400">
                <Download className="w-5 h-5" />
                <h4 className="text-xs font-bold uppercase">Exporter en Fichier JSON</h4>
              </div>
              <p className="text-[11px] text-slate-400">
                Téléchargez un fichier de sauvegarde contenant toute votre configuration (missions et stocks).
              </p>
              <button
                onClick={handleExportJson}
                className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
              >
                Télécharger Sauvegarde (.json)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
