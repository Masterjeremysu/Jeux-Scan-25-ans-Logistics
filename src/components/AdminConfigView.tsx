import React, { useState, useRef } from 'react';
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
  Award,
  Copy,
  ArrowUp,
  ArrowDown,
  Monitor,
  Flame,
  Globe,
  Radio,
  FileSpreadsheet
} from 'lucide-react';
import { saveAppConfig, resetAllScores, resetLiveActivity } from '../services/supabaseClient';
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
  const [activeTab, setActiveTab] = useState<'branding' | 'rules' | 'stations' | 'missions' | 'inventory' | 'database'>('branding');
  const [localConfig, setLocalConfig] = useState<AppConfig>(appConfig);
  const [localMissions, setLocalMissions] = useState<Mission[]>(missions);
  const [localInventory, setLocalInventory] = useState<InventoryItem[]>(inventory);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [selectedMissionIndex, setSelectedMissionIndex] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save to Cloud and local state
  const handleSaveAll = async () => {
    setSaveStatus('Sauvegarde dans Supabase en cours...');
    onUpdateAppConfig(localConfig);
    onUpdateMissions(localMissions);
    onUpdateInventory(localInventory);

    const success = await saveAppConfig({
      ...localConfig,
      missions: localMissions,
      inventory: localInventory
    });

    if (success) {
      setSaveStatus('✓ Configuration enregistrée dans Supabase et synchronisée sur tous les postes !');
    } else {
      setSaveStatus('✓ Enregistré localement (hors-ligne)');
    }
    setTimeout(() => setSaveStatus(null), 3500);
  };

  // Import Template CEA
  const handleLoadCeaTemplate = () => {
    if (confirm('Voulez-vous charger les 3 missions et articles modèles du CEA ?')) {
      setLocalMissions(MISSIONS);
      setLocalInventory(INITIAL_INVENTORY);
      setSaveStatus('Modèle CEA chargé dans l\'éditeur. Cliquez sur Sauvegarder pour propager aux postes.');
    }
  };

  // Clear all missions
  const handleClearAllMissions = () => {
    if (confirm('Attention : Voulez-vous supprimer toutes les missions pour en créer de nouvelles ?')) {
      setLocalMissions([]);
      setSelectedMissionIndex(0);
    }
  };

  // Clear all inventory
  const handleClearAllInventory = () => {
    if (confirm('Attention : Voulez-vous vider tout le catalogue de stock ?')) {
      setLocalInventory([]);
    }
  };

  // Reset scores on podium
  const handleClearScores = async () => {
    if (confirm('Attention : Voulez-vous vraiment effacer tous les scores du classement pour repartir à zéro le jour J ?')) {
      await resetAllScores();
      alert('Le tableau des scores a été remis à zéro avec succès !');
    }
  };

  // Reset live scans
  const handleClearLiveScans = async () => {
    if (confirm('Voulez-vous effacer l\'historique des scans en direct ?')) {
      await resetLiveActivity();
      alert('Historique des scans en direct vidé !');
    }
  };

  // Export JSON configuration file
  const handleExportJson = () => {
    const payload = {
      exportDate: new Date().toISOString(),
      config: localConfig,
      missions: localMissions,
      inventory: localInventory
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `wms_scenario_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON configuration file
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.config) setLocalConfig(parsed.config);
        if (Array.isArray(parsed.missions)) setLocalMissions(parsed.missions);
        if (Array.isArray(parsed.inventory)) setLocalInventory(parsed.inventory);
        setSelectedMissionIndex(0);
        setSaveStatus('✓ Fichier JSON importé avec succès ! Cliquez sur "Enregistrer" pour appliquer.');
      } catch {
        alert('Erreur : Fichier JSON invalide ou corrompu.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Duplicate a mission
  const handleDuplicateMission = (idx: number) => {
    const src = localMissions[idx];
    const copy: Mission = {
      ...src,
      id: `mission-${Date.now()}`,
      title: `${src.title} (Copie)`,
      code: `${src.code}-BIS`,
      steps: src.steps.map((s, i) => ({ ...s, id: `step-${Date.now()}-${i}`, completed: false }))
    };
    const updated = [...localMissions, copy];
    setLocalMissions(updated);
    setSelectedMissionIndex(updated.length - 1);
  };

  // Add step to mission
  const handleAddStep = (missionIdx: number) => {
    const updated = [...localMissions];
    const m = updated[missionIdx];
    const newStep = {
      id: `step-${Date.now()}`,
      instruction: 'Scannez l\'article...',
      expectedBarcode: 'ART-NOUVEAU',
      barcodeType: 'article' as const,
      targetLabel: 'Nouvelle Pièce',
      completed: false,
      hint: 'Scannez le code affiché.'
    };
    m.steps.push(newStep);
    setLocalMissions(updated);
  };

  // Move step up/down
  const handleMoveStep = (missionIdx: number, stepIdx: number, direction: 'up' | 'down') => {
    const updated = [...localMissions];
    const steps = updated[missionIdx].steps;
    const targetIdx = direction === 'up' ? stepIdx - 1 : stepIdx + 1;
    if (targetIdx < 0 || targetIdx >= steps.length) return;
    const temp = steps[stepIdx];
    steps[stepIdx] = steps[targetIdx];
    steps[targetIdx] = temp;
    setLocalMissions(updated);
  };

  // Remove step from mission
  const handleRemoveStep = (missionIdx: number, stepIdx: number) => {
    const updated = [...localMissions];
    updated[missionIdx].steps.splice(stepIdx, 1);
    setLocalMissions(updated);
  };

  // Add new mission from scratch
  const handleAddMission = () => {
    const newMission: Mission = {
      id: `mission-${Date.now()}`,
      title: 'Nouvelle Mission de Picking',
      code: `ORD-${Date.now().toString().slice(-4)}`,
      client: 'Laboratoire / Quai Expédition',
      priority: 'STANDARD',
      description: 'Préparez les articles demandés et validez sur le quai d\'expédition.',
      timeLimitSeconds: 120,
      basePoints: 1000,
      steps: [
        {
          id: `step-1`,
          instruction: 'Scannez l\'emplacement de préparation.',
          expectedBarcode: 'LOC-A01-T01',
          barcodeType: 'location',
          targetLabel: 'Emplacement Allée A',
          completed: false,
          hint: 'Visez l\'étiquette du casier.'
        }
      ]
    };
    setLocalMissions([...localMissions, newMission]);
    setSelectedMissionIndex(localMissions.length);
  };

  // Add station
  const handleAddStation = () => {
    const num = (localConfig.availableStations?.length || 0) + 1;
    const newStation = {
      id: `poste-${num}`,
      name: `Poste ${num} (Scannette ${String.fromCharCode(64 + num)})`
    };
    setLocalConfig({
      ...localConfig,
      availableStations: [...(localConfig.availableStations || []), newStation]
    });
  };

  // Remove station
  const handleRemoveStation = (id: string) => {
    setLocalConfig({
      ...localConfig,
      availableStations: (localConfig.availableStations || []).filter((s) => s.id !== id)
    });
  };

  return (
    <div className="min-h-[calc(100vh-65px)] p-3 sm:p-5 flex flex-col gap-4 max-w-7xl mx-auto w-full select-none">
      {/* Top Banner */}
      <div className="bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
            <Settings className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center space-x-2">
              <span>AXE DE PARAMÉTRAGE INTÉGRAL (CMS DE JEU)</span>
            </h2>
            <p className="text-xs text-slate-300">
              Construisez vos scénarios, missions, codes-barres et règles sans aucune contrainte de code en dur.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleSaveAll}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center space-x-2 shadow-lg shadow-emerald-500/30 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Enregistrer & Synchroniser Tout</span>
          </button>
        </div>
      </div>

      {/* Save Notification */}
      {saveStatus && (
        <div className="bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center space-x-2 shadow-lg">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Navigation Tabs (Fully Responsive) */}
      <div className="flex space-x-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto scrollbar-none shrink-0">
        <button
          onClick={() => setActiveTab('branding')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'branding' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>1. Événement & Titres</span>
        </button>

        <button
          onClick={() => setActiveTab('missions')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'missions' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>2. Missions ({localMissions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'inventory' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>3. Articles & Stocks ({localInventory.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('stations')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'stations' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>4. Postes & Scannettes ({localConfig.availableStations?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'rules' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>5. Règles & Diplômes</span>
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'database' ? 'bg-rose-900/60 text-rose-300' : 'text-slate-400 hover:text-rose-300'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>6. Données & Sauvegardes</span>
        </button>
      </div>

      {/* TAB 1: BRANDING & TITLES */}
      {activeTab === 'branding' && (
        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold font-mono text-slate-300 uppercase">
            Identité Visuelle & Textes de l'Événement :
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Titre de l'Événement (Haut Gauche) :</label>
              <input
                type="text"
                value={localConfig.eventTitle}
                onChange={(e) => setLocalConfig({ ...localConfig, eventTitle: e.target.value })}
                placeholder="Ex: CEA GRENOBLE"
                className="w-full bg-slate-950 border border-slate-700 px-3.5 py-2.5 rounded-xl text-sm text-white font-bold"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Badge Thématique (Pastille Dorée) :</label>
              <input
                type="text"
                value={localConfig.badgeLabel}
                onChange={(e) => setLocalConfig({ ...localConfig, badgeLabel: e.target.value })}
                placeholder="Ex: ÉDITION 25 ANS"
                className="w-full bg-slate-950 border border-slate-700 px-3.5 py-2.5 rounded-xl text-sm text-white font-bold text-amber-300"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Sous-titre / Thème de l'Animation :</label>
              <input
                type="text"
                value={localConfig.eventSubtitle}
                onChange={(e) => setLocalConfig({ ...localConfig, eventSubtitle: e.target.value })}
                placeholder="Ex: WMS Industrial Terminal • Shift Challenge"
                className="w-full bg-slate-950 border border-slate-700 px-3.5 py-2.5 rounded-xl text-sm text-white font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">URL Publique de l'Application (pour le QR Code TV) :</label>
              <input
                type="text"
                value={localConfig.publicUrl || 'https://jeux-scan-25-ans-logistics.vercel.app'}
                onChange={(e) => setLocalConfig({ ...localConfig, publicUrl: e.target.value })}
                placeholder="https://..."
                className="w-full bg-slate-950 border border-slate-700 px-3.5 py-2.5 rounded-xl text-sm text-sky-400 font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MISSIONS BUILDER (THE CORE SCENARIO BUILDER) */}
      {activeTab === 'missions' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Mission List Sidebar */}
          <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold font-mono text-slate-400 uppercase">Missions ({localMissions.length})</span>
              <button
                onClick={handleAddMission}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Créer</span>
              </button>
            </div>

            {localMissions.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 space-y-3">
                <p>Aucune mission configurée.</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleAddMission}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold"
                  >
                    + Créer une Mission
                  </button>
                  <button
                    onClick={handleLoadCeaTemplate}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                  >
                    Charger Modèle CEA
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {localMissions.map((m, idx) => (
                  <div
                    key={m.id || idx}
                    onClick={() => setSelectedMissionIndex(idx)}
                    className={`p-3 rounded-2xl cursor-pointer border transition-all text-left ${
                      selectedMissionIndex === idx
                        ? 'bg-indigo-950/50 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        {m.code || `M-${idx + 1}`}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">
                        +{m.basePoints} pts
                      </span>
                    </div>
                    <h4 className="text-xs font-bold line-clamp-1">{m.title}</h4>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {m.steps.length} étape(s) • {m.timeLimitSeconds}s
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Actions */}
            <div className="pt-2 border-t border-slate-800 flex gap-2">
              <button
                onClick={handleLoadCeaTemplate}
                className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold"
                title="Rétablir les scénarios CEA de référence"
              >
                Template CEA
              </button>
              <button
                onClick={handleClearAllMissions}
                className="p-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-[11px]"
                title="Tout vider"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mission Details & Step Sequence Editor */}
          {localMissions[selectedMissionIndex] ? (
            <div className="md:col-span-2 bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>Mission #{selectedMissionIndex + 1} :</span>
                  <span className="text-indigo-400">{localMissions[selectedMissionIndex].title}</span>
                </h3>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDuplicateMission(selectedMissionIndex)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1"
                    title="Dupliquer cette mission"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Dupliquer</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Supprimer cette mission ?')) {
                        const updated = localMissions.filter((_, i) => i !== selectedMissionIndex);
                        setLocalMissions(updated);
                        setSelectedMissionIndex(Math.max(0, selectedMissionIndex - 1));
                      }
                    }}
                    className="p-2 rounded-xl bg-rose-900/40 hover:bg-rose-800 text-rose-300 text-xs flex items-center space-x-1"
                    title="Supprimer cette mission"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* General Mission Info */}
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
                    className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Code Référence :</label>
                  <input
                    type="text"
                    value={localMissions[selectedMissionIndex].code}
                    onChange={(e) => {
                      const updated = [...localMissions];
                      updated[selectedMissionIndex].code = e.target.value;
                      setLocalMissions(updated);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Client / Destinataire :</label>
                  <input
                    type="text"
                    value={localMissions[selectedMissionIndex].client}
                    onChange={(e) => {
                      const updated = [...localMissions];
                      updated[selectedMissionIndex].client = e.target.value;
                      setLocalMissions(updated);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white"
                  />
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 block mb-1">Priorité :</label>
                    <select
                      value={localMissions[selectedMissionIndex].priority}
                      onChange={(e) => {
                        const updated = [...localMissions];
                        updated[selectedMissionIndex].priority = e.target.value as any;
                        setLocalMissions(updated);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white focus:outline-none"
                    >
                      <option value="STANDARD">STANDARD</option>
                      <option value="URGENCE CRITIQUE">URGENCE CRITIQUE</option>
                      <option value="EXPÉDITION INTERNATIONALE">EXPÉDITION INTERNATIONALE</option>
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="text-xs text-slate-400 block mb-1">Points :</label>
                    <input
                      type="number"
                      value={localMissions[selectedMissionIndex].basePoints}
                      onChange={(e) => {
                        const updated = [...localMissions];
                        updated[selectedMissionIndex].basePoints = parseInt(e.target.value) || 0;
                        setLocalMissions(updated);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 px-2 py-2 rounded-xl text-xs text-emerald-400 font-mono font-bold"
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-xs text-slate-400 block mb-1">Temps (s) :</label>
                    <input
                      type="number"
                      value={localMissions[selectedMissionIndex].timeLimitSeconds}
                      onChange={(e) => {
                        const updated = [...localMissions];
                        updated[selectedMissionIndex].timeLimitSeconds = parseInt(e.target.value) || 0;
                        setLocalMissions(updated);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 px-2 py-2 rounded-xl text-xs text-amber-400 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-slate-400 block mb-1">Description du scénario :</label>
                  <textarea
                    rows={2}
                    value={localMissions[selectedMissionIndex].description}
                    onChange={(e) => {
                      const updated = [...localMissions];
                      updated[selectedMissionIndex].description = e.target.value;
                      setLocalMissions(updated);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-slate-200"
                  />
                </div>
              </div>

              {/* Steps Sequence List */}
              <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-bold font-mono text-slate-200 uppercase">
                      Étapes de Scan ({localMissions[selectedMissionIndex].steps.length})
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Les codes-barres doivent être scannés dans cet ordre par la scannette.
                    </span>
                  </div>
                  <button
                    onClick={() => handleAddStep(selectedMissionIndex)}
                    className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter une Étape</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {localMissions[selectedMissionIndex].steps.map((step, sIdx) => (
                    <div key={step.id || sIdx} className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-lg bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center font-mono">
                            {sIdx + 1}
                          </span>
                          <span className="text-xs font-bold text-white">Étape #{sIdx + 1}</span>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleMoveStep(selectedMissionIndex, sIdx, 'up')}
                            disabled={sIdx === 0}
                            className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
                            title="Monter"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveStep(selectedMissionIndex, sIdx, 'down')}
                            disabled={sIdx === localMissions[selectedMissionIndex].steps.length - 1}
                            className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
                            title="Descendre"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveStep(selectedMissionIndex, sIdx)}
                            className="p-1 rounded bg-rose-950 text-rose-300 hover:text-white ml-1"
                            title="Supprimer cette étape"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div className="md:col-span-2">
                          <label className="text-[10px] text-slate-400 block">Instruction affichée au joueur :</label>
                          <input
                            type="text"
                            value={step.instruction}
                            onChange={(e) => {
                              const updated = [...localMissions];
                              updated[selectedMissionIndex].steps[sIdx].instruction = e.target.value;
                              setLocalMissions(updated);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white"
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
                            className="w-full bg-slate-900 border border-amber-500/60 px-2.5 py-1.5 rounded-lg text-xs text-amber-300 font-mono font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block">Désignation Cible :</label>
                          <input
                            type="text"
                            value={step.targetLabel}
                            onChange={(e) => {
                              const updated = [...localMissions];
                              updated[selectedMissionIndex].steps[sIdx].targetLabel = e.target.value;
                              setLocalMissions(updated);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block">Type d'Élément :</label>
                          <select
                            value={step.barcodeType}
                            onChange={(e) => {
                              const updated = [...localMissions];
                              updated[selectedMissionIndex].steps[sIdx].barcodeType = e.target.value as any;
                              setLocalMissions(updated);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 px-2 py-1.5 rounded-lg text-xs text-white"
                          >
                            <option value="article">📦 Article / Pièce</option>
                            <option value="location">📍 Emplacement / Casier</option>
                            <option value="package">📫 Colis / Carton</option>
                            <option value="seal">🔒 Scellé de Sécurité</option>
                            <option value="dock">⚓ Quai d'Expédition</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block">Astuce / Conseil au joueur :</label>
                          <input
                            type="text"
                            value={step.hint}
                            onChange={(e) => {
                              const updated = [...localMissions];
                              updated[selectedMissionIndex].steps[sIdx].hint = e.target.value;
                              setLocalMissions(updated);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-slate-300"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="md:col-span-2 bg-slate-900 rounded-3xl p-8 border border-slate-800 text-center text-slate-500">
              Sélectionnez ou créez une mission pour commencer à l'éditer.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INVENTORY BUILDER (ERP ITEMS & STOCK) */}
      {activeTab === 'inventory' && (
        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold font-mono text-slate-200 uppercase">
                Catalogue Matériel & Stocks ERP ({localInventory.length})
              </h3>
              <p className="text-xs text-slate-400">
                Définissez les pièces, cartons et emplacements physiques. La planche d'impression s'adaptera automatiquement.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleLoadCeaTemplate}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Template CEA
              </button>
              <button
                onClick={handleClearAllInventory}
                className="p-1.5 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 text-xs"
                title="Vider le stock"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  const newItem: InventoryItem = {
                    id: `item-${Date.now()}`,
                    sku: `ART-PIECE-${Date.now().toString().slice(-4)}`,
                    name: 'Nouvelle Pièce',
                    category: 'Consommables',
                    location: 'LOC-A01-T01',
                    quantity: 10,
                    unit: 'pcs',
                    critical: false,
                    batch: 'LOT-2026',
                    description: 'Description de la pièce...'
                  };
                  setLocalInventory([...localInventory, newItem]);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter un Article</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Code SKU (Code-Barres)</th>
                  <th className="p-2.5">Désignation</th>
                  <th className="p-2.5">Emplacement (Casier)</th>
                  <th className="p-2.5">Qté</th>
                  <th className="p-2.5">Unité</th>
                  <th className="p-2.5">Catégorie</th>
                  <th className="p-2.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {localInventory.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-800/30">
                    <td className="p-2">
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
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => {
                          const updated = [...localInventory];
                          updated[idx].name = e.target.value;
                          setLocalInventory(updated);
                        }}
                        className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-white font-semibold w-full min-w-[180px]"
                      />
                    </td>
                    <td className="p-2">
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
                    <td className="p-2">
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
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => {
                          const updated = [...localInventory];
                          updated[idx].unit = e.target.value;
                          setLocalInventory(updated);
                        }}
                        className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-slate-300 font-mono w-16"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.category}
                        onChange={(e) => {
                          const updated = [...localInventory];
                          updated[idx].category = e.target.value;
                          setLocalInventory(updated);
                        }}
                        className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-slate-300 w-28"
                      />
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => {
                          const updated = localInventory.filter((_, i) => i !== idx);
                          setLocalInventory(updated);
                        }}
                        className="text-rose-400 hover:text-rose-300 p-1"
                        title="Supprimer"
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

      {/* TAB 4: STATIONS & MULTIPLAYER SETUP */}
      {activeTab === 'stations' && (
        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold font-mono text-slate-200 uppercase">
                Postes de Jeu & Scannettes Connectées
              </h3>
              <p className="text-xs text-slate-400">
                Chaque poste physique (PC / Scannette USB ou Zebra) sélectionne son identifiant pour participer au duel.
              </p>
            </div>
            <button
              onClick={handleAddStation}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter un Poste</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(localConfig.availableStations || []).map((st, idx) => (
              <div key={st.id || idx} className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-sky-400 uppercase">
                    ID : {st.id}
                  </span>
                  {(localConfig.availableStations || []).length > 1 && (
                    <button
                      onClick={() => handleRemoveStation(st.id)}
                      className="text-rose-400 hover:text-rose-300 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Nom affiché sur l'écran et la TV :</label>
                  <input
                    type="text"
                    value={st.name}
                    onChange={(e) => {
                      const updated = (localConfig.availableStations || []).map((item) =>
                        item.id === st.id ? { ...item, name: e.target.value } : item
                      );
                      setLocalConfig({ ...localConfig, availableStations: updated });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-white font-bold"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: RULES & DIPLOMA CONFIG */}
      {activeTab === 'rules' && (
        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold font-mono text-slate-300 uppercase">
            Règles du Shift & Diplôme Souvenir :
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Durée du Chrono de Shift (secondes) :</label>
              <input
                type="number"
                value={localConfig.shiftDurationSeconds}
                onChange={(e) => setLocalConfig({ ...localConfig, shiftDurationSeconds: parseInt(e.target.value) || 300 })}
                className="w-full bg-slate-950 border border-slate-700 px-3.5 py-2.5 rounded-xl text-sm text-white font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">300s = 5 min • 180s = 3 min • 120s = 2 min</span>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Points Bonus par Niveau de Combo (+pts) :</label>
              <input
                type="number"
                value={localConfig.comboBonusPoints ?? 50}
                onChange={(e) => setLocalConfig({ ...localConfig, comboBonusPoints: parseInt(e.target.value) || 50 })}
                className="w-full bg-slate-950 border border-slate-700 px-3.5 py-2.5 rounded-xl text-sm text-orange-400 font-mono font-bold"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Bonus ajouté à chaque étape réussie sans faute</span>
            </div>

            <div className="md:col-span-2 pt-3 border-t border-slate-800">
              <h4 className="text-xs font-bold text-amber-400 uppercase font-mono mb-3">
                Personnalisation du Diplôme Imprimable :
              </h4>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Titre du Diplôme :</label>
              <input
                type="text"
                value={localConfig.diplomaTitle || 'DIPLÔME D\'HONNEUR'}
                onChange={(e) => setLocalConfig({ ...localConfig, diplomaTitle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 px-3.5 py-2 rounded-xl text-xs text-white font-bold"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Signature Officielle (Bas Droite) :</label>
              <input
                type="text"
                value={localConfig.diplomaSignatory || 'La Direction Logistique & Supply Chain'}
                onChange={(e) => setLocalConfig({ ...localConfig, diplomaSignatory: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 px-3.5 py-2 rounded-xl text-xs text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-slate-400 block mb-1">Texte d'Honneur :</label>
              <textarea
                rows={2}
                value={localConfig.diplomaDescription || 'Attribué pour l\'excellence opérationnelle lors du shift de picking logistique.'}
                onChange={(e) => setLocalConfig({ ...localConfig, diplomaDescription: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 px-3.5 py-2 rounded-xl text-xs text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: DATABASE, BACKUP & SCENARIO FILES */}
      {activeTab === 'database' && (
        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
          <h3 className="text-sm font-bold font-mono text-slate-300 uppercase">
            Maintenance Base de Données & Gestion des Fichiers Scénarios :
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Clear Scores */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-rose-900/40 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 text-rose-400 mb-1">
                  <Trash2 className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase">Purger le Podium</h4>
                </div>
                <p className="text-[11px] text-slate-400">
                  Efface tous les scores pour repartir avec un classement vierge le jour J.
                </p>
              </div>
              <button
                onClick={handleClearScores}
                className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                Vider les Scores
              </button>
            </div>

            {/* Clear Live Activity */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-rose-900/40 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 text-rose-400 mb-1">
                  <Radio className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase">Purger l'Activité Live</h4>
                </div>
                <p className="text-[11px] text-slate-400">
                  Efface les logs des scans en direct pour nettoyer l'historique de régie.
                </p>
              </div>
              <button
                onClick={handleClearLiveScans}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold text-xs"
              >
                Vider Scans Live
              </button>
            </div>

            {/* Export JSON */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-sky-900/40 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 text-sky-400 mb-1">
                  <Download className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase">Exporter Scénario</h4>
                </div>
                <p className="text-[11px] text-slate-400">
                  Télécharge un fichier .json contenant toutes vos missions, articles et paramètres.
                </p>
              </div>
              <button
                onClick={handleExportJson}
                className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
              >
                Télécharger (.json)
              </button>
            </div>

            {/* Import JSON */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-indigo-900/40 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 text-indigo-400 mb-1">
                  <Upload className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase">Importer Scénario</h4>
                </div>
                <p className="text-[11px] text-slate-400">
                  Chargez un fichier .json préparé à l'avance pour changer d'animation instantanément.
                </p>
              </div>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleImportJson}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  Charger un Fichier (.json)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
