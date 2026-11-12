import React, { useState, useRef, useEffect } from 'react';
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
  FileSpreadsheet,
  Zap,
  Bell,
  Play,
  Sparkles,
  Send,
  Building,
  ShieldAlert,
  CheckCircle2,
  Swords,
  QrCode,
  ExternalLink,
  Smartphone,
  MapPin,
  ShieldCheck
} from 'lucide-react';
import { 
  saveAppConfig, 
  resetAllScores, 
  resetLiveActivity,
  resetAllLiveStations,
  fetchDistractions,
  saveDistraction,
  deleteDistraction,
  triggerLiveHazard,
  updateStationLive,
  getRemoteLeaderboard,
  deleteScoreById,
  RemoteScore
} from '../services/supabaseClient';
import { INITIAL_INVENTORY, INITIAL_LOCATIONS } from '../data/initialData';
import { MISSIONS } from '../data/missions';
import { ConfirmModal } from './ConfirmModal';
import { showToast } from './ToastNotification';
import { Mission, MissionStep, InventoryItem, AppConfig, Distraction, LiveHazard, WarehouseLocation } from '../types';

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
  const [activeTab, setActiveTab] = useState<'branding' | 'rules' | 'stations' | 'missions' | 'inventory' | 'locations' | 'hazards' | 'database'>('branding');
  const [localConfig, setLocalConfig] = useState<AppConfig>(appConfig);
  const [localMissions, setLocalMissions] = useState<Mission[]>(missions);
  const [localInventory, setLocalInventory] = useState<InventoryItem[]>(inventory);
  const [localLocations, setLocalLocations] = useState<WarehouseLocation[]>(
    () => appConfig.locations && appConfig.locations.length > 0 ? appConfig.locations : INITIAL_LOCATIONS
  );
  const [selectedMissionIndex, setSelectedMissionIndex] = useState<number>(0);
  const [manualBarcodeSteps, setManualBarcodeSteps] = useState<Record<number, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isLocalEditingMissionsRef = useRef(false);

  // Synchronisation avec les props quand les données distantes Supabase sont chargées
  useEffect(() => {
    if (inventory && inventory.length > 0) {
      setLocalInventory(inventory);
    }
  }, [inventory]);

  useEffect(() => {
    // Only overwrite local missions if not currently actively modifying them locally
    if (missions && missions.length > 0 && !isLocalEditingMissionsRef.current) {
      setLocalMissions(missions);
    }
  }, [missions]);

  useEffect(() => {
    setLocalConfig(appConfig);
  }, [appConfig]);

  // Auto-Save debounced en temps réel : toute modification se propage automatiquement à tous les écrans sans saut d'affichage
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const configWithLocs = {
        ...localConfig,
        locations: localLocations
      };
      onUpdateAppConfig(configWithLocs);
      onUpdateMissions(localMissions);
      onUpdateInventory(localInventory);
      saveAppConfig({
        ...configWithLocs,
        missions: localMissions,
        inventory: localInventory
      });
      setTimeout(() => {
        isLocalEditingMissionsRef.current = false;
      }, 500);
    }, 800);

    return () => clearTimeout(timer);
  }, [localConfig, localMissions, localInventory, localLocations]);

  // Hazards & Distractions States
  const [distractions, setDistractions] = useState<Distraction[]>([]);
  const [targetStationForHazard, setTargetStationForHazard] = useState<string>('all');
  const [hazardFeedback, setHazardFeedback] = useState<string | null>(null);
  const [newClientName, setNewClientName] = useState<string>('');
  const [newDistraction, setNewDistraction] = useState<Partial<Distraction>>({
    title: '',
    description: '',
    severity: 'critical',
    expected_barcode: 'ART-KF40-INOX',
    barcode_label: 'Bride KF40 Inox',
    time_limit_seconds: 45,
    points_bonus: 600,
    is_active: true
  });

  // Match & Zebra QR Launch States
  const [duo1Cea, setDuo1Cea] = useState('Collaborateur GT 1');
  const [duo1Client, setDuo1Client] = useState('Invité 1');
  const [duo2Cea, setDuo2Cea] = useState('Collaborateur GT 2');
  const [duo2Client, setDuo2Client] = useState('Invité 2');
  const [showMatchQRs, setShowMatchQRs] = useState(false);
  const [matchSeed, setMatchSeed] = useState<number>(Date.now());

  // In-app stylish confirmation modal
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning' | 'info' | 'success';
    singleAction?: boolean;
    action?: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: ''
  });
  const [adminScores, setAdminScores] = useState<RemoteScore[]>([]);

  const loadAdminScores = async () => {
    const list = await getRemoteLeaderboard();
    setAdminScores(list);
  };

  useEffect(() => {
    if (activeTab === 'database') {
      loadAdminScores();
    }
  }, [activeTab]);

  const baseUrl = (localConfig.publicUrl || 'https://jeux-scan-25-ans-logistics.vercel.app').replace(/\/$/, '');

  const handleLaunchMatch = async () => {
    const seed = Date.now();
    setMatchSeed(seed);

    // Sync Duo 1 to Supabase
    await updateStationLive({
      station_id: 'poste-1',
      station_name: 'Poste 1 (Scannette A)',
      operator_cea: duo1Cea.trim() || 'Collaborateur GT 1',
      client_guest: duo1Client.trim() || 'Invité 1',
      team_name: `Duo ${duo1Client.trim() || 'Invité 1'}`,
      score: 0,
      combo: 0,
      progress_percent: 0,
      current_step_index: 0,
      status: 'idle'
    });

    // Sync Duo 2 to Supabase
    await updateStationLive({
      station_id: 'poste-2',
      station_name: 'Poste 2 (Scannette B)',
      operator_cea: duo2Cea.trim() || 'Collaborateur GT 2',
      client_guest: duo2Client.trim() || 'Invité 2',
      team_name: `Duo ${duo2Client.trim() || 'Invité 2'}`,
      score: 0,
      combo: 0,
      progress_percent: 0,
      current_step_index: 0,
      status: 'idle'
    });

    setShowMatchQRs(true);
    showToast({
      title: 'Match Configuré !',
      message: 'Scannez les 2 QR Codes sur les terminaux Zebra pour démarrer le duel',
      type: 'success'
    });
  };

  // Load distractions on mount
  useEffect(() => {
    fetchDistractions().then((data) => {
      if (data && data.length > 0) {
        setDistractions(data);
      }
    });
  }, []);

  // Save to Cloud and local state
  const handleSaveAll = async () => {
    const configWithLocs = {
      ...localConfig,
      locations: localLocations
    };
    onUpdateAppConfig(configWithLocs);
    onUpdateMissions(localMissions);
    onUpdateInventory(localInventory);

    const success = await saveAppConfig({
      ...configWithLocs,
      missions: localMissions,
      inventory: localInventory
    });

    if (success) {
      showToast({
        title: 'Configuration Enregistrée',
        message: 'Synchronisée dans Supabase et répercutée en direct',
        type: 'success'
      });
    } else {
      showToast({
        title: 'Enregistré localement',
        message: 'Stocké dans le navigateur (mode hors-ligne)',
        type: 'info'
      });
    }
  };

  // Enregistrement dédié des articles du Stock
  const handleSaveInventory = async () => {
    onUpdateInventory(localInventory);

    const success = await saveAppConfig({
      ...localConfig,
      missions: localMissions,
      inventory: localInventory
    });

    if (success) {
      showToast({
        title: 'Stock Enregistré',
        message: `${localInventory.length} articles sauvegardés et synchronisés`,
        type: 'success'
      });
    } else {
      showToast({
        title: 'Enregistré localement',
        message: 'Stocké dans le navigateur (mode hors-ligne)',
        type: 'info'
      });
    }
  };

  // Import Template CEA
  const handleLoadCeaTemplate = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Charger les modèles du CEA ?',
      message: 'Voulez-vous charger le catalogue officiel des 6 missions multi-lignes et 20 articles réels (Silicium, Wafers, Salle Blanche & Pièces Détachées) ?',
      confirmLabel: 'Charger le modèle',
      variant: 'info',
      action: () => {
        setLocalMissions(MISSIONS);
        setLocalInventory(INITIAL_INVENTORY);
        showToast({
          title: 'Modèle GT Logistics Chargé',
          message: '6 missions multi-lignes et 20 articles réels chargés dans l\'éditeur',
          type: 'info'
        });
      }
    });
  };

  // Clear all missions
  const handleClearAllMissions = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Supprimer toutes les missions ?',
      message: 'Attention : Voulez-vous supprimer l\'ensemble des missions pour repartir d\'une feuille blanche ?',
      confirmLabel: 'Oui, tout supprimer',
      variant: 'danger',
      action: () => {
        setLocalMissions([]);
        setSelectedMissionIndex(0);
      }
    });
  };

  // Clear all inventory
  const handleClearAllInventory = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Vider le catalogue de stock ?',
      message: 'Attention : Voulez-vous supprimer l\'ensemble des articles en stock ?',
      confirmLabel: 'Oui, vider le stock',
      variant: 'danger',
      action: () => {
        setLocalInventory([]);
      }
    });
  };

  // Reset scores on podium and TV arena stations
  const handleClearScores = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Purger le classement et l\'Arène TV ?',
      message: 'Attention : Voulez-vous vraiment effacer tous les scores du classement ET réinitialiser les 2 postes TV à zéro pour le prochain match ?',
      confirmLabel: 'Purger le classement & TV',
      variant: 'danger',
      action: async () => {
        const ok = await resetAllScores();
        await resetAllLiveStations();
        if (ok) {
          setAdminScores([]);
        }
      }
    });
  };

  // Delete individual score by admin
  const handleDeleteAdminScore = (id: string, name: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Supprimer ce score ?',
      message: `Voulez-vous supprimer définitivement le score de "${name}" du classement ?`,
      confirmLabel: 'Supprimer définitivement',
      variant: 'danger',
      action: async () => {
        const ok = await deleteScoreById(id);
        if (ok) {
          setAdminScores((prev) => prev.filter((s) => s.id !== id));
        }
      }
    });
  };

  // Reset live scans
  const handleClearLiveScans = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Effacer l\'historique des scans ?',
      message: 'Voulez-vous réinitialiser le journal des scans en direct affiché sur l\'arène ?',
      confirmLabel: 'Effacer l\'historique',
      variant: 'warning',
      action: async () => {
        await resetLiveActivity();
      }
    });
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
        showToast({
          title: 'Import Réussi',
          message: 'Fichier JSON importé avec succès dans l\'éditeur',
          type: 'success'
        });
      } catch {
        setConfirmConfig({
          isOpen: true,
          title: 'Format Invalide',
          message: 'Le fichier sélectionné n\'est pas un fichier JSON valide ou est corrompu.',
          confirmLabel: 'Compris',
          singleAction: true,
          variant: 'danger'
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Dedicated Save Missions Handler
  const handleSaveMissions = async () => {
    isLocalEditingMissionsRef.current = false;
    onUpdateMissions(localMissions);
    const success = await saveAppConfig({
      ...localConfig,
      missions: localMissions,
      inventory: localInventory
    });
    if (success) {
      showToast({
        title: 'Missions Sauvegardées !',
        message: `${localMissions.length} scénario(s) synchronisé(s) avec Supabase, les Scannettes et l'Arène TV`,
        type: 'success'
      });
    } else {
      showToast({
        title: 'Missions enregistrées en local',
        message: 'Sauvegardé dans le cache local (mode hors-ligne)',
        type: 'info'
      });
    }
  };

  // Immutable mission field updater
  const updateMissionField = (field: keyof Mission, value: any) => {
    isLocalEditingMissionsRef.current = true;
    setLocalMissions((prev) =>
      prev.map((m, idx) => (idx === selectedMissionIndex ? { ...m, [field]: value } : m))
    );
  };

  // Immutable step field updater
  const updateStepField = (stepIdx: number, field: keyof MissionStep, value: any) => {
    isLocalEditingMissionsRef.current = true;
    setLocalMissions((prev) =>
      prev.map((m, mIdx) => {
        if (mIdx !== selectedMissionIndex) return m;
        const newSteps = m.steps.map((st, sIdx) =>
          sIdx === stepIdx ? { ...st, [field]: value } : st
        );
        return { ...m, steps: newSteps };
      })
    );
  };

  // Duplicate a mission
  const handleDuplicateMission = (idx: number) => {
    isLocalEditingMissionsRef.current = true;
    const src = localMissions[idx];
    if (!src) return;
    const copy: Mission = {
      ...src,
      id: `mission-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: `${src.title} (Copie)`,
      code: `${src.code}-BIS`,
      steps: src.steps.map((s, i) => ({
        ...s,
        id: `step-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        completed: false,
        scannedCount: 0
      }))
    };
    const updated = [...localMissions, copy];
    setLocalMissions(updated);
    setSelectedMissionIndex(updated.length - 1);
    showToast({
      title: 'Mission Dupliquée',
      message: `"${copy.title}" créée avec ses ${copy.steps.length} étapes`,
      type: 'success'
    });
  };

  // Add step to mission (with optional template item from inventory)
  const handleAddStep = (missionIdx: number, templateItem?: InventoryItem) => {
    isLocalEditingMissionsRef.current = true;
    const newStep: MissionStep = templateItem ? {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      instruction: `Prélevez et scannez ${templateItem.name} (${templateItem.sku}).`,
      expectedBarcode: templateItem.sku,
      barcodeType: templateItem.category?.toLowerCase().includes('emplacement') ? 'location' : 'article',
      targetLabel: templateItem.name,
      lrCode: templateItem.lrCode || '',
      crLabel: templateItem.crLabel || templateItem.name,
      quantity: 1,
      scannedCount: 0,
      completed: false,
      hint: `Scannez l'étiquette code-barres ${templateItem.sku}.`
    } : {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      instruction: 'Scannez la pièce / l\'emplacement requis.',
      expectedBarcode: 'ART-NOUVEAU',
      barcodeType: 'article',
      targetLabel: 'Nouvelle Pièce',
      lrCode: '',
      crLabel: '',
      quantity: 1,
      scannedCount: 0,
      completed: false,
      hint: 'Scannez le code affiché.'
    };

    const updated = localMissions.map((m, idx) => {
      if (idx !== missionIdx) return m;
      return {
        ...m,
        steps: [...m.steps, newStep]
      };
    });

    setLocalMissions(updated);
    showToast({
      title: 'Étape Ajoutée',
      message: `Nouvelle étape ajoutée (${updated[missionIdx].steps.length} étapes au total)`,
      type: 'info'
    });
  };

  // Duplicate a step within a mission
  const handleDuplicateStep = (missionIdx: number, stepIdx: number) => {
    isLocalEditingMissionsRef.current = true;
    const targetMission = localMissions[missionIdx];
    if (!targetMission || !targetMission.steps[stepIdx]) return;
    const srcStep = targetMission.steps[stepIdx];
    const copyStep: MissionStep = {
      ...srcStep,
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      instruction: `${srcStep.instruction} (Contrôle supplémentaire)`,
      completed: false,
      scannedCount: 0
    };
    const newSteps = [...targetMission.steps];
    newSteps.splice(stepIdx + 1, 0, copyStep);
    const updated = localMissions.map((m, idx) => idx === missionIdx ? { ...m, steps: newSteps } : m);
    setLocalMissions(updated);
    showToast({
      title: 'Étape Dupliquée',
      message: `Étape insérée en position #${stepIdx + 2}`,
      type: 'info'
    });
  };

  // Move step up/down
  const handleMoveStep = (missionIdx: number, stepIdx: number, direction: 'up' | 'down') => {
    isLocalEditingMissionsRef.current = true;
    const targetMission = localMissions[missionIdx];
    if (!targetMission) return;
    const targetIdx = direction === 'up' ? stepIdx - 1 : stepIdx + 1;
    if (targetIdx < 0 || targetIdx >= targetMission.steps.length) return;

    const newSteps = [...targetMission.steps];
    const temp = newSteps[stepIdx];
    newSteps[stepIdx] = newSteps[targetIdx];
    newSteps[targetIdx] = temp;

    const updated = localMissions.map((m, idx) => idx === missionIdx ? { ...m, steps: newSteps } : m);
    setLocalMissions(updated);
  };

  // Remove step from mission
  const handleRemoveStep = (missionIdx: number, stepIdx: number) => {
    isLocalEditingMissionsRef.current = true;
    const targetMission = localMissions[missionIdx];
    if (!targetMission) return;
    if (targetMission.steps.length <= 1) {
      showToast({
        title: 'Action impossible',
        message: 'Une mission doit contenir au minimum 1 étape de scan.',
        type: 'warning'
      });
      return;
    }
    const newSteps = targetMission.steps.filter((_, i) => i !== stepIdx);
    const updated = localMissions.map((m, idx) => idx === missionIdx ? { ...m, steps: newSteps } : m);
    setLocalMissions(updated);
  };

  // Sélecteur Intelligent d'Étape : remplit automatiquement code, désignation, type et consignes
  const handleSelectStepPreset = (missionIdx: number, stepIdx: number, rawCode: string) => {
    isLocalEditingMissionsRef.current = true;
    if (!rawCode) return;

    if (rawCode === '__custom__') {
      setManualBarcodeSteps(prev => ({ ...prev, [stepIdx]: true }));
      return;
    }

    // 1. Emplacement d'entrepôt
    const loc = localLocations.find(l => l.barcode === rawCode);
    if (loc) {
      setLocalMissions(prev => prev.map((m, mIdx) => {
        if (mIdx !== missionIdx) return m;
        const isDelivery = loc.barcode.includes('LIVRAISON') || loc.barcode.includes('RECEPTION') || loc.barcode.includes('DOCK');
        const cleanName = loc.label.split('(')[0].trim();
        const newSteps = m.steps.map((st, i) => i === stepIdx ? {
          ...st,
          expectedBarcode: loc.barcode,
          targetLabel: loc.label,
          lrCode: loc.lrCode || loc.barcode.replace(/^(ART|LOC)-/, '').replace(/-/g, '_'),
          crLabel: loc.crLabel || loc.label.toUpperCase(),
          barcodeType: isDelivery ? ('dock' as const) : ('location' as const),
          instruction: isDelivery
            ? `Acheminez la commande vers ${cleanName} et validez le scan final.`
            : `Rendez-vous à l'emplacement ${cleanName} et scannez l'étiquette.`,
          hint: `Visez l'étiquette code-barres ${loc.barcode}.`
        } : st);
        return { ...m, steps: newSteps };
      }));
      setManualBarcodeSteps(prev => ({ ...prev, [stepIdx]: false }));
      return;
    }

    // 2. Article du stock ERP
    const item = localInventory.find(i => i.sku === rawCode);
    if (item) {
      setLocalMissions(prev => prev.map((m, mIdx) => {
        if (mIdx !== missionIdx) return m;
        const currentQty = m.steps[stepIdx]?.quantity || 1;
        const newSteps = m.steps.map((st, i) => i === stepIdx ? {
          ...st,
          expectedBarcode: item.sku,
          targetLabel: item.name,
          lrCode: item.lrCode || item.sku.replace('ART-', 'REF_').replace(/-/g, '_'),
          crLabel: item.crLabel || item.name,
          barcodeType: 'article' as const,
          instruction: `Prélevez et scannez ${currentQty > 1 ? `les ${currentQty} ` : ''}${item.name} (${item.sku}).`,
          hint: currentQty > 1 ? `Scannez chaque pièce prélevée (${currentQty} pcs attendues).` : `Scannez le code-barres ${item.sku}.`
        } : st);
        return { ...m, steps: newSteps };
      }));
      setManualBarcodeSteps(prev => ({ ...prev, [stepIdx]: false }));
      return;
    }

    // 3. Documents & expéditions
    if (rawCode === 'DOC-TRANSPORT-INTL') {
      setLocalMissions(prev => prev.map((m, mIdx) => {
        if (mIdx !== missionIdx) return m;
        const newSteps = m.steps.map((st, i) => i === stepIdx ? {
          ...st,
          expectedBarcode: 'DOC-TRANSPORT-INTL',
          targetLabel: 'Document de Transport International',
          lrCode: 'DOC_TRP',
          crLabel: 'DOCUMENT TRANSPORT EXPEDITION',
          barcodeType: 'package' as const,
          instruction: 'Contrôlez le document de transport rempli et scannez le bordereau.',
          hint: 'Visez le document de transport fixé sur le colis.'
        } : st);
        return { ...m, steps: newSteps };
      }));
      setManualBarcodeSteps(prev => ({ ...prev, [stepIdx]: false }));
      return;
    }

    if (rawCode === 'ART-CARTON-EXP') {
      setLocalMissions(prev => prev.map((m, mIdx) => {
        if (mIdx !== missionIdx) return m;
        const newSteps = m.steps.map((st, i) => i === stepIdx ? {
          ...st,
          expectedBarcode: 'ART-CARTON-EXP',
          targetLabel: 'Colis Carton Double Cannelure CEA',
          lrCode: 'CTN_DBL1',
          crLabel: 'CARTON DOUBLE CANNELURE CEA',
          barcodeType: 'package' as const,
          instruction: 'Vérifiez la conformité du colis et scannez le code-barres du carton.',
          hint: 'Scannez le carton d\'expédition homologué.'
        } : st);
        return { ...m, steps: newSteps };
      }));
      setManualBarcodeSteps(prev => ({ ...prev, [stepIdx]: false }));
      return;
    }

    if (rawCode === 'ZONE_RECEPTION_CENTRALE') {
      setLocalMissions(prev => prev.map((m, mIdx) => {
        if (mIdx !== missionIdx) return m;
        const newSteps = m.steps.map((st, i) => i === stepIdx ? {
          ...st,
          expectedBarcode: 'ZONE_RECEPTION_CENTRALE',
          targetLabel: 'La Réception Centrale (Départs Étranger)',
          lrCode: 'REC_CENT',
          crLabel: 'LA RECEPTION CENTRALE DEPARTS',
          barcodeType: 'dock' as const,
          instruction: 'Déposez le colis à La Réception Centrale et validez l\'expédition.',
          hint: 'Scannez le panneau « La Réception Centrale » pour clôturer.'
        } : st);
        return { ...m, steps: newSteps };
      }));
      setManualBarcodeSteps(prev => ({ ...prev, [stepIdx]: false }));
      return;
    }

    // Fallback valeur personnalisée
    updateStepField(stepIdx, 'expectedBarcode', rawCode);
  };

  // Add new mission from scratch
  const handleAddMission = () => {
    isLocalEditingMissionsRef.current = true;
    const num = localMissions.length + 1;
    const newMission: Mission = {
      id: `mission-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: `Mission ${num} • Préparation Expédition`,
      code: `ORD-${Date.now().toString().slice(-4)}`,
      client: 'CEA LETI • Salle Blanche / Bâtiment 17',
      priority: 'STANDARD',
      description: 'Préparez les articles demandés dans les casiers et validez sur le quai d\'expédition.',
      timeLimitSeconds: 120,
      basePoints: 1200,
      steps: [
        {
          id: `step-${Date.now()}-1`,
          instruction: 'Rendez-vous à l\'armoire de stockage et scannez l\'emplacement.',
          expectedBarcode: 'LOC-B01-T03',
          barcodeType: 'location',
          targetLabel: 'Armoire Stockage (Allée B - Casier B01)',
          lrCode: 'LOC_B01',
          crLabel: 'ARMOIRE ALLEE B CASIER B01',
          quantity: 1,
          scannedCount: 0,
          completed: false,
          hint: 'Visez l\'étiquette du casier de préparation.'
        },
        {
          id: `step-${Date.now()}-2`,
          instruction: 'Prélevez et scannez l\'article demandé.',
          expectedBarcode: 'ART-KF40-INOX',
          barcodeType: 'article',
          targetLabel: 'Bride à Vide KF40 Inox 316L',
          lrCode: 'BRD_KF40',
          crLabel: 'BRIDE A VIDE KF40 INOX',
          quantity: 1,
          scannedCount: 0,
          completed: false,
          hint: 'Scannez le code-barres sur le sachet de la pièce.'
        },
        {
          id: `step-${Date.now()}-3`,
          instruction: 'Déposez la commande sur l\'étagère de livraison et validez le départ.',
          expectedBarcode: 'LOC-ETAGERE-LIVRAISON',
          barcodeType: 'location',
          targetLabel: 'Étagère de Livraison & Dépôt Client',
          lrCode: 'ETA_LIVR',
          crLabel: 'ETAGERE LIVRAISON CLIENT',
          quantity: 1,
          scannedCount: 0,
          completed: false,
          hint: 'Scannez le panneau de livraison pour clore la mission.'
        }
      ]
    };
    const updated = [...localMissions, newMission];
    setLocalMissions(updated);
    setSelectedMissionIndex(updated.length - 1);
    showToast({
      title: 'Nouvelle Mission Créée',
      message: `Mission #${num} initialisée avec 3 étapes prêtes à l'emploi`,
      type: 'success'
    });
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

  // Trigger Live Hazard across stations via Supabase
  const handleTriggerLiveHazard = async (d: Distraction) => {
    setHazardFeedback(`Envoi de l'aléa "${d.title}"...`);
    const hazardId = await triggerLiveHazard({
      target_station_id: targetStationForHazard,
      title: d.title,
      message: d.description,
      expected_barcode: d.expected_barcode,
      time_limit_seconds: d.time_limit_seconds,
      points_bonus: d.points_bonus,
      status: 'active'
    });

    if (hazardId) {
      setHazardFeedback(`⚡ Aléa envoyé avec succès à la station (${targetStationForHazard === 'all' ? 'Tous les postes' : targetStationForHazard}) !`);
      showToast({
        title: 'Aléa Déclenché en Direct',
        message: `${d.title} → Cible : ${targetStationForHazard === 'all' ? 'Tous les postes' : targetStationForHazard}`,
        type: 'hazard'
      });
    } else {
      setHazardFeedback('Erreur lors de l\'envoi de l\'aléa.');
    }
    setTimeout(() => setHazardFeedback(null), 3500);
  };

  // Trigger Surprise Client Rush Order
  const handleTriggerSurpriseOrder = async () => {
    const clients = localConfig.clientsCatalog || ['CEA LETI - Bât. 17 (Nano)', 'Minatec Salle Blanche ISO 5'];
    const randomClient = clients[Math.floor(Math.random() * clients.length)];
    const items = localInventory.length > 0 ? localInventory : INITIAL_INVENTORY;
    const randomItem = items[Math.floor(Math.random() * items.length)];

    setHazardFeedback(`Génération d'une commande imprévue pour "${randomClient}"...`);

    const hazardId = await triggerLiveHazard({
      target_station_id: targetStationForHazard,
      title: `🚨 COMMANDE CLIENT IMPRÉVUE : ${randomClient}`,
      message: `URGENCE EXPÉDITION : Le demandeur exige le prélèvement immédiat de ${randomItem.name} (${randomItem.sku}) !`,
      expected_barcode: randomItem.sku,
      time_limit_seconds: 60,
      points_bonus: 750,
      status: 'active'
    });

    if (hazardId) {
      setHazardFeedback(`📦 Commande client surprise envoyée en direct à (${targetStationForHazard === 'all' ? 'Tous les postes' : targetStationForHazard}) !`);
      showToast({
        title: 'Commande Surprise Déclenchée',
        message: `${randomClient} → Cible : ${targetStationForHazard === 'all' ? 'Tous les postes' : targetStationForHazard}`,
        type: 'hazard'
      });
    } else {
      setHazardFeedback('Erreur lors de l\'envoi de la commande imprévue.');
    }
    setTimeout(() => setHazardFeedback(null), 3500);
  };

  // Save new distraction template
  const handleSaveDistractionTemplate = async () => {
    if (!newDistraction.title || !newDistraction.expected_barcode) {
      setConfirmConfig({
        isOpen: true,
        title: 'Champs Obligatoires Manquants',
        message: 'Veuillez renseigner un titre et un code-barres attendu pour créer ce modèle d\'aléa.',
        confirmLabel: 'Compris',
        singleAction: true,
        variant: 'warning'
      });
      return;
    }

    const payload: Partial<Distraction> = {
      ...newDistraction,
      id: newDistraction.id || undefined,
      is_active: true
    };

    const ok = await saveDistraction(payload);
    if (ok) {
      const refreshed = await fetchDistractions();
      setDistractions(refreshed);
      setNewDistraction({
        title: '',
        description: '',
        severity: 'critical',
        expected_barcode: 'ART-KF40-INOX',
        barcode_label: 'Bride KF40 Inox',
        time_limit_seconds: 45,
        points_bonus: 600,
        is_active: true
      });
      showToast({
        title: 'Aléa Enregistré',
        message: 'Modèle d\'aléa enregistré avec succès dans Supabase',
        type: 'success'
      });
    }
  };

  // Delete distraction template
  const handleDeleteDistractionTemplate = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Supprimer ce modèle d\'aléa ?',
      message: 'Cet aléa sera retiré définitivement de la bibliothèque.',
      confirmLabel: 'Supprimer',
      variant: 'danger',
      action: async () => {
        await deleteDistraction(id);
        setDistractions((prev) => prev.filter((d) => d.id !== id));
        showToast({
          title: 'Aléa Retiré',
          message: 'Le modèle d\'aléa a été supprimé',
          type: 'info'
        });
      }
    });
  };

  // Add client to catalog
  const handleAddClientToCatalog = () => {
    if (!newClientName.trim()) return;
    const currentList = localConfig.clientsCatalog || [];
    setLocalConfig({
      ...localConfig,
      clientsCatalog: [...currentList, newClientName.trim()]
    });
    setNewClientName('');
  };

  // Remove client from catalog
  const handleRemoveClientFromCatalog = (idx: number) => {
    const currentList = [...(localConfig.clientsCatalog || [])];
    currentList.splice(idx, 1);
    setLocalConfig({
      ...localConfig,
      clientsCatalog: currentList
    });
  };

  // Add Location
  const handleAddNewLocation = () => {
    const num = localLocations.length + 1;
    const newLoc: WarehouseLocation = {
      id: `loc-${Date.now()}`,
      barcode: `LOC-ZONE-${num.toString().padStart(2, '0')}`,
      label: `Zone / Étagère #${num}`,
      lrCode: `LOC_Z${num}`,
      crLabel: `ZONE ETAGERE ${num}`,
      zone: 'Magasin Central'
    };
    setLocalLocations(prev => [...prev, newLoc]);
    showToast({
      title: 'Emplacement Ajouté',
      message: `"${newLoc.label}" créé (${newLoc.barcode})`,
      type: 'info'
    });
  };

  // Duplicate Location
  const handleDuplicateLocation = (loc: WarehouseLocation) => {
    const copy: WarehouseLocation = {
      ...loc,
      id: `loc-${Date.now()}`,
      barcode: `${loc.barcode}-BIS`,
      label: `${loc.label} (Copie)`,
      lrCode: `${loc.lrCode || 'LOC'}_BIS`
    };
    setLocalLocations(prev => [...prev, copy]);
    showToast({
      title: 'Emplacement Dupliqué',
      message: `${copy.label} créé`,
      type: 'info'
    });
  };

  // Update Location Field
  const handleUpdateLocationField = (id: string, field: keyof WarehouseLocation, value: any) => {
    setLocalLocations(prev => prev.map(loc => {
      if (loc.id !== id) return loc;
      const updated = { ...loc, [field]: value };
      if (field === 'label' && !loc.crLabel) {
        updated.crLabel = String(value).toUpperCase();
      }
      return updated;
    }));
  };

  // Delete Location
  const handleDeleteLocation = (id: string, label: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Supprimer cet emplacement ?',
      message: `Voulez-vous supprimer l'emplacement "${label}" ? Les articles ou missions pointant vers lui devront être réassignés.`,
      confirmLabel: 'Supprimer',
      variant: 'danger',
      action: () => {
        setLocalLocations(prev => prev.filter(l => l.id !== id));
        showToast({
          title: 'Emplacement Supprimé',
          message: label,
          type: 'warning'
        });
      }
    });
  };

  // Reset Locations to default
  const handleResetLocations = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Réinitialiser aux emplacements standards ?',
      message: 'Cette action restaurera la liste standard des emplacements GT Logistics / CEA Minatec.',
      confirmLabel: 'Réinitialiser',
      variant: 'warning',
      action: () => {
        setLocalLocations(INITIAL_LOCATIONS);
        showToast({
          title: 'Emplacements Réinitialisés',
          message: `${INITIAL_LOCATIONS.length} emplacements rétablis`,
          type: 'success'
        });
      }
    });
  };

  // Dedicated Save Locations
  const handleSaveLocations = async () => {
    const configWithLocs = {
      ...localConfig,
      locations: localLocations
    };
    onUpdateAppConfig(configWithLocs);
    const ok = await saveAppConfig({
      ...configWithLocs,
      missions: localMissions,
      inventory: localInventory
    });
    if (ok) {
      showToast({
        title: 'Emplacements Enregistrés',
        message: `${localLocations.length} emplacements physiques synchronisés dans Supabase`,
        type: 'success'
      });
    }
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

      {/* MATCH & ZEBRA QR DISPATCHER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 rounded-3xl p-5 sm:p-6 border-2 border-indigo-500/40 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-400">
              <Swords className="w-5 h-5 text-indigo-300 animate-bounce" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center space-x-2">
                <span>RÉGIE MATCH : DÉPART DUEL & GÉNÉRATEUR QR CODES ZEBRA</span>
              </h3>
              <p className="text-xs text-slate-300">
                Saisissez les prénoms des joueurs, validez, et faites scanner les QR Codes générés par chaque terminal Zebra.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => window.open(`${baseUrl}/#tv`, '_blank')}
              className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-sky-400 border border-sky-500/40 text-xs font-mono font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ouvrir Arène TV 55"</span>
            </button>
          </div>
        </div>

        {/* Duo Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Duo 1 (Poste 1 - Bleu) */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border-2 border-sky-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black font-mono text-sky-400 uppercase flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block"></span>
                <span>Duo 1 • Poste 1 (Scannette A - Bleu)</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">Étagère 1 / Quai A</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Collaborateur GT :</label>
                <input
                  type="text"
                  value={duo1Cea}
                  onChange={(e) => setDuo1Cea(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-white"
                  placeholder="Ex: Jeremy (GT)"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Invité :</label>
                <input
                  type="text"
                  value={duo1Client}
                  onChange={(e) => setDuo1Client(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-amber-300 font-bold"
                  placeholder="Ex: Thomas"
                />
              </div>
            </div>
          </div>

          {/* Duo 2 (Poste 2 - Orange) */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border-2 border-amber-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black font-mono text-amber-400 uppercase flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                <span>Duo 2 • Poste 2 (Scannette B - Orange)</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">Étagère 2 / Quai B</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Collaborateur GT :</label>
                <input
                  type="text"
                  value={duo2Cea}
                  onChange={(e) => setDuo2Cea(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-white"
                  placeholder="Ex: Sarah (GT)"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Invité :</label>
                <input
                  type="text"
                  value={duo2Client}
                  onChange={(e) => setDuo2Client(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-amber-300 font-bold"
                  placeholder="Ex: Alexandre"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Button: Create Match */}
        <button
          onClick={handleLaunchMatch}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center space-x-2 shadow-xl shadow-emerald-500/30 transition-transform active:scale-[0.99] cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>⚡ CRÉER LE MATCH & GÉNÉRER LES QR CODES ZEBRA</span>
        </button>

        {/* Generated QR Codes Display */}
        {showMatchQRs && (
          <div className="bg-slate-950/90 p-5 rounded-2xl border border-indigo-500/50 space-y-3 animate-fadeIn">
            <div className="text-center">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                ✓ ACCÈS ZEBRA ACTIVÉS • FAITES SCANNER CHAQUE TERMINAL :
              </span>
              <p className="text-[11px] text-slate-300">
                Ces QR Codes ouvrent directement l'écran de jeu pur (sans barre d'outils ni paramètres) avec les missions assignées.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
              {/* QR Duo 1 */}
              <div className="bg-slate-900 p-4 rounded-2xl border-2 border-sky-500/50 flex flex-col items-center text-center space-y-2">
                <span className="text-xs font-black font-mono text-sky-400 uppercase">
                  📱 ZEBRA 1 (BLEU)
                </span>
                <span className="text-[11px] font-bold text-white">
                  Duo {duo1Client}
                </span>
                <div className="bg-white p-2.5 rounded-2xl shadow-xl">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`${baseUrl}/#play?station=poste-1&seed=${matchSeed}`)}`}
                    alt="QR Zebra 1"
                    className="w-32 h-32"
                  />
                </div>
                <span className="text-[9px] text-slate-400 font-mono">
                  Mission : Étagère 1 • Quai A
                </span>
              </div>

              {/* QR Duo 2 */}
              <div className="bg-slate-900 p-4 rounded-2xl border-2 border-amber-500/50 flex flex-col items-center text-center space-y-2">
                <span className="text-xs font-black font-mono text-amber-400 uppercase">
                  📱 ZEBRA 2 (ORANGE)
                </span>
                <span className="text-[11px] font-bold text-white">
                  Duo {duo2Client}
                </span>
                <div className="bg-white p-2.5 rounded-2xl shadow-xl">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`${baseUrl}/#play?station=poste-2&seed=${matchSeed}`)}`}
                    alt="QR Zebra 2"
                    className="w-32 h-32"
                  />
                </div>
                <span className="text-[9px] text-slate-400 font-mono">
                  Mission : Étagère 2 • Quai B
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

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
          onClick={() => setActiveTab('locations')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'locations' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-amber-400" />
          <span>4. Emplacements & Entrepôt ({localLocations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('stations')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'stations' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>5. Postes & Scannettes ({localConfig.availableStations?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'rules' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>6. Règles & Diplômes</span>
        </button>

        <button
          onClick={() => setActiveTab('hazards')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'hazards' ? 'bg-amber-500 text-slate-950 font-black' : 'text-amber-400 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>7. Aléas & Distractions ({distractions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'database' ? 'bg-rose-900/60 text-rose-300' : 'text-slate-400 hover:text-rose-300'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>8. Données & Sauvegardes</span>
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
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>Mission #{selectedMissionIndex + 1} :</span>
                    <span className="text-indigo-400 font-extrabold">{localMissions[selectedMissionIndex].title}</span>
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    ID : {localMissions[selectedMissionIndex].id} • {localMissions[selectedMissionIndex].steps.length} étape(s)
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSaveMissions}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center space-x-1.5 shadow-md shadow-emerald-500/20 cursor-pointer transition-all hover:scale-105 active:scale-95"
                    title="Enregistrer toutes les modifications de missions dans le Cloud"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Sauvegarder</span>
                  </button>
                  <button
                    onClick={() => handleDuplicateMission(selectedMissionIndex)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1 cursor-pointer"
                    title="Dupliquer cette mission"
                  >
                    <Copy className="w-3.5 h-3.5 text-sky-400" />
                    <span className="hidden sm:inline">Dupliquer</span>
                  </button>
                  <button
                    onClick={() => {
                      setConfirmConfig({
                        isOpen: true,
                        title: 'Supprimer cette mission ?',
                        message: `Voulez-vous supprimer définitivement la mission "${localMissions[selectedMissionIndex]?.title || 'en cours'}" ?`,
                        confirmLabel: 'Supprimer',
                        variant: 'danger',
                        action: () => {
                          isLocalEditingMissionsRef.current = true;
                          const updated = localMissions.filter((_, i) => i !== selectedMissionIndex);
                          setLocalMissions(updated);
                          setSelectedMissionIndex(Math.max(0, selectedMissionIndex - 1));
                          showToast({
                            title: 'Mission Supprimée',
                            message: 'La mission a été retirée',
                            type: 'info'
                          });
                        }
                      });
                    }}
                    className="p-2 rounded-xl bg-rose-900/40 hover:bg-rose-800 text-rose-300 text-xs flex items-center space-x-1 cursor-pointer"
                    title="Supprimer cette mission"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* General Mission Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-bold">Titre de la Mission :</label>
                  <input
                    type="text"
                    value={localMissions[selectedMissionIndex].title}
                    onChange={(e) => updateMissionField('title', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 px-3 py-2 rounded-xl text-xs text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-bold">Code Référence :</label>
                  <input
                    type="text"
                    value={localMissions[selectedMissionIndex].code}
                    onChange={(e) => updateMissionField('code', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 px-3 py-2 rounded-xl text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-bold">Client / Destinataire :</label>
                  <input
                    type="text"
                    value={localMissions[selectedMissionIndex].client}
                    onChange={(e) => updateMissionField('client', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 px-3 py-2 rounded-xl text-xs text-white"
                  />
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 block mb-1 font-bold">Priorité :</label>
                    <select
                      value={localMissions[selectedMissionIndex].priority}
                      onChange={(e) => updateMissionField('priority', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white focus:outline-none"
                    >
                      <option value="STANDARD">STANDARD</option>
                      <option value="URGENCE CRITIQUE">URGENCE CRITIQUE</option>
                      <option value="EXPÉDITION INTERNATIONALE">EXPÉDITION INTERNATIONALE</option>
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="text-xs text-slate-400 block mb-1 font-bold">Points :</label>
                    <input
                      type="number"
                      value={localMissions[selectedMissionIndex].basePoints}
                      onChange={(e) => updateMissionField('basePoints', parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 px-2 py-2 rounded-xl text-xs text-emerald-400 font-mono font-bold"
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-xs text-slate-400 block mb-1 font-bold">Temps (s) :</label>
                    <input
                      type="number"
                      value={localMissions[selectedMissionIndex].timeLimitSeconds}
                      onChange={(e) => updateMissionField('timeLimitSeconds', parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 px-2 py-2 rounded-xl text-xs text-amber-400 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-slate-400 block mb-1 font-bold">Description du scénario :</label>
                  <textarea
                    rows={2}
                    value={localMissions[selectedMissionIndex].description}
                    onChange={(e) => updateMissionField('description', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-slate-200"
                  />
                </div>
              </div>

              {/* Steps Sequence List */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold font-mono text-slate-200 uppercase flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-sky-400" />
                      <span>Étapes de Scan ({localMissions[selectedMissionIndex].steps.length})</span>
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Les codes-barres doivent être scannés dans cet ordre par les scannettes Zebra.
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const firstLoc = localLocations[0];
                        handleAddStep(selectedMissionIndex);
                        if (firstLoc) {
                          setTimeout(() => {
                            const newSteps = localMissions[selectedMissionIndex]?.steps || [];
                            handleSelectStepPreset(selectedMissionIndex, newSteps.length, firstLoc.barcode);
                          }, 50);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-semibold flex items-center space-x-1 cursor-pointer border border-slate-700"
                      title="Ajouter une étape ciblant un emplacement d'entrepôt"
                    >
                      <MapPin className="w-3.5 h-3.5 text-sky-400" />
                      <span>+ Emplacement</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const firstArt = localInventory[0];
                        if (firstArt) {
                          handleAddStep(selectedMissionIndex, firstArt);
                        } else {
                          handleAddStep(selectedMissionIndex);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center space-x-1 cursor-pointer border border-slate-700"
                      title="Ajouter une étape ciblant un article du stock ERP"
                    >
                      <Boxes className="w-3.5 h-3.5 text-amber-400" />
                      <span>+ Article</span>
                    </button>

                    <button
                      onClick={() => handleAddStep(selectedMissionIndex)}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center space-x-1 cursor-pointer shadow-md shadow-sky-600/20"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter une Étape</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {localMissions[selectedMissionIndex].steps.map((step, sIdx) => (
                    <div key={step.id || sIdx} className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all space-y-3 shadow-inner">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                        <div className="flex items-center space-x-2">
                          <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center font-mono border border-sky-500/40">
                            {sIdx + 1}
                          </span>
                          <span className="text-xs font-black text-white">Étape #{sIdx + 1}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
                            {step.barcodeType === 'location' ? '📍 Emplacement' : step.barcodeType === 'dock' ? '⚓ Quai' : '📦 Article'}
                          </span>
                        </div>

                        {/* Quick Article / Location Auto-Filler */}
                        <div className="flex items-center gap-1.5">
                          <select
                            value={step.expectedBarcode}
                            onChange={(e) => handleSelectStepPreset(selectedMissionIndex, sIdx, e.target.value)}
                            className="bg-slate-900 border border-sky-500/50 text-[11px] text-sky-300 font-mono px-2 py-1 rounded-lg focus:outline-none cursor-pointer max-w-[220px] truncate"
                          >
                            <option value="">⚡ Remplir depuis Stock / Emplacements...</option>
                            <optgroup label="📍 Emplacements de l'Entrepôt">
                              {localLocations.map(l => (
                                <option key={l.barcode} value={l.barcode}>📍 {l.label} ({l.barcode})</option>
                              ))}
                            </optgroup>
                            <optgroup label="📦 Articles du Stock ERP">
                              {localInventory.map(item => (
                                <option key={item.id || item.sku} value={item.sku}>📦 {item.name} ({item.sku})</option>
                              ))}
                            </optgroup>
                            <optgroup label="📋 Documents & Colis">
                              <option value="DOC-TRANSPORT-INTL">📋 DOC-TRANSPORT-INTL • Doc Transport</option>
                              <option value="ART-CARTON-EXP">📦 ART-CARTON-EXP • Carton Expédition</option>
                              <option value="ZONE_RECEPTION_CENTRALE">⚓ ZONE_RECEPTION_CENTRALE • Réception Centrale</option>
                            </optgroup>
                          </select>

                          {/* Step Actions: Duplicate, Move Up, Move Down, Delete */}
                          <button
                            onClick={() => handleDuplicateStep(selectedMissionIndex, sIdx)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                            title="Dupliquer cette étape"
                          >
                            <Copy className="w-3.5 h-3.5 text-sky-400" />
                          </button>
                          <button
                            onClick={() => handleMoveStep(selectedMissionIndex, sIdx, 'up')}
                            disabled={sIdx === 0}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
                            title="Monter"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveStep(selectedMissionIndex, sIdx, 'down')}
                            disabled={sIdx === localMissions[selectedMissionIndex].steps.length - 1}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
                            title="Descendre"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveStep(selectedMissionIndex, sIdx)}
                            className="p-1.5 rounded-lg bg-rose-950 text-rose-300 hover:text-white"
                            title="Supprimer cette étape"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                        <div className="md:col-span-3">
                          <label className="text-[10px] text-slate-400 block font-bold">Consigne / Instruction affichée au joueur :</label>
                          <input
                            type="text"
                            value={step.instruction}
                            onChange={(e) => updateStepField(sIdx, 'instruction', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-amber-400 font-bold block">Quantité requise :</label>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={step.quantity || 1}
                            onChange={(e) => {
                              const qty = Math.max(1, parseInt(e.target.value) || 1);
                              updateStepField(sIdx, 'quantity', qty);
                              if (step.barcodeType === 'article') {
                                const name = step.targetLabel || step.expectedBarcode;
                                updateStepField(sIdx, 'instruction', `Prélevez et scannez ${qty > 1 ? `les ${qty} ` : ''}${name} (${step.expectedBarcode}).`);
                                updateStepField(sIdx, 'hint', qty > 1 ? `Scannez chaque pièce prélevée (${qty} pcs attendues).` : `Scannez le code-barres ${step.expectedBarcode}.`);
                              }
                            }}
                            className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs text-amber-400 font-mono font-bold"
                          />
                        </div>

                        {/* Sélecteur de Code-Barres Attendu (Liste Déroulante avec Option Saisie Libre) */}
                        <div className="md:col-span-2">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] text-amber-400 font-bold flex items-center gap-1.5">
                              <span>Code-Barres Attendu :</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => setManualBarcodeSteps(prev => ({ ...prev, [sIdx]: !prev[sIdx] }))}
                              className="text-[9px] text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1 cursor-pointer font-sans"
                            >
                              {manualBarcodeSteps[sIdx] ? '📋 Choisir dans la liste déroulante' : '✏️ Taper manuellement'}
                            </button>
                          </div>

                          {!manualBarcodeSteps[sIdx] ? (
                            <select
                              value={step.expectedBarcode}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '__custom__') {
                                  setManualBarcodeSteps(prev => ({ ...prev, [sIdx]: true }));
                                } else {
                                  handleSelectStepPreset(selectedMissionIndex, sIdx, val);
                                }
                              }}
                              className="w-full bg-slate-900 border-2 border-amber-500/70 focus:border-amber-400 px-3 py-2 rounded-xl text-xs text-amber-300 font-mono font-bold focus:outline-none transition-all cursor-pointer shadow-sm"
                            >
                              <option value="">-- Sélectionnez l'emplacement ou l'article à scanner --</option>
                              <optgroup label="📍 Emplacements & Casiers de l'Entrepôt">
                                {localLocations.map((l) => (
                                  <option key={l.barcode} value={l.barcode}>
                                    📍 {l.barcode} — {l.label}
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="📦 Articles & Pièces du Stock ERP">
                                {localInventory.map((item) => (
                                  <option key={item.id || item.sku} value={item.sku}>
                                    📦 {item.sku} — {item.name} ({item.quantity} {item.unit || 'pcs'} en stock)
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="📋 Documents & Expéditions">
                                <option value="DOC-TRANSPORT-INTL">📋 DOC-TRANSPORT-INTL — Document de Transport International</option>
                                <option value="ART-CARTON-EXP">📦 ART-CARTON-EXP — Colis Carton Double Cannelure CEA</option>
                                <option value="ZONE_RECEPTION_CENTRALE">⚓ ZONE_RECEPTION_CENTRALE — La Réception Centrale (Départs)</option>
                                <option value="SCEL-SEC-RED">🔒 SCEL-SEC-RED — Scellé de Sécurité Rouge</option>
                              </optgroup>
                              {step.expectedBarcode &&
                               !localLocations.some(l => l.barcode === step.expectedBarcode) &&
                               !localInventory.some(i => i.sku === step.expectedBarcode) &&
                               !['DOC-TRANSPORT-INTL', 'ART-CARTON-EXP', 'ZONE_RECEPTION_CENTRALE', 'SCEL-SEC-RED'].includes(step.expectedBarcode) && (
                                <optgroup label="🏷️ Code actuel">
                                  <option value={step.expectedBarcode}>🏷️ {step.expectedBarcode} (Personnalisé)</option>
                                </optgroup>
                              )}
                              <option value="__custom__">✏️ + Saisie manuelle d'un autre code...</option>
                            </select>
                          ) : (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                list={`step-datalist-${sIdx}`}
                                value={step.expectedBarcode}
                                onChange={(e) => updateStepField(sIdx, 'expectedBarcode', e.target.value.trim().toUpperCase())}
                                placeholder="Tapez le code (ex: LOC-B01-T03 ou REF...)"
                                className="flex-1 bg-slate-900 border-2 border-amber-500/70 focus:border-amber-400 px-3 py-2 rounded-xl text-xs text-amber-300 font-mono font-bold focus:outline-none"
                                autoFocus
                              />
                              <datalist id={`step-datalist-${sIdx}`}>
                                {localLocations.map(l => <option key={l.barcode} value={l.barcode}>{l.label}</option>)}
                                {localInventory.map(i => <option key={i.id || i.sku} value={i.sku}>{i.name}</option>)}
                              </datalist>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block font-bold">Désignation Cible :</label>
                          <input
                            type="text"
                            value={step.targetLabel}
                            onChange={(e) => updateStepField(sIdx, 'targetLabel', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block font-bold">Type d'Élément :</label>
                          <select
                            value={step.barcodeType}
                            onChange={(e) => updateStepField(sIdx, 'barcodeType', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 px-2 py-2 rounded-xl text-xs text-white"
                          >
                            <option value="article">📦 Article / Pièce</option>
                            <option value="location">📍 Emplacement / Casier</option>
                            <option value="package">📫 Colis / Carton</option>
                            <option value="seal">🔒 Scellé de Sécurité</option>
                            <option value="dock">⚓ Quai d'Expédition</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block font-bold">Astuce / Conseil :</label>
                          <input
                            type="text"
                            value={step.hint}
                            onChange={(e) => updateStepField(sIdx, 'hint', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs text-slate-300"
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

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSaveInventory}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black flex items-center space-x-1.5 shadow-lg shadow-emerald-500/25 cursor-pointer transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer le Stock</span>
              </button>
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
                  <th className="p-2.5">Réf</th>
                  <th className="p-2.5">Code SKU (Code-Barres)</th>
                  <th className="p-2.5">Désignation</th>
                  <th className="p-2.5">Qté en stock</th>
                  <th className="p-2.5">Emplacement</th>
                  <th className="p-2.5">Gestionnaire</th>
                  <th className="p-2.5">Machine PDT</th>
                  <th className="p-2.5">Réf Équipementier</th>
                  <th className="p-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {localInventory.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-800/30">
                    {/* 1. Réf */}
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.lrCode || ''}
                        placeholder="Réf"
                        onChange={(e) => {
                          const val = e.target.value;
                          setLocalInventory(prev => prev.map((it, i) => i === idx ? { ...it, lrCode: val } : it));
                        }}
                        className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-amber-400 font-mono font-bold w-28"
                      />
                    </td>

                    {/* 2. Code SKU (Code-Barres) */}
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.sku}
                        placeholder="REF191000..."
                        onChange={(e) => {
                          const val = e.target.value;
                          setLocalInventory(prev => prev.map((it, i) => i === idx ? { ...it, sku: val } : it));
                        }}
                        className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-sky-400 font-mono font-bold w-36"
                      />
                    </td>

                    {/* 3. Désignation */}
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLocalInventory(prev => prev.map((it, i) => i === idx ? { ...it, name: val, crLabel: val.toUpperCase() } : it));
                        }}
                        className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-white font-semibold w-full min-w-[200px]"
                      />
                    </td>

                    {/* 4. Qté en stock */}
                    <td className="p-2 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setLocalInventory(prev => prev.map((it, i) => i === idx ? { ...it, quantity: val } : it));
                          }}
                          className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-emerald-400 font-mono w-16"
                        />
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalInventory(prev => prev.map((it, i) => i === idx ? { ...it, unit: val } : it));
                          }}
                          className="bg-slate-950 border border-slate-700 px-1.5 py-1 rounded text-slate-400 font-mono w-12 text-center"
                        />
                      </div>
                    </td>

                    {/* 5. Emplacement */}
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.location}
                        placeholder="ZONE_... ou LOC-..."
                        onChange={(e) => {
                          const val = e.target.value;
                          setLocalInventory(prev => prev.map((it, i) => i === idx ? { ...it, location: val } : it));
                        }}
                        className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-sky-300 font-mono w-36"
                      />
                    </td>

                    {/* 6. Gestionnaire */}
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.gestionnaire || ''}
                        placeholder="GT Logistics"
                        onChange={(e) => {
                          const updated = [...localInventory];
                          updated[idx].gestionnaire = e.target.value;
                          setLocalInventory(updated);
                        }}
                        className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-slate-200 text-xs w-28"
                      />
                    </td>

                    {/* 7. Machine PDT */}
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.machinePdt || ''}
                        placeholder="Poste / Machine"
                        onChange={(e) => {
                          const updated = [...localInventory];
                          updated[idx].machinePdt = e.target.value;
                          setLocalInventory(updated);
                        }}
                        className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-slate-300 font-mono text-xs w-32"
                      />
                    </td>

                    {/* 8. Réf Équipementier */}
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.refEquipementier || ''}
                        placeholder="Réf Fournisseur"
                        onChange={(e) => {
                          const updated = [...localInventory];
                          updated[idx].refEquipementier = e.target.value;
                          setLocalInventory(updated);
                        }}
                        className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-slate-400 font-mono text-xs w-32"
                      />
                    </td>

                    {/* 9. Actions */}
                    <td className="p-2 text-center">
                      <button
                        onClick={() => {
                          const updated = localInventory.filter((_, i) => i !== idx);
                          setLocalInventory(updated);
                        }}
                        className="text-rose-400 hover:text-rose-300 p-1.5 rounded hover:bg-rose-950/40"
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

          {/* Bottom Action Bar for Stock Save */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <span className="text-xs text-slate-400 font-mono">
              Total : <strong className="text-white">{localInventory.length}</strong> articles enregistrés dans le catalogue
            </span>
            <button
              onClick={handleSaveInventory}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black flex items-center space-x-2 shadow-lg shadow-emerald-500/25 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer & Synchroniser le Stock dans Supabase</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: WAREHOUSE LOCATIONS BUILDER (ALL PHYSICAL STAND & DOCK LOCATIONS) */}
      {activeTab === 'locations' && (
        <div className="bg-[#0c1e3a]/95 rounded-3xl p-6 border border-slate-700/80 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-700">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white uppercase tracking-wide">
                  Emplacements & Zones de l'Entrepôt ({localLocations.length})
                </h3>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Créez et personnalisez toutes les armoires, tiroirs, étagères, zones de pompe et quais de votre stand physique.
                Ces emplacements alimentent automatiquement le stock, les missions et la planche d'étiquettes à imprimer.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAddNewLocation}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-sky-600/30 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>+ Nouvel Emplacement</span>
              </button>

              <button
                type="button"
                onClick={handleResetLocations}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 cursor-pointer"
                title="Rétablir la liste standard GT Logistics"
              >
                Réinitialiser Standards
              </button>

              <button
                type="button"
                onClick={handleSaveLocations}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-500/30 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer les Emplacements</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="bg-[#08152c] text-slate-300 font-mono uppercase text-[10px] sm:text-[11px] border-b border-slate-700">
                <tr>
                  <th className="p-2.5">Code-barres Emplacement</th>
                  <th className="p-2.5">Libellé Emplacement</th>
                  <th className="p-2.5">Réf Courte (Ticket L/R)</th>
                  <th className="p-2.5">Désignation (Ticket C/R)</th>
                  <th className="p-2.5">Zone / Secteur</th>
                  <th className="p-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-sans">
                {localLocations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* 1. Code-barres */}
                    <td className="p-2 whitespace-nowrap">
                      <input
                        type="text"
                        value={loc.barcode}
                        onChange={(e) => handleUpdateLocationField(loc.id, 'barcode', e.target.value)}
                        placeholder="LOC-B01-T03"
                        className="bg-[#071224] border border-slate-700 focus:border-sky-400 px-2 py-1 rounded-lg text-sky-400 font-mono font-bold w-44 text-xs focus:outline-none"
                      />
                    </td>

                    {/* 2. Libellé Emplacement */}
                    <td className="p-2 min-w-[200px]">
                      <input
                        type="text"
                        value={loc.label}
                        onChange={(e) => handleUpdateLocationField(loc.id, 'label', e.target.value)}
                        placeholder="Nom de l'étagère ou du tiroir..."
                        className="bg-[#071224] border border-slate-700 focus:border-slate-400 px-2 py-1 rounded-lg text-white font-semibold w-full text-xs focus:outline-none"
                      />
                    </td>

                    {/* 3. Réf Courte L/R */}
                    <td className="p-2 whitespace-nowrap">
                      <input
                        type="text"
                        value={loc.lrCode || ''}
                        onChange={(e) => handleUpdateLocationField(loc.id, 'lrCode', e.target.value)}
                        placeholder="LOC_B01"
                        className="bg-[#071224] border border-slate-700 focus:border-amber-400 px-2 py-1 rounded-lg text-amber-300 font-mono font-bold w-32 text-xs focus:outline-none"
                      />
                    </td>

                    {/* 4. Désignation C/R */}
                    <td className="p-2 min-w-[180px]">
                      <input
                        type="text"
                        value={loc.crLabel || ''}
                        onChange={(e) => handleUpdateLocationField(loc.id, 'crLabel', e.target.value)}
                        placeholder="ARMOIRE B01 TIROIR T03"
                        className="bg-[#071224] border border-slate-700 focus:border-slate-400 px-2 py-1 rounded-lg text-slate-300 font-mono text-[11px] w-full focus:outline-none"
                      />
                    </td>

                    {/* 5. Zone / Secteur */}
                    <td className="p-2 whitespace-nowrap">
                      <input
                        type="text"
                        value={loc.zone || ''}
                        onChange={(e) => handleUpdateLocationField(loc.id, 'zone', e.target.value)}
                        placeholder="Magasin Central"
                        className="bg-[#071224] border border-slate-700 focus:border-slate-400 px-2 py-1 rounded-lg text-slate-300 text-xs w-36 focus:outline-none"
                      />
                    </td>

                    {/* 6. Actions */}
                    <td className="p-2 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicateLocation(loc)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-sky-950 text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
                          title="Dupliquer cet emplacement"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLocation(loc.id, loc.label)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                          title="Supprimer cet emplacement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-3 border-t border-slate-700 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400">
            <span>{localLocations.length} emplacement(s) configuré(s)</span>
            <button
              type="button"
              onClick={handleSaveLocations}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black flex items-center space-x-2 shadow-lg shadow-emerald-500/25 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer & Synchroniser les Emplacements</span>
            </button>
          </div>
        </div>
      )}
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

            <div className="md:col-span-2 p-4 rounded-2xl bg-slate-950 border-2 border-indigo-500/40 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-black text-white uppercase tracking-wider">
                    Mode Compétition Jour J (Verrouillage des Scans Réels)
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Empêche les participants d'avancer virtuellement en cliquant sur l'écran. Seuls les vrais scans au laser Zebra ou à la caméra smartphone valident les étapes.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={localConfig.strictScanOnly ?? false}
                  onChange={(e) => setLocalConfig({ ...localConfig, strictScanOnly: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
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

      {/* TAB 6: HAZARDS & DISTRACTIONS */}
      {activeTab === 'hazards' && (
        <div className="space-y-6">
          {/* Notification feedback */}
          {hazardFeedback && (
            <div className="bg-amber-950/90 border border-amber-500/50 text-amber-200 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center space-x-2 shadow-lg animate-pulse">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{hazardFeedback}</span>
            </div>
          )}

          {/* Section 1: Live Control & Dispatch Panel (Régie Stand en Direct) */}
          <div className="bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900 rounded-3xl p-6 border-2 border-amber-500/30 shadow-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                    <span>RÉGIE D'ANIMATION EN DIRECT • DÉCLENCHEUR D'ALÉAS</span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Déclenchez des urgences réelles et imprévues pour tester les réflexes des opérateurs et invités.
                  </p>
                </div>
              </div>

              {/* Station target selector */}
              <div className="flex items-center space-x-2 bg-slate-950 px-3.5 py-2 rounded-xl border border-amber-500/30 text-xs font-mono">
                <span className="text-slate-400 font-medium">Cible :</span>
                <select
                  value={targetStationForHazard}
                  onChange={(e) => setTargetStationForHazard(e.target.value)}
                  className="bg-transparent text-amber-400 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-900">⚡ Tous les postes (Broadcast)</option>
                  {(localConfig.availableStations || []).map((s) => (
                    <option key={s.id} value={s.id} className="bg-slate-900">
                      🎯 {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Surprise Quick Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={handleTriggerSurpriseOrder}
                className="p-4 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center justify-between shadow-lg shadow-amber-600/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center space-x-3">
                  <Boxes className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <div className="font-extrabold uppercase tracking-wide">Lancer une Commande Client Surprise</div>
                    <div className="text-[10px] font-normal opacity-90">Génère un enlèvement urgent imprévu nécessitant un scan physique immédiat</div>
                  </div>
                </div>
                <Send className="w-4 h-4 ml-2 shrink-0" />
              </button>

              <button
                onClick={() => {
                  if (distractions.length > 0) {
                    const randomDistraction = distractions[Math.floor(Math.random() * distractions.length)];
                    handleTriggerLiveHazard(randomDistraction);
                  } else {
                    setConfirmConfig({
                      isOpen: true,
                      title: 'Aucun Modèle Configuré',
                      message: 'Veuillez créer ou activer au moins un modèle d\'aléa ci-dessous avant de déclencher un flash.',
                      confirmLabel: 'Compris',
                      singleAction: true,
                      variant: 'warning'
                    });
                  }
                }}
                className="p-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-black text-xs flex items-center justify-between shadow-lg shadow-rose-600/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center space-x-3">
                  <ShieldAlert className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <div className="font-extrabold uppercase tracking-wide">Déclencher un Aléa Flash Aléatoire</div>
                    <div className="text-[10px] font-normal opacity-90">Active une alerte sonore avec sirène et compte à rebours sur le stand</div>
                  </div>
                </div>
                <Zap className="w-4 h-4 ml-2 shrink-0" />
              </button>
            </div>

            {/* List of preset hazards ready to trigger */}
            <div>
              <div className="text-xs font-mono font-bold text-slate-400 uppercase mb-2.5">
                Modèles d'Aléas Prêts au Déclenchement Immédiat :
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {distractions.map((d) => (
                  <div
                    key={d.id}
                    className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 hover:border-amber-500/50 flex flex-col justify-between gap-2.5 transition-all shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          d.severity === 'critical' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {d.severity === 'critical' ? '🚨 Critique' : '⚠️ Alerte'}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">+{d.points_bonus} pts</span>
                      </div>
                      <h4 className="text-xs font-bold text-white leading-tight">{d.title}</h4>
                      <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">{d.description}</p>
                      <div className="mt-2 text-[10px] font-mono text-slate-400">
                        Scan attendu : <strong className="text-sky-300">{d.barcode_label}</strong> ({d.expected_barcode})
                      </div>
                      <div className="text-[10px] font-mono text-amber-300 mt-0.5">
                        Délai : <strong>{d.time_limit_seconds} secondes</strong>
                      </div>
                    </div>

                    <button
                      onClick={() => handleTriggerLiveHazard(d)}
                      className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Déclencher en Direct</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Automation Settings & Interval */}
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-bold font-mono text-slate-300 uppercase flex items-center space-x-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Paramètres du Déclencheur Automatique d'Aléas :</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <input
                  type="checkbox"
                  id="autoHazardsToggle"
                  checked={localConfig.autoHazardsEnabled ?? true}
                  onChange={(e) => setLocalConfig({ ...localConfig, autoHazardsEnabled: e.target.checked })}
                  className="w-5 h-5 rounded text-amber-500 bg-slate-900 border-slate-700 cursor-pointer"
                />
                <label htmlFor="autoHazardsToggle" className="text-xs text-slate-300 cursor-pointer">
                  <strong className="text-white block">Activer les Aléas Automatiques en Continu</strong>
                  Permet au jeu d'injecter des interruptions réalistes à intervalles réguliers sans intervention manuelle.
                </label>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-center">
                <label className="text-xs text-slate-400 block mb-1">
                  Fréquence Moyenne des Aléas : <strong className="text-amber-400 font-mono">{localConfig.hazardIntervalSeconds ?? 90} secondes</strong>
                </label>
                <input
                  type="range"
                  min="30"
                  max="300"
                  step="15"
                  value={localConfig.hazardIntervalSeconds ?? 90}
                  onChange={(e) => setLocalConfig({ ...localConfig, hazardIntervalSeconds: parseInt(e.target.value) || 90 })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>30s (Intense)</span>
                  <span>90s (Standard Stand)</span>
                  <span>300s (Rare)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Clients Catalog (Laboratoires CEA) */}
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-bold font-mono text-slate-300 uppercase flex items-center space-x-2">
              <Building className="w-4 h-4 text-sky-400" />
              <span>Catalogue des Clients & Laboratoires CEA :</span>
            </h3>
            <p className="text-xs text-slate-300">
              Ces entités sont utilisées pour générer les commandes clients imprévues et les tickets de transport.
            </p>

            <div className="flex flex-wrap gap-2">
              {(localConfig.clientsCatalog || []).map((client, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center space-x-2 text-xs text-slate-200"
                >
                  <Building className="w-3.5 h-3.5 text-sky-400" />
                  <span>{client}</span>
                  <button
                    onClick={() => handleRemoveClientFromCatalog(idx)}
                    className="text-slate-500 hover:text-rose-400 transition-colors ml-1 cursor-pointer"
                    title="Supprimer ce client"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="flex space-x-2 pt-2 max-w-md">
              <input
                type="text"
                placeholder="Ex: Minatec Salle Blanche ISO 5..."
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddClientToCatalog()}
                className="flex-1 bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white"
              />
              <button
                onClick={handleAddClientToCatalog}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter</span>
              </button>
            </div>
          </div>

          {/* Section 4: Create / Edit Distraction Templates */}
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold font-mono text-slate-300 uppercase flex items-center space-x-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Créer ou Configurer un Modèle d'Aléa :</span>
              </h3>

              {/* Quick Preset Generator from Inventory */}
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    const item = localInventory.find(i => i.sku === val);
                    if (item) {
                      setNewDistraction({
                        title: `🚨 URGENCE FLASH : Rupture de stock ${item.name} !`,
                        expected_barcode: item.sku,
                        barcode_label: `${item.name} (${item.sku})`,
                        description: `Intervention logistique urgente demandée : prélevez et scannez immédiatement ${item.name} pour débloquer la production !`,
                        time_limit_seconds: 45,
                        points_bonus: 700,
                        severity: 'critical',
                        is_active: true
                      });
                    }
                  }}
                  defaultValue=""
                  className="bg-slate-950 border border-amber-500/50 text-xs text-amber-300 font-mono px-3 py-1.5 rounded-xl focus:outline-none cursor-pointer"
                >
                  <option value="">⚡ Préremplir depuis un article Stock...</option>
                  {localInventory.map(item => (
                    <option key={item.id || item.sku} value={item.sku}>📦 {item.name} ({item.sku})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Template Chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-[11px] text-slate-400 font-mono block w-full">Suggestions d'urgences d'entrepôt prêtes à charger :</span>
              <button
                type="button"
                onClick={() => setNewDistraction({
                  title: '🚨 URGENCE FLASH : Arrêt Banc Dépôt Bât. 17 !',
                  expected_barcode: 'ART-KF40-INOX',
                  barcode_label: 'Bride KF40 Inox (Casier Allée B)',
                  description: 'Ligne PVD stoppée : amenez d\'urgence la bride KF40 inox pour reprise du vide.',
                  time_limit_seconds: 40,
                  points_bonus: 750,
                  severity: 'critical',
                  is_active: true
                })}
                className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-[11px] text-amber-300 rounded-lg border border-amber-500/30 cursor-pointer"
              >
                🚨 Arrêt Banc Dépôt (Bride KF40)
              </button>
              <button
                type="button"
                onClick={() => setNewDistraction({
                  title: '⚠️ CONTRÔLE QUALITÉ : Scellé de sécurité transport',
                  expected_barcode: 'ART-SCEL-SECURITE',
                  barcode_label: 'Scellé de Sécurité Transport',
                  description: 'Audit inopiné ISO 9001 : scannez le scellé de sécurité pour valider la conformité.',
                  time_limit_seconds: 50,
                  points_bonus: 500,
                  severity: 'warning',
                  is_active: true
                })}
                className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-[11px] text-amber-300 rounded-lg border border-amber-500/30 cursor-pointer"
              >
                ⚠️ Contrôle Qualité (Scellé)
              </button>
              <button
                type="button"
                onClick={() => setNewDistraction({
                  title: '🚚 ARRIVÉE TRANSPORTEUR : Camion à quai',
                  expected_barcode: 'DOCK-INTL-FRET',
                  barcode_label: 'Quai Départs Fret International',
                  description: 'Le transporteur international attend au quai : validez la prise en charge immédiate.',
                  time_limit_seconds: 45,
                  points_bonus: 600,
                  severity: 'critical',
                  is_active: true
                })}
                className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-[11px] text-amber-300 rounded-lg border border-amber-500/30 cursor-pointer"
              >
                🚚 Camion à Quai (Fret Intl)
              </button>
              <button
                type="button"
                onClick={() => setNewDistraction({
                  title: '❄️ ALERTE CRYO : Contrôle vanne Zone Pompe 41',
                  expected_barcode: 'ZONE_POMPE_GRILLE_41',
                  barcode_label: 'Zone Pompe Grille 41',
                  description: 'Variation de pression détectée sur le circuit cryo : scannez l\'emplacement Zone Pompe 41.',
                  time_limit_seconds: 45,
                  points_bonus: 650,
                  severity: 'critical',
                  is_active: true
                })}
                className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-[11px] text-amber-300 rounded-lg border border-amber-500/30 cursor-pointer"
              >
                ❄️ Alerte Cryo (Zone Pompe 41)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Titre de l'Aléa :</label>
                <input
                  type="text"
                  placeholder="Ex: 🚨 FUITE AZOTE LIQUIDE : Salle Blanche"
                  value={newDistraction.title || ''}
                  onChange={(e) => setNewDistraction({ ...newDistraction, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Code-Barres Physique Attendu :</label>
                <input
                  type="text"
                  placeholder="Ex: ART-KF40-INOX ou LOC-B01-T03"
                  value={newDistraction.expected_barcode || ''}
                  onChange={(e) => setNewDistraction({ ...newDistraction, expected_barcode: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Libellé de l'Étiquette :</label>
                <input
                  type="text"
                  placeholder="Ex: Bride KF40 Inox (Casier Allée B)"
                  value={newDistraction.barcode_label || ''}
                  onChange={(e) => setNewDistraction({ ...newDistraction, barcode_label: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-slate-400 block mb-1">Consigne / Description affichée à l'écran :</label>
                <input
                  type="text"
                  placeholder="Ex: Scanner immédiatement le scellé de sécurité pour valider la coupure vanne."
                  value={newDistraction.description || ''}
                  onChange={(e) => setNewDistraction({ ...newDistraction, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Délai (secondes) :</label>
                  <input
                    type="number"
                    value={newDistraction.time_limit_seconds || 45}
                    onChange={(e) => setNewDistraction({ ...newDistraction, time_limit_seconds: parseInt(e.target.value) || 45 })}
                    className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Bonus Points :</label>
                  <input
                    type="number"
                    value={newDistraction.points_bonus || 600}
                    onChange={(e) => setNewDistraction({ ...newDistraction, points_bonus: parseInt(e.target.value) || 600 })}
                    className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveDistractionTemplate}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Enregistrer ce Modèle d'Aléa dans Supabase</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 7: DATABASE, BACKUP & SCENARIO FILES */}
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

          {/* Detailed Scores Management Table */}
          <div className="bg-slate-950/80 rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold font-mono text-white uppercase">
                  Gestion Individuelle des Scores du Classement ({adminScores.length} enregistrements) :
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadAdminScores}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono"
                >
                  Actualiser
                </button>
                {adminScores.length > 0 && (
                  <button
                    onClick={handleClearScores}
                    className="px-3 py-1 bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-mono font-bold"
                  >
                    Tout Purger
                  </button>
                )}
              </div>
            </div>

            {adminScores.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 italic">
                Aucun score enregistré dans la base de données. Le classement est 100% vierge.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2 px-3">Rang</th>
                      <th className="py-2 px-3">Invité / Duo</th>
                      <th className="py-2 px-3">Collaborateur / Organisme</th>
                      <th className="py-2 px-3 text-right">Score</th>
                      <th className="py-2 px-3 text-right">Temps</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {adminScores.map((sc, idx) => (
                      <tr key={sc.id || idx} className="hover:bg-slate-900/50">
                        <td className="py-2 px-3 font-bold text-slate-400">#{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-white">{sc.name}</td>
                        <td className="py-2 px-3 text-slate-400">{sc.company}</td>
                        <td className="py-2 px-3 text-right text-emerald-400 font-bold">{sc.score} pts</td>
                        <td className="py-2 px-3 text-right text-slate-400">{sc.time_spent || '-'}</td>
                        <td className="py-2 px-3 text-center">
                          {sc.id && (
                            <button
                              onClick={() => handleDeleteAdminScore(sc.id!, sc.name)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
                              title="Supprimer ce score"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modern In-App Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmLabel={confirmConfig.confirmLabel}
        variant={confirmConfig.variant}
        singleAction={confirmConfig.singleAction}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={async () => {
          if (confirmConfig.action) {
            await confirmConfig.action();
          }
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        }}
      />
    </div>
  );
};
