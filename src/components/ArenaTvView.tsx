import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { DuoStation, AppConfig, Mission, OperatorProfile } from '../types';
import { MISSIONS } from '../data/missions';
import { 
  getStationsLive, 
  subscribeToStationsLive, 
  getRemoteLeaderboard, 
  subscribeToScores,
  resetAllLiveStations,
  RemoteScore,
  subscribeToLiveActivity,
  getRecentLiveActivities,
  updateStationLive,
  LiveActivityEvent
} from '../services/supabaseClient';
import { 
  Tv, 
  Trophy, 
  Flame, 
  CheckCircle2, 
  Clock, 
  Users, 
  Radio, 
  Sparkles, 
  QrCode, 
  Package, 
  Award, 
  Play, 
  Pause, 
  RotateCcw, 
  Swords, 
  ExternalLink,
  Maximize2,
  Minimize2,
  Home,
  Check,
  ChevronRight,
  Truck,
  ScanBarcode,
  X,
  Zap,
  Activity,
  AlertTriangle,
  Plus,
  Volume2,
  VolumeX,
  Mic,
  FileText,
  Shuffle
} from 'lucide-react';
import { GameLogo } from './GameLogo';
import { ConfirmModal } from './ConfirmModal';
import { DiplomeModal } from './DiplomeModal';
import { soundService } from '../services/soundService';

interface ArenaTvViewProps {
  appConfig: AppConfig;
  missions?: Mission[];
  onBackToHome?: () => void;
}

export const ArenaTvView: React.FC<ArenaTvViewProps> = ({ appConfig, missions: propMissions, onBackToHome }) => {
  const [stations, setStations] = useState<DuoStation[]>([]);
  const [topScores, setTopScores] = useState<RemoteScore[]>([]);
  const [lastEventMsg, setLastEventMsg] = useState<string>('En attente du départ du duel...');
  const [matchSeconds, setMatchSeconds] = useState<number>(180);
  const [isMatchRunning, setIsMatchRunning] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Live Admin Monitor Feed
  const [liveActivities, setLiveActivities] = useState<LiveActivityEvent[]>([]);

  // Pre-match Setup Modal with Duo Registration & QR Codes
  const [isSetupModalOpen, setIsSetupModalOpen] = useState<boolean>(false);
  const [d1Cea, setD1Cea] = useState(() => localStorage.getItem('gt_d1_collab') || 'Jeremy (GT)');
  const [d1Guest, setD1Guest] = useState(() => localStorage.getItem('gt_d1_guest') || 'Thomas (Invité)');
  const [d2Cea, setD2Cea] = useState(() => localStorage.getItem('gt_d2_collab') || 'Sarah (GT)');
  const [d2Guest, setD2Guest] = useState(() => localStorage.getItem('gt_d2_guest') || 'Alexandre (Invité)');
  const [selectedM1Idx, setSelectedM1Idx] = useState(0);
  const [selectedM2Idx, setSelectedM2Idx] = useState(1);
  const [duoRoundNumber, setDuoRoundNumber] = useState(1);

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Axe 1 & 3: Adrénaline TV & Régie Speaker
  const [syncCountdown, setSyncCountdown] = useState<number | null>(null);
  const [isEndMatchModalOpen, setIsEndMatchModalOpen] = useState<boolean>(false);
  const [selectedDiplomeStation, setSelectedDiplomeStation] = useState<DuoStation | null>(null);
  const [previousLeaderId, setPreviousLeaderId] = useState<string | null>(null);
  const [takeoverBanner, setTakeoverBanner] = useState<{ text: string; team: string; color: string } | null>(null);
  const [hazardAlert, setHazardAlert] = useState<string | null>(null);
  const [goldenTicketEvent, setGoldenTicketEvent] = useState<{ teamName: string; points: number } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Synchronized 3-2-1 Departure
  const handleStartSyncCountdown = () => {
    if (syncCountdown !== null || isMatchRunning) return;
    setSyncCountdown(3);
    soundService.playCountdownBeep(false);

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setSyncCountdown(count);
        soundService.playCountdownBeep(false);
      } else if (count === 0) {
        setSyncCountdown(0);
        soundService.playCountdownBeep(true);
        setIsMatchRunning(true);
        setLastEventMsg('🚀 TOP DÉPART DUEL SYNCHRONISÉ ! Bonne chance aux deux binômes !');
        setTimeout(() => setSyncCountdown(null), 1200);
        clearInterval(interval);
      } else {
        clearInterval(interval);
      }
    }, 1000);
  };

  // Match Countdown Timer with Audio Cues
  useEffect(() => {
    if (!isMatchRunning) return;
    const timer = setInterval(() => {
      setMatchSeconds((prev) => {
        if (prev <= 1) {
          setIsMatchRunning(false);
          soundService.playCountdownBeep(true);
          soundService.playMatchEndGong();
          setIsEndMatchModalOpen(true);
          setLastEventMsg('🏁 FIN DU MATCH ! Résultats et proclamations en cours...');
          return 0;
        }
        // Countdown audio beeps during last 10 seconds (10 to 2)
        if (prev <= 11 && prev > 1) {
          soundService.playCountdownBeep(false);
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isMatchRunning]);

  // Overtime +30s
  const handleAdd30Seconds = () => {
    setMatchSeconds((prev) => prev + 30);
    setLastEventMsg('⏱️ PROLONGATION RÉGIE : +30 secondes ajoutées au duel !');
  };

  // Quick Logistics Hazard Trigger from TV
  const QUICK_HAZARDS = [
    '⚠️ ALÉA FLASH : Contrôle qualité inopiné sur quai A (+100 pts bonus) !',
    '📦 ALÉA FLASH : Colis fragile identifié - double scan de confirmation requis !',
    '🚨 FLASH STOCK : Rupture immédiate sur rayonnage - bascule vers stock tampon !',
    '⚡ FLASH SCAN : Code-barre froissé signalé - mode caméra recommandé !'
  ];

  const handleTriggerQuickHazardFromTv = () => {
    const hazard = QUICK_HAZARDS[Math.floor(Math.random() * QUICK_HAZARDS.length)];
    setHazardAlert(hazard);
    setLastEventMsg(hazard);
    setTimeout(() => setHazardAlert(null), 6000);
  };

  // Smart Live Speaker Commentary Ticker
  const getSpeakerCommentary = (): string => {
    const s1 = stations.find((s) => s.station_id === 'poste-1');
    const s2 = stations.find((s) => s.station_id === 'poste-2');
    const s1Score = s1?.score || 0;
    const s2Score = s2?.score || 0;
    const diff = Math.abs(s1Score - s2Score);

    if (matchSeconds === 0) {
      if (s1Score > s2Score) return `🏆 Victoire de ${s1?.team_name || 'Poste 1'} avec ${s1Score} pts ! Une cadence logistique magistrale !`;
      if (s2Score > s1Score) return `🏆 Victoire de ${s2?.team_name || 'Poste 2'} avec ${s2Score} pts ! Une cadence logistique magistrale !`;
      return "🤝 Égalité parfaite ! Un duel d'anthologie pour les 25 ans de GT Logistics !";
    }

    if (matchSeconds <= 30 && isMatchRunning) {
      return "🔥 SPRINT FINAL : Moins de 30 secondes au chrono ! Tout peut basculer sur le dernier scan !";
    }

    if (diff <= 150 && (s1Score > 0 || s2Score > 0)) {
      return `⚔️ Coude à coude palpitant : seulement ${diff} points d'écart entre les deux binômes !`;
    }

    if ((s1?.combo && s1.combo >= 3) || (s2?.combo && s2.combo >= 3)) {
      const hotTeam = (s1?.combo || 0) >= 3 ? s1?.team_name : s2?.team_name;
      return `⚡ Série parfaite sans faute pour ${hotTeam} ! Le multiplicateur de score s'envole !`;
    }

    if ((s1?.progress_percent || 0) >= 80 || (s2?.progress_percent || 0) >= 80) {
      const leadingTeam = (s1?.progress_percent || 0) >= 80 ? s1?.team_name : s2?.team_name;
      return `📦 ${leadingTeam} est tout proche de la validation finale sur le quai de livraison !`;
    }

    return "🎙️ Précision industrielle et réactivité : les deux binômes relèvent le défi logistique du CEA !";
  };

  const formatMatchTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleToggleMatch = () => {
    setIsMatchRunning((prev) => !prev);
  };

  const handleResetMatchTime = () => {
    setIsMatchRunning(false);
    setMatchSeconds(appConfig.shiftDurationSeconds || 180);
  };

  const executeResetArena = async () => {
    await resetAllLiveStations();
    const fresh = await getStationsLive();
    setStations(fresh);
    setIsMatchRunning(false);
    setMatchSeconds(appConfig.shiftDurationSeconds || 180);
    setLastEventMsg('Arène remise à zéro • En attente des nouveaux duos');
    setLiveActivities([]);
    setIsResetConfirmOpen(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const baseUrl = (appConfig.publicUrl || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
  const qrZebra1 = `${baseUrl}/#play?station=poste-1`;
  const qrZebra2 = `${baseUrl}/#play?station=poste-2`;

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [liveStations, rawScores, recentActs] = await Promise.all([
          getStationsLive(),
          getRemoteLeaderboard(),
          getRecentLiveActivities(8)
        ]);

        if (!isMounted) return;

        if (liveStations && liveStations.length > 0) {
          setStations(liveStations);
          const s1 = liveStations.find((s) => s.station_id === 'poste-1');
          const s2 = liveStations.find((s) => s.station_id === 'poste-2');
          if (s1?.operator_cea) setD1Cea(s1.operator_cea);
          if (s1?.client_guest) setD1Guest(s1.client_guest);
          if (s2?.operator_cea) setD2Cea(s2.operator_cea);
          if (s2?.client_guest) setD2Guest(s2.client_guest);
        } else {
          setStations([
            {
              station_id: 'poste-1',
              station_name: 'Poste 1 (Scannette A)',
              operator_cea: d1Cea,
              client_guest: d1Guest,
              team_name: `Duo ${d1Guest}`,
              current_mission_title: 'En attente...',
              progress_percent: 0,
              current_step_index: 0,
              total_steps: 5,
              score: 0,
              combo: 0,
              status: 'idle'
            },
            {
              station_id: 'poste-2',
              station_name: 'Poste 2 (Scannette B)',
              operator_cea: d2Cea,
              client_guest: d2Guest,
              team_name: `Duo ${d2Guest}`,
              current_mission_title: 'En attente...',
              progress_percent: 0,
              current_step_index: 0,
              total_steps: 5,
              score: 0,
              combo: 0,
              status: 'idle'
            }
          ]);
        }

        // Leaderboard sans doublons : uniquement le meilleur score par binôme
        const seenNames = new Set<string>();
        const uniqueScores: RemoteScore[] = [];
        for (const sc of rawScores) {
          const cleanKey = (sc.name || '').trim().toLowerCase();
          if (!cleanKey || seenNames.has(cleanKey)) continue;
          seenNames.add(cleanKey);
          uniqueScores.push(sc);
        }
        setTopScores(uniqueScores.slice(0, 5));

        // Chargement immédiat des derniers scans laser réels
        if (recentActs && recentActs.length > 0) {
          setLiveActivities(recentActs);
          setLastEventMsg(`${recentActs[0].station_name} • ${recentActs[0].message}`);
        }
      } catch (err) {
        console.warn('[ArenaTv] Erreur chargement initial:', err);
      }
    }

    loadData();

    // Subscribe to live stations updates
    const unsubStations = subscribeToStationsLive((updatedStation) => {
      setStations((prev) => {
        const idx = prev.findIndex((s) => s.station_id === updatedStation.station_id);
        if (idx !== -1) {
          const clone = [...prev];
          clone[idx] = updatedStation;
          return clone;
        }
        return [...prev, updatedStation];
      });

      if (updatedStation.last_scan_code) {
        setLastEventMsg(
          `⚡ ${updatedStation.team_name} a scanné [${updatedStation.last_scan_code}]`
        );
      }
    });

    // Subscribe to live activities from Zebra scans
    const unsubActivity = subscribeToLiveActivity((activity) => {
      if (!isMounted) return;
      setLiveActivities((prev) => [activity, ...prev].slice(0, 6));
      setLastEventMsg(`${activity.station_name} • ${activity.message}`);

      if (activity.action_type === 'GOLDEN_TICKET') {
        setGoldenTicketEvent({
          teamName: activity.station_name || 'Un Duo d\'Élite',
          points: activity.points_delta || 2500
        });
        if (soundEnabled) {
          soundService.playGoldenTicketFanfare();
        }
        try {
          confetti({
            particleCount: 160,
            spread: 95,
            origin: { y: 0.4 },
            colors: ['#f59e0b', '#fbbf24', '#d97706', '#e30613', '#ffffff']
          });
        } catch {}
        setTimeout(() => {
          setGoldenTicketEvent(null);
        }, 12000);
      }
    });

    // Subscribe to scores leaderboard updates
    const unsubScores = subscribeToScores(async () => {
      const scores = await getRemoteLeaderboard();
      if (isMounted) {
        const seenNames = new Set<string>();
        const uniqueScores: RemoteScore[] = [];
        for (const sc of scores) {
          const cleanKey = (sc.name || '').trim().toLowerCase();
          if (!cleanKey || seenNames.has(cleanKey)) continue;
          seenNames.add(cleanKey);
          uniqueScores.push(sc);
        }
        setTopScores(uniqueScores.slice(0, 5));
      }
    });

    return () => {
      isMounted = false;
      unsubStations();
      unsubActivity();
      unsubScores();
    };
  }, []);

  // Leader Takeover Detection (Axe 1: Adrénaline Duel)
  useEffect(() => {
    if (!isMatchRunning) return;
    const s1 = stations.find((s) => s.station_id === 'poste-1');
    const s2 = stations.find((s) => s.station_id === 'poste-2');
    if (!s1 || !s2) return;

    const s1Score = s1.score || 0;
    const s2Score = s2.score || 0;

    let currentLeader: string | null = null;
    if (s1Score > s2Score && s1Score > 0) currentLeader = 'poste-1';
    else if (s2Score > s1Score && s2Score > 0) currentLeader = 'poste-2';

    if (currentLeader && previousLeaderId && currentLeader !== previousLeaderId) {
      const winningTeam = currentLeader === 'poste-1' ? (s1.team_name || 'Duo Bleu') : (s2.team_name || 'Duo Orange');
      const color = currentLeader === 'poste-1' ? 'sky' : 'amber';
      setTakeoverBanner({
        text: `⚡ CHANGEMENT EN TÊTE : ${winningTeam} prend l'avantage !`,
        team: winningTeam,
        color
      });
      soundService.playTakeover();
      const timer = setTimeout(() => setTakeoverBanner(null), 4500);
      setPreviousLeaderId(currentLeader);
      return () => clearTimeout(timer);
    }

    if (currentLeader && currentLeader !== previousLeaderId) {
      setPreviousLeaderId(currentLeader);
    }
  }, [stations, isMatchRunning, previousLeaderId]);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundService.setSoundEnabled(next);
  };

  const handleRandomizeMissions = () => {
    soundService.playSuccessJingle();
    const count = missionsPool.length;
    const rand1 = Math.floor(Math.random() * count);
    let rand2 = Math.floor(Math.random() * count);
    if (count > 1 && rand2 === rand1) {
      rand2 = (rand1 + 1) % count;
    }
    setSelectedM1Idx(rand1);
    setSelectedM2Idx(rand2);
  };

  const handleNextDuo = () => {
    soundService.playScanBeep();
    const nextRound = duoRoundNumber + 1;
    setDuoRoundNumber(nextRound);
    setD1Guest(`Invité Duo #${nextRound * 2 - 1}`);
    setD2Guest(`Invité Duo #${nextRound * 2}`);
    const count = missionsPool.length;
    setSelectedM1Idx((nextRound * 2 - 2) % count);
    setSelectedM2Idx((nextRound * 2 - 1) % count);
  };

  const handleLaunchDuelFromTv = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    localStorage.setItem('gt_d1_collab', d1Cea);
    localStorage.setItem('gt_d1_guest', d1Guest);
    localStorage.setItem('gt_d2_collab', d2Cea);
    localStorage.setItem('gt_d2_guest', d2Guest);

    const name1 = `Duo ${d1Guest.trim() || 'Invité 1'}`;
    const name2 = `Duo ${d2Guest.trim() || 'Invité 2'}`;

    const m1Selected = missionsPool[selectedM1Idx % missionsPool.length] || missionsPool[0];
    const m2Selected = missionsPool[selectedM2Idx % missionsPool.length] || missionsPool[1] || missionsPool[0];

    await updateStationLive({
      station_id: 'poste-1',
      station_name: 'Poste 1 (Scannette A)',
      operator_cea: d1Cea.trim() || 'Collaborateur GT 1',
      client_guest: d1Guest.trim() || 'Invité 1',
      team_name: name1,
      score: 0,
      combo: 0,
      progress_percent: 0,
      current_step_index: 0,
      total_steps: m1Selected.steps.length,
      status: 'in_progress',
      current_mission_title: m1Selected.title
    });

    await updateStationLive({
      station_id: 'poste-2',
      station_name: 'Poste 2 (Scannette B)',
      operator_cea: d2Cea.trim() || 'Collaborateur GT 2',
      client_guest: d2Guest.trim() || 'Invité 2',
      team_name: name2,
      score: 0,
      combo: 0,
      progress_percent: 0,
      current_step_index: 0,
      total_steps: m2Selected.steps.length,
      status: 'in_progress',
      current_mission_title: m2Selected.title
    });

    setMatchSeconds(appConfig.shiftDurationSeconds || 180);
    setIsMatchRunning(true);
    setIsSetupModalOpen(false);
    setLastEventMsg('🚀 TOP DÉPART DUEL ! Les 2 scannettes sont actives !');
  };

  const station1 = stations.find((s) => s.station_id === 'poste-1') || stations[0];
  const station2 = stations.find((s) => s.station_id === 'poste-2') || stations[1];

  // Helper to dynamically extract realistic short step labels according to active mission
  const getStationSteps = (station?: DuoStation): string[] => {
    if (!station) return ['Étape 1', 'Étape 2', 'Étape 3', 'Livraison'];
    
    const missionTitle = station.current_mission_title?.toLowerCase() || '';
    const pool = (propMissions && propMissions.length > 0) ? propMissions : MISSIONS;
    const foundMission = pool.find(m => 
      missionTitle.includes(m.title.toLowerCase().substring(0, 15)) ||
      m.title.toLowerCase().includes(missionTitle.substring(0, 15)) ||
      m.code.toLowerCase() === missionTitle
    );

    if (foundMission && foundMission.steps.length > 0) {
      return foundMission.steps.map((step: any) => {
        if (step.expectedBarcode === 'LOC-B01-T03') return 'Armoire B01';
        if (step.expectedBarcode === 'LOC-B01-T04') return 'Armoire T04';
        if (step.expectedBarcode === 'ART-KF40-INOX') return 'Bride KF40';
        if (step.expectedBarcode === 'REF191000007490') return 'Joint Kalrez';
        if (step.expectedBarcode === 'LOC-ETAGERE-LIVRAISON') return 'Livraison Client';
        if (step.expectedBarcode === 'LOC-ETAGERE-COLLECTE') return 'Étagère Collecte';
        if (step.expectedBarcode === 'ZONE_POMPE_GRILLE_41') return 'Zone Pompe 41';
        if (step.expectedBarcode === 'LOC-ETA1-NIV1') return 'Étagère 1';
        if (step.expectedBarcode === 'LOC-ETA1-NIV2') return 'Étagère 1 N2';
        if (step.expectedBarcode === 'LOC-ETA1-NIV3') return 'Étagère 1 N3';
        if (step.expectedBarcode === 'LOC-ETA2-NIV1') return 'Étagère 2 N1';
        if (step.expectedBarcode === 'LOC-ETA2-NIV2') return 'Étagère 2 N2';
        if (step.expectedBarcode === 'LOC-ETA2-NIV3') return 'Étagère 2 N3';
        if (step.expectedBarcode === 'DOC-TRANSPORT-INTL') return 'Doc Transport';
        if (step.expectedBarcode === 'ART-CARTON-EXP') return 'Carton Double';
        if (step.expectedBarcode === 'ZONE_RECEPTION_CENTRALE') return 'Réception Cent.';
        if (step.expectedBarcode === 'ART-WAFER-300MM') return 'Wafer 300mm';
        if (step.expectedBarcode === 'ART-WAFER-200MM') return 'Wafer 200mm';
        if (step.expectedBarcode === 'ART-CASSETTE-FOUP') return 'FOUP 300mm';
        if (step.expectedBarcode === 'ART-PINCE-TEFLON') return 'Pince Téflon';
        if (step.expectedBarcode === 'ART-CARRIER-QUARTZ') return 'Nacelle Quartz';
        if (step.expectedBarcode === 'ART-TARGET-TITANE') return 'Cible Titane';
        if (step.expectedBarcode === 'ART-RESINE-PHOTORESIST') return 'Résine Litho';
        if (step.expectedBarcode === 'ART-GEL-PACK-MEMS') return 'Gel-Pak MEMS';
        if (step.expectedBarcode === 'ART-SACHET-ESD') return 'Sachet ESD';
        if (step.expectedBarcode === 'ART-BOITE-PETRI-SB') return 'Boîte Pétri';
        if (step.expectedBarcode === 'ART-VITON-KF40') return 'Joint Viton';
        if (step.expectedBarcode === 'ART-CLAMP-KF25') return 'Collier KF25';
        if (step.expectedBarcode === 'ART-PUMP-EDWARDS') return 'Pompe Edwards';
        if (step.expectedBarcode === 'ART-ELECTROVANNE-PNEU') return 'Vanne SMC';
        if (step.expectedBarcode === 'ART-SCEL-SECURITE') return 'Scellé IATA';
        if (step.expectedBarcode === 'DOCK-EXPED-01') return 'Quai A';
        if (step.expectedBarcode === 'DOCK-EXPED-02') return 'Quai B';
        if (step.expectedBarcode === 'LOC-SB-C01') return 'Sas SB C01';
        if (step.expectedBarcode === 'LOC-PACK-ZONE') return 'Zone Emballage';
        return step.crLabel?.slice(0, 14) || step.targetLabel?.split('(')[0].trim() || 'Étape';
      });
    }

    const count = station.total_steps && station.total_steps > 0 ? station.total_steps : 4;
    return Array.from({ length: count }, (_, i) => `Étape ${i + 1}`);
  };

  const steps1 = getStationSteps(station1);
  const steps2 = getStationSteps(station2);
  const isStation1Finished = (station1?.progress_percent ?? 0) >= 100 || station1?.status === 'completed';
  const isStation2Finished = (station2?.progress_percent ?? 0) >= 100 || station2?.status === 'completed';

  const missionsPool = (propMissions && propMissions.length > 0) ? propMissions : MISSIONS;
  const station1Missions = missionsPool;
  // Poste 2 exécute les missions dans l'ordre inversé pour éviter que les deux binômes soient sur la même étagère
  const station2Missions = missionsPool.slice().reverse();

  const getStationMissionIndex = (station?: DuoStation, missionsList: Mission[] = missionsPool): number => {
    if (!station) return 0;
    const title = (station.current_mission_title || '').toLowerCase().trim();
    const idx = missionsList.findIndex(m => 
      title.includes(m.title.toLowerCase().substring(0, 15)) ||
      m.title.toLowerCase().includes(title.substring(0, 15)) ||
      m.code.toLowerCase() === title
    );
    return idx !== -1 ? idx : 0;
  };

  const getMissionShortTitle = (m: Mission, idx: number): string => {
    let clean = m.title.split('(')[0].trim();
    if (m.code.includes('601') || m.title.toLowerCase().includes('multi-articles')) clean = 'Cde Multi-Articles';
    else if (m.code.includes('COL') || m.title.toLowerCase().includes('collecte')) clean = 'Retour en Stock';
    else if (m.code.includes('REA') || m.title.toLowerCase().includes('reacteur')) clean = 'Réappro Réacteur';
    else if (m.code.includes('INT') || m.title.toLowerCase().includes('internationale')) clean = 'Expéd. Inter.';
    return `${idx + 1}. ${clean}`;
  };

  const activeIdx1 = getStationMissionIndex(station1, station1Missions);
  const activeIdx2 = getStationMissionIndex(station2, station2Missions);
  const completedCount1 = activeIdx1 + (isStation1Finished ? 1 : 0);
  const completedCount2 = activeIdx2 + (isStation2Finished ? 1 : 0);

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-[#08152c] via-[#071224] to-[#050d1a] text-slate-100 flex flex-col justify-between p-3 sm:p-5 lg:p-7 select-none relative overflow-hidden font-sans border-t-4 border-t-red-600">
      {/* Dynamic Ambient Background Glows GT Logistics (Navy & Red accents) */}
      <div className="absolute top-0 left-0 w-[550px] h-[550px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-red-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-[650px] h-[350px] bg-indigo-900/15 rounded-full blur-[170px] pointer-events-none" />

      {/* ========================================================================= */}
      {/* 1. TOP BROADCAST BAR (Style Régie GT Logistics Officielle)                */}
      {/* ========================================================================= */}
      <header className="z-10 bg-[#0c1e3a]/95 backdrop-blur-xl border border-slate-700/70 rounded-3xl px-5 sm:px-6 py-3.5 shadow-2xl flex flex-wrap items-center justify-between gap-3 relative overflow-hidden">
        {/* Subtle top GT red stripe */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-80" />

        {/* Left: Brand & Event Title */}
        <div className="flex items-center gap-3">
          <GameLogo
            customLogoUrl={appConfig.customLogoUrl}
            size="md"
            showSubtitle={false}
          />
          <div className="h-8 w-px bg-slate-700/80 hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-sans font-black text-base sm:text-xl text-white tracking-wide uppercase">
                GRANDE ARÈNE DUEL
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase font-mono px-2.5 py-0.5 rounded-full bg-red-600 text-white shadow-md shadow-red-600/30">
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                <span>DIRECT 55"</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-sans flex items-center gap-1.5">
              <span>CEA Grenoble 25 Ans</span>
              <span className="text-red-500 font-bold">•</span>
              <span className="italic text-slate-400">« Vous êtes unique, nos prestations <strong className="text-red-400 not-italic">aussi.</strong> »</span>
            </p>
          </div>
        </div>

        {/* Center: GIANT ARENA CHRONOMETER (With Money Time styling) */}
        <div className={`flex items-center gap-3 px-5 py-2 rounded-2xl border transition-all duration-300 shadow-inner ${
          matchSeconds <= 30 && matchSeconds > 0 && isMatchRunning
            ? 'bg-gradient-to-r from-slate-950 via-red-950/50 to-slate-950 border-red-500 shadow-[0_0_30px_rgba(239,35,60,0.4)] animate-pulse'
            : 'bg-[#071224] border-slate-700/80'
        }`}>
          <div className="text-center">
            <span className={`text-[9px] uppercase font-mono tracking-widest font-bold block ${
              matchSeconds <= 30 && matchSeconds > 0 && isMatchRunning ? 'text-red-400 font-black' : 'text-slate-400'
            }`}>
              {matchSeconds <= 30 && matchSeconds > 0 && isMatchRunning ? '🔥 SPRINT FINAL (MONEY TIME)' : 'CHRONO DUEL (3 MIN)'}
            </span>
            <div className={`font-display font-black text-3xl sm:text-5xl tracking-wider ${
              matchSeconds <= 30 && matchSeconds > 0 && isMatchRunning
                ? 'text-red-400 drop-shadow-[0_0_20px_rgba(239,35,60,0.6)]'
                : 'text-amber-300 drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]'
            }`}>
              {formatMatchTime(matchSeconds)}
            </div>
          </div>

          {/* Chrono Controls & Régie Buttons */}
          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-800">
            <button
              onClick={handleToggleMatch}
              className={`p-2.5 rounded-xl font-bold transition-all shadow-lg cursor-pointer ${
                isMatchRunning
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/20'
                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/20'
              }`}
              title={isMatchRunning ? 'Mettre en pause' : 'Démarrer le chronomètre'}
            >
              {isMatchRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>

            <button
              onClick={handleResetMatchTime}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Remettre le chrono à 03:00"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* +30s Prolongation Button */}
            <button
              onClick={handleAdd30Seconds}
              className="px-2.5 py-2 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1"
              title="Ajouter 30 secondes au duel"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>30s</span>
            </button>
          </div>
        </div>

        {/* Right: Actions, Régie Speaker & Duel Setup Button */}
        <div className="flex items-center gap-2">
          {/* Synchronized Departure 3-2-1 */}
          <button
            type="button"
            onClick={handleStartSyncCountdown}
            disabled={isMatchRunning || syncCountdown !== null}
            className={`px-3 py-2 rounded-xl font-mono text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              isMatchRunning
                ? 'bg-slate-900 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400/40 shadow-lg shadow-emerald-600/20'
            }`}
            title="Lancer le décompte 3-2-1 avec bips sonores"
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Départ</span>
            <span>3-2-1</span>
          </button>

          {/* Quick Hazard Trigger */}
          <button
            type="button"
            onClick={handleTriggerQuickHazardFromTv}
            className="px-2.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1"
            title="Déclencher un aléa logistique inopiné"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Aléa</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-500 border-slate-700'
            }`}
            title={soundEnabled ? 'Effets sonores activés' : 'Son coupé'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* PRIMARY SETUP BUTTON: REGISTRATION & QR CODES */}
          <button
            type="button"
            onClick={() => setIsSetupModalOpen(true)}
            className="px-3.5 py-2.5 bg-gradient-to-r from-sky-600 via-indigo-600 to-amber-500 hover:from-sky-500 hover:to-amber-400 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
          >
            <Users className="w-4 h-4 text-amber-300" />
            <QrCode className="w-4 h-4 text-sky-200" />
            <span className="hidden md:inline">CONSTITUER DUOS & QR</span>
          </button>

          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 text-xs font-mono font-bold transition-colors cursor-pointer"
            title="Remettre les duos et scores à 0"
          >
            RÀZ
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Plein Écran"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Retour à l'accueil"
            >
              <Home className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* BROADCAST NOTIFICATIONS (Leader Takeover, Hazards & Easter Egg)           */}
      {/* ========================================================================= */}
      {/* GOLDEN TICKET 25 ANS GT LOGISTICS EVENT BANNER */}
      {goldenTicketEvent && (
        <div className="z-30 my-3 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black border-4 border-[#8d6210] shadow-[0_0_60px_rgba(245,158,11,0.6)] animate-pulse flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-600/30 border-2 border-amber-700/60 flex items-center justify-center text-2xl shadow-inner animate-bounce">
              🎟️
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] sm:text-xs font-serif font-black tracking-[0.25em] uppercase text-amber-950 bg-white/80 px-2.5 py-0.5 rounded-full border border-amber-600/40">
                  ★ ARCHIVE COMMÉMORATIVE • GROUPE GT (25 ANS) & CEA (10 ANS) ★
                </span>
                <span className="text-xs font-mono font-black text-emerald-900 bg-emerald-200/90 border border-emerald-500/50 px-2.5 py-0.5 rounded-full">
                  +{goldenTicketEvent.points.toLocaleString()} PTS JUBILÉ D'OR
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-serif font-black uppercase text-[#3a2603] tracking-tight mt-1">
                LE TICKET D'OR DU JUBILÉ A ÉTÉ DÉCOUVERT PAR : {goldenTicketEvent.teamName.toUpperCase()} !
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setGoldenTicketEvent(null)}
              className="px-4 py-2 rounded-xl bg-slate-950 text-amber-300 hover:text-white font-mono text-xs font-bold border border-amber-500 cursor-pointer shadow-md transition-colors"
            >
              Fermer (ou auto 12s)
            </button>
          </div>
        </div>
      )}

      {takeoverBanner && (
        <div className="z-20 my-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-3 shadow-2xl shadow-amber-500/30 animate-bounce">
          <Flame className="w-5 h-5 fill-current" />
          <span className="tracking-wide uppercase">{takeoverBanner.text}</span>
          <Flame className="w-5 h-5 fill-current" />
        </div>
      )}

      {hazardAlert && (
        <div className="z-20 my-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-rose-950/90 via-red-950 to-slate-900 border border-rose-500/60 text-rose-200 font-mono font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xl animate-pulse">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{hazardAlert}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. THE GRAND SPLIT DUEL ARENA                                             */}
      {/* ========================================================================= */}
      <div className="z-10 my-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch flex-1">

        {/* DUO 1 • POSTE BLEU (Lg: 5 Cols) */}
        <div className={`lg:col-span-5 rounded-3xl p-5 sm:p-7 border-2 transition-all duration-500 relative overflow-hidden flex flex-col justify-between ${
          station1?.status === 'completed'
            ? 'bg-gradient-to-b from-emerald-950/60 via-[#0a1f3d] to-[#071324] border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.3)]'
            : 'bg-gradient-to-b from-[#0c234b]/90 via-[#0a1a36] to-[#071224] border-sky-400/60 shadow-[0_0_50px_rgba(14,165,233,0.2)]'
        }`}>
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-sky-500/20">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-400 animate-ping"></span>
                <span className="font-display font-black text-sm sm:text-base text-sky-400 tracking-wider uppercase">
                  POSTE 1 • DUO BLEU
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-sky-300 bg-sky-950 px-2.5 py-0.5 rounded-full border border-sky-800/60">
                ÉTAGÈRE 1 • QUAI A
              </span>
            </div>

            {/* Duo Name Hero Display */}
            <div className="my-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block">
                BINÔME EN COURSE :
              </span>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-wide mt-0.5 truncate">
                {station1?.team_name || 'Duo Bleu'}
              </h2>
              <div className="mt-1.5 flex flex-wrap gap-2 text-xs font-mono">
                <span className="bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-sky-300 font-semibold">
                  GT : <strong>{station1?.operator_cea || 'Jeremy'}</strong>
                </span>
                <span className="bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-amber-300 font-semibold">
                  Invité : <strong>{station1?.client_guest || 'Thomas'}</strong>
                </span>
              </div>
            </div>

            {/* Multi-Mission Shift Roadmap (Axe 2: Visualisation du Tour Complet) */}
            <div className="my-2 bg-slate-950/90 rounded-2xl p-2.5 border border-sky-500/30">
              <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                <span className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-sky-400">
                  <Package className="w-3.5 h-3.5" />
                  <span>Feuille de Route du Shift</span>
                </span>
                <span className="bg-sky-950 px-2 py-0.5 rounded-full text-sky-300 font-bold border border-sky-800/60">
                  {completedCount1} / {missionsPool.length} Commandes
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 font-mono text-[9px]">
                {station1Missions.slice(0, 3).map((m, mIdx) => {
                  const isPast = mIdx < activeIdx1;
                  const isCurrent = mIdx === activeIdx1;
                  const isDone = isPast || (isCurrent && isStation1Finished);

                  return (
                    <div
                      key={m.id || mIdx}
                      className={`p-2 rounded-xl border transition-all flex flex-col justify-between ${
                        isDone
                          ? 'bg-emerald-950/70 border-emerald-500/70 text-emerald-300 shadow-sm'
                          : isCurrent
                          ? 'bg-sky-950/90 border-sky-400 text-sky-100 shadow-lg shadow-sky-500/30 ring-1 ring-sky-400/50 animate-pulse'
                          : 'bg-[#09172e]/80 border-slate-700/70 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 font-bold">
                        <span className="truncate">{getMissionShortTitle(m, mIdx)}</span>
                        {isDone ? (
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : isCurrent ? (
                          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping shrink-0" />
                        ) : (
                          <Clock className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                        )}
                      </div>
                      <div className="text-[8px] mt-1 flex justify-between items-center opacity-85">
                        <span className="font-semibold">
                          {isDone ? 'Validée (100%)' : isCurrent ? `${station1?.progress_percent || 0}%` : 'À venir'}
                        </span>
                        <span className="font-bold text-sky-300">+{m.basePoints} pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Action Tracker (What the player is doing right now) */}
            <div className="my-3 bg-slate-950/90 rounded-2xl p-3 border border-sky-500/30 flex items-center justify-between gap-2">
              <div className="truncate">
                <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block">
                  ACTION EN DIRECT SUR SCANNETTE :
                </span>
                <div className="text-xs sm:text-sm font-black text-white truncate flex items-center gap-1.5 mt-0.5">
                  <Activity className="w-3.5 h-3.5 text-sky-400 animate-pulse shrink-0" />
                  <span className="truncate">{station1?.current_mission_title || 'En cours de scan...'}</span>
                </div>
              </div>
              {station1?.last_scan_code && (
                <div className="shrink-0 text-right">
                  <span className="text-[9px] font-mono text-slate-400 block">Dernier scan</span>
                  <span className={`text-[11px] font-mono font-black px-2 py-0.5 rounded-lg border ${
                    station1.last_scan_status === 'invalid'
                      ? 'bg-rose-950 text-rose-300 border-rose-500/40'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {station1.last_scan_code}
                  </span>
                </div>
              )}
            </div>

            {/* Score & Combo */}
            <div className="my-3 bg-slate-950/90 rounded-2xl p-4 border border-sky-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold block">
                  SCORE DUEL
                </span>
                <div className="font-display font-black text-4xl sm:text-5xl text-white tracking-tight">
                  {station1?.score || 0}
                  <span className="text-base font-sans text-sky-400 ml-2 font-bold">PTS</span>
                </div>
              </div>

              {station1?.combo && station1.combo > 1 ? (
                <div className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-display font-black text-xs sm:text-sm tracking-wider shadow-lg shadow-orange-500/30 animate-pulse flex items-center gap-1.5">
                  <Flame className="w-4 h-4 fill-current" />
                  <span>x{station1.combo}</span>
                </div>
              ) : (
                <span className="text-xs font-mono text-slate-600">x1</span>
              )}
            </div>
          </div>

          {/* Dynamic Logistics Race Track */}
          <div className="space-y-2 pt-3 border-t border-slate-800/80">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-400 font-bold uppercase flex items-center gap-1.5">
                {isStation1Finished ? (
                  <span className="text-emerald-400 font-black flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Commande Validée (100%) !
                  </span>
                ) : (
                  'Flux Commande :'
                )}
              </span>
              <span className="font-display font-black text-sm text-sky-400">
                {station1?.progress_percent || 0}%
              </span>
            </div>

            <div className="relative w-full h-8 bg-slate-950 rounded-2xl border border-slate-800 p-1 flex items-center overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-600 via-cyan-500 to-sky-400 rounded-xl transition-all duration-500 shadow-[0_0_20px_rgba(14,165,233,0.5)] flex items-center justify-end pr-2"
                style={{ width: `${Math.max(6, Math.min(100, station1?.progress_percent || 0))}%` }}
              >
                <Truck className="w-4 h-4 text-slate-950 animate-pulse" />
              </div>
            </div>

            <div 
              className="grid gap-1.5 text-center text-[10px] font-mono"
              style={{ gridTemplateColumns: `repeat(${steps1.length}, minmax(0, 1fr))` }}
            >
              {steps1.map((step, idx) => {
                const currentIdx = station1?.current_step_index ?? 0;
                const isPassed = isStation1Finished || idx < currentIdx;
                const isCurrent = !isStation1Finished && idx === currentIdx;

                return (
                  <div
                    key={idx}
                    className={`py-1.5 px-1.5 rounded-xl border transition-all truncate flex items-center justify-center gap-1 ${
                      isStation1Finished
                        ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300 font-bold'
                        : isPassed
                        ? 'bg-sky-950/90 border-sky-500/60 text-sky-200 font-bold'
                        : isCurrent
                        ? 'bg-gradient-to-r from-sky-500 to-cyan-400 text-slate-950 font-black shadow-lg shadow-sky-500/40 ring-2 ring-sky-300 animate-pulse'
                        : 'bg-[#0a1830] border-slate-700/80 text-slate-200 font-semibold shadow-inner'
                    }`}
                  >
                    {(isStation1Finished || isPassed) && <Check className="w-3 h-3 shrink-0 text-emerald-400" />}
                    {isCurrent && <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping shrink-0" />}
                    <span className="truncate">{step}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CENTER TOWER • VS & QUICK SCANNER */}
        <div className="lg:col-span-2 flex flex-col items-center justify-between gap-3 py-1">
          {/* Top VS Badge */}
          <div className="my-auto text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 border-2 border-indigo-500/40 flex items-center justify-center shadow-2xl relative group">
              <div className="absolute inset-0 bg-indigo-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all"></div>
              <span className="font-display font-black text-2xl sm:text-3xl text-amber-400 tracking-wider">
                VS
              </span>
            </div>
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 mt-1.5 block font-bold">
              DUEL STAND
            </span>
          </div>

          {/* Quick QR Appairage Widget */}
          <div className="w-full bg-slate-900/90 rounded-2xl p-3 border border-slate-800 text-center shadow-xl">
            <div className="flex items-center justify-center gap-1 mb-1.5 text-xs font-mono font-bold text-slate-300">
              <QrCode className="w-3.5 h-3.5 text-sky-400" />
              <span>QR SCANNETTES</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-slate-950 p-1.5 rounded-xl border border-sky-500/30 text-center">
                <span className="text-[8px] font-mono font-bold text-sky-400 block mb-0.5">Zebra 1</span>
                <div className="bg-white p-1 rounded-lg inline-block">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(qrZebra1)}`}
                    alt="QR 1"
                    className="w-14 h-14 object-contain"
                  />
                </div>
              </div>

              <div className="bg-slate-950 p-1.5 rounded-xl border border-amber-500/30 text-center">
                <span className="text-[8px] font-mono font-bold text-amber-400 block mb-0.5">Zebra 2</span>
                <div className="bg-white p-1 rounded-lg inline-block">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(qrZebra2)}`}
                    alt="QR 2"
                    className="w-14 h-14 object-contain"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSetupModalOpen(true)}
              className="w-full mt-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 text-[10px] font-mono font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer"
            >
              Équipes & QR Agrandis
            </button>
          </div>
        </div>

        {/* DUO 2 • POSTE ORANGE (Lg: 5 Cols) */}
        <div className={`lg:col-span-5 rounded-3xl p-5 sm:p-7 border-2 transition-all duration-500 relative overflow-hidden flex flex-col justify-between ${
          station2?.status === 'completed'
            ? 'bg-gradient-to-b from-emerald-950/60 via-[#1f170b] to-[#071324] border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.3)]'
            : 'bg-gradient-to-b from-[#2a1708]/90 via-[#1a1209] to-[#071224] border-amber-500/60 shadow-[0_0_50px_rgba(245,158,11,0.2)]'
        }`}>
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-amber-500/20">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping"></span>
                <span className="font-display font-black text-sm sm:text-base text-amber-400 tracking-wider uppercase">
                  POSTE 2 • DUO ORANGE
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-800/60">
                ÉTAGÈRE 2 • QUAI B
              </span>
            </div>

            {/* Duo Name Hero Display */}
            <div className="my-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block">
                BINÔME EN COURSE :
              </span>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-wide mt-0.5 truncate">
                {station2?.team_name || 'Duo Orange'}
              </h2>
              <div className="mt-1.5 flex flex-wrap gap-2 text-xs font-mono">
                <span className="bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-sky-300 font-semibold">
                  GT : <strong>{station2?.operator_cea || 'Sarah'}</strong>
                </span>
                <span className="bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-amber-300 font-semibold">
                  Invité : <strong>{station2?.client_guest || 'Alexandre'}</strong>
                </span>
              </div>
            </div>

            {/* Multi-Mission Shift Roadmap (Axe 2: Visualisation du Tour Complet) */}
            <div className="my-2 bg-slate-950/90 rounded-2xl p-2.5 border border-amber-500/30">
              <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                <span className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-amber-400">
                  <Package className="w-3.5 h-3.5" />
                  <span>Feuille de Route du Shift</span>
                </span>
                <span className="bg-amber-950 px-2 py-0.5 rounded-full text-amber-300 font-bold border border-amber-800/60">
                  {completedCount2} / {missionsPool.length} Commandes
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 font-mono text-[9px]">
                {station2Missions.slice(0, 3).map((m, mIdx) => {
                  const isPast = mIdx < activeIdx2;
                  const isCurrent = mIdx === activeIdx2;
                  const isDone = isPast || (isCurrent && isStation2Finished);

                  return (
                    <div
                      key={m.id || mIdx}
                      className={`p-2 rounded-xl border transition-all flex flex-col justify-between ${
                        isDone
                          ? 'bg-emerald-950/70 border-emerald-500/70 text-emerald-300 shadow-sm'
                          : isCurrent
                          ? 'bg-amber-950/90 border-amber-400 text-amber-100 shadow-lg shadow-amber-500/30 ring-1 ring-amber-400/50 animate-pulse'
                          : 'bg-[#1a1208]/80 border-slate-700/70 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 font-bold">
                        <span className="truncate">{getMissionShortTitle(m, mIdx)}</span>
                        {isDone ? (
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : isCurrent ? (
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                        ) : (
                          <Clock className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                        )}
                      </div>
                      <div className="text-[8px] mt-1 flex justify-between items-center opacity-85">
                        <span className="font-semibold">
                          {isDone ? 'Validée (100%)' : isCurrent ? `${station2?.progress_percent || 0}%` : 'À venir'}
                        </span>
                        <span className="font-bold text-amber-300">+{m.basePoints} pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Action Tracker (What the player is doing right now) */}
            <div className="my-3 bg-slate-950/90 rounded-2xl p-3 border border-amber-500/30 flex items-center justify-between gap-2">
              <div className="truncate">
                <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block">
                  ACTION EN DIRECT SUR SCANNETTE :
                </span>
                <div className="text-xs sm:text-sm font-black text-white truncate flex items-center gap-1.5 mt-0.5">
                  <Activity className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
                  <span className="truncate">{station2?.current_mission_title || 'En cours de scan...'}</span>
                </div>
              </div>
              {station2?.last_scan_code && (
                <div className="shrink-0 text-right">
                  <span className="text-[9px] font-mono text-slate-400 block">Dernier scan</span>
                  <span className={`text-[11px] font-mono font-black px-2 py-0.5 rounded-lg border ${
                    station2.last_scan_status === 'invalid'
                      ? 'bg-rose-950 text-rose-300 border-rose-500/40'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {station2.last_scan_code}
                  </span>
                </div>
              )}
            </div>

            {/* Score & Combo */}
            <div className="my-3 bg-slate-950/90 rounded-2xl p-4 border border-amber-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold block">
                  SCORE DUEL
                </span>
                <div className="font-display font-black text-4xl sm:text-5xl text-white tracking-tight">
                  {station2?.score || 0}
                  <span className="text-base font-sans text-amber-400 ml-2 font-bold">PTS</span>
                </div>
              </div>

              {station2?.combo && station2.combo > 1 ? (
                <div className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-display font-black text-xs sm:text-sm tracking-wider shadow-lg shadow-orange-500/30 animate-pulse flex items-center gap-1.5">
                  <Flame className="w-4 h-4 fill-current" />
                  <span>x{station2.combo}</span>
                </div>
              ) : (
                <span className="text-xs font-mono text-slate-600">x1</span>
              )}
            </div>
          </div>

          {/* Dynamic Logistics Race Track */}
          <div className="space-y-2 pt-3 border-t border-slate-800/80">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-400 font-bold uppercase flex items-center gap-1.5">
                {isStation2Finished ? (
                  <span className="text-emerald-400 font-black flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Commande Validée (100%) !
                  </span>
                ) : (
                  'Flux Commande :'
                )}
              </span>
              <span className="font-display font-black text-sm text-amber-400">
                {station2?.progress_percent || 0}%
              </span>
            </div>

            <div className="relative w-full h-8 bg-slate-950 rounded-2xl border border-slate-800 p-1 flex items-center overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-600 via-orange-500 to-amber-400 rounded-xl transition-all duration-500 shadow-[0_0_20px_rgba(245,158,11,0.5)] flex items-center justify-end pr-2"
                style={{ width: `${Math.max(6, Math.min(100, station2?.progress_percent || 0))}%` }}
              >
                <Truck className="w-4 h-4 text-slate-950 animate-pulse" />
              </div>
            </div>

            <div 
              className="grid gap-1.5 text-center text-[10px] font-mono"
              style={{ gridTemplateColumns: `repeat(${steps2.length}, minmax(0, 1fr))` }}
            >
              {steps2.map((step, idx) => {
                const currentIdx = station2?.current_step_index ?? 0;
                const isPassed = isStation2Finished || idx < currentIdx;
                const isCurrent = !isStation2Finished && idx === currentIdx;

                return (
                  <div
                    key={idx}
                    className={`py-1.5 px-1.5 rounded-xl border transition-all truncate flex items-center justify-center gap-1 ${
                      isStation2Finished
                        ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300 font-bold'
                        : isPassed
                        ? 'bg-amber-950/90 border-amber-500/60 text-amber-200 font-bold'
                        : isCurrent
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black shadow-lg shadow-amber-400/40 ring-2 ring-amber-300 animate-pulse'
                        : 'bg-[#18130a] border-slate-700/80 text-slate-200 font-semibold shadow-inner'
                    }`}
                  >
                    {(isStation2Finished || isPassed) && <Check className="w-3 h-3 shrink-0 text-emerald-400" />}
                    {isCurrent && <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping shrink-0" />}
                    <span className="truncate">{step}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2.5 LIVE SPEAKER / GALA COMMENTARY TICKER (Axe 3: Régie Micro Animateur)  */}
      {/* ========================================================================= */}
      <div className="z-10 my-1 bg-[#0c1e3a]/90 border border-slate-700/80 rounded-2xl px-4 py-2.5 shadow-lg flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-3 py-1 bg-red-600/20 text-red-300 rounded-xl border border-red-500/30 font-mono text-xs font-bold shrink-0">
          <Mic className="w-4 h-4 text-red-400 animate-pulse" />
          <span>SUGGESTION MICRO :</span>
        </div>
        <p className="font-sans text-xs sm:text-sm font-semibold text-slate-200 tracking-wide truncate">
          {getSpeakerCommentary()}
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 3. LIVE SCANS MONITOR TICKER (Ce que les joueurs font en temps réel)       */}
      {/* ========================================================================= */}
      <div className="z-10 my-2 bg-[#08152c]/95 border border-slate-700/70 rounded-2xl p-2.5 shadow-xl flex items-center gap-3 overflow-hidden">
        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#061022] rounded-xl border border-slate-700 font-mono text-xs font-bold text-amber-300 shrink-0">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>LIVE SCAN FEED :</span>
        </div>

        <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar font-mono text-xs">
          {liveActivities.length === 0 ? (
            <span className="text-slate-400 text-xs italic">
              En attente des premiers scans laser des binômes sur leurs scannettes...
            </span>
          ) : (
            liveActivities.map((act, i) => (
              <div
                key={act.id || i}
                className={`px-3 py-1 rounded-xl border shrink-0 flex items-center gap-2 ${
                  act.status === 'valid'
                    ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 shadow-sm'
                    : act.status === 'invalid'
                    ? 'bg-red-950/70 border-red-500/60 text-red-300'
                    : 'bg-amber-950/70 border-amber-500/60 text-amber-300'
                }`}
              >
                <span className="font-bold text-white">{act.station_name.split(' ')[0]} :</span>
                <span>{act.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. BOTTOM HALL OF FAME • TOP DUOS PODIUM (GT Logistics 25 Ans)             */}
      {/* ========================================================================= */}
      <footer className="z-10 bg-[#0c1e3a]/95 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-4 sm:p-5 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-700/70">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            <h3 className="font-sans font-black text-xs sm:text-base text-white uppercase tracking-wider flex items-center gap-2">
              <span>TABLEAU D'HONNEUR</span>
              <span className="text-red-500">•</span>
              <span>TOP 5 DES DUOS 25 ANS</span>
            </h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
            Synchronisation Cloud Temps Réel
          </span>
        </div>

        {topScores.length === 0 ? (
          <div className="py-2.5 text-center text-xs font-mono text-slate-400 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Le podium est vierge. Le premier binôme à franchir les 3 minutes inscrira le record !</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {topScores.map((sc, idx) => (
              <div
                key={sc.id || idx}
                className={`p-2.5 rounded-2xl border flex items-center justify-between transition-all ${
                  idx === 0
                    ? 'bg-gradient-to-r from-amber-950/50 via-[#142646] to-[#0c1e3a] border-amber-400/80 shadow-lg shadow-amber-500/20'
                    : idx === 1
                    ? 'bg-[#0f2444] border-slate-400/60 text-slate-100 shadow-sm'
                    : idx === 2
                    ? 'bg-[#0e213d] border-amber-700/60 text-amber-100'
                    : 'bg-[#091830] border-slate-700/70 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-6 h-6 rounded-lg font-sans font-black text-[11px] flex items-center justify-center shrink-0 shadow-sm ${
                    idx === 0
                      ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950'
                      : idx === 1
                      ? 'bg-slate-300 text-slate-950 font-bold'
                      : idx === 2
                      ? 'bg-amber-700 text-white font-bold'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    #{idx + 1}
                  </span>
                  <div className="truncate">
                    <span className="text-xs font-bold text-white block truncate">{sc.name}</span>
                    <span className="text-[9px] text-slate-400 font-mono block truncate">{sc.company}</span>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-1.5">
                  <span className="font-display font-black text-xs sm:text-sm text-emerald-400 font-mono block">
                    {sc.score} pts
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {sc.time_spent || '02:00'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </footer>

      {/* ========================================================================= */}
      {/* 5. MODALE PRINCIPALE DE CONSTITUTION DUEL & APPAIRAGE QR CODES            */}
      {/* ========================================================================= */}
      {isSetupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn select-none">
          <div className="relative bg-slate-900 border-2 border-indigo-500/70 rounded-3xl p-5 sm:p-8 max-w-4xl w-full shadow-2xl text-slate-100 max-h-[95vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setIsSetupModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Swords className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-sky-400 block">
                  CONFIGURATION DUEL EN DIRECT
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Constituer les Équipes & Flasher les Scannettes Zebra
                </h2>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 mb-6">
              Inscrivez les binômes ci-dessous. Les joueurs peuvent flasher directement ces QR codes avec leur scannette Zebra ou leur smartphone pour ouvrir leur session synchronisée !
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  Rotation Duos : <span className="text-amber-400">Manche #{duoRoundNumber}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">• 20 Pièces Wafers & Détachées</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRandomizeMissions}
                  className="px-3 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Tirer 2 commandes différentes au sort"
                >
                  <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
                  <span>🎲 Missions Aléatoires</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextDuo}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Préparer le passage au duo suivant"
                >
                  <span>⏩ Duo Suivant (+1)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-2">
              {/* DUO 1 FORM & QR */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border-2 border-sky-500/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-sky-400 animate-ping" />
                    <span className="text-xs font-black font-mono text-sky-400 uppercase">
                      DUO 1 • POSTE BLEU
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Scannette A</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1 font-bold">
                      Collaborateur GT :
                    </label>
                    <input
                      type="text"
                      value={d1Cea}
                      onChange={(e) => setD1Cea(e.target.value)}
                      placeholder="Ex: Jeremy (GT)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-bold focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1 font-bold">
                      Invité :
                    </label>
                    <input
                      type="text"
                      value={d1Guest}
                      onChange={(e) => setD1Guest(e.target.value)}
                      placeholder="Ex: Thomas (Invité)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <label className="block text-xs font-bold text-sky-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-sky-400" />
                        Demande / Mission Poste 1 :
                      </span>
                      <span className="text-[10px] font-mono text-sky-400 font-bold">
                        {missionsPool[selectedM1Idx]?.steps?.length || 7} lignes
                      </span>
                    </label>
                    <select
                      value={selectedM1Idx}
                      onChange={(e) => setSelectedM1Idx(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-sky-500/50 focus:border-sky-400 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none transition-colors"
                    >
                      {missionsPool.map((m, idx) => (
                        <option key={m.id} value={idx}>
                          #{idx + 1} • {m.title}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1 truncate">
                      {missionsPool[selectedM1Idx]?.client}
                    </p>
                  </div>
                </div>

                <div className="pt-2 text-center border-t border-slate-800/80 flex flex-col items-center">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase mb-2">
                    Flasher sur la scannette Zebra 1
                  </span>
                  <div className="bg-white p-2.5 rounded-xl shadow-lg mb-2">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrZebra1)}`}
                      alt="QR Zebra 1"
                      className="w-32 h-32 object-contain"
                    />
                  </div>
                  <a
                    href={qrZebra1}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-sky-400 hover:underline flex items-center gap-1 font-mono font-bold"
                  >
                    <span>Ouvrir l'onglet Duo 1</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* DUO 2 FORM & QR */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border-2 border-amber-500/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-xs font-black font-mono text-amber-400 uppercase">
                      DUO 2 • POSTE ORANGE
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Scannette B</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1 font-bold">
                      Collaborateur GT :
                    </label>
                    <input
                      type="text"
                      value={d2Cea}
                      onChange={(e) => setD2Cea(e.target.value)}
                      placeholder="Ex: Sarah (GT)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1 font-bold">
                      Invité :
                    </label>
                    <input
                      type="text"
                      value={d2Guest}
                      onChange={(e) => setD2Guest(e.target.value)}
                      placeholder="Ex: Alexandre (Invité)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <label className="block text-xs font-bold text-amber-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        Demande / Mission Poste 2 :
                      </span>
                      <span className="text-[10px] font-mono text-amber-400 font-bold">
                        {missionsPool[selectedM2Idx]?.steps?.length || 7} lignes
                      </span>
                    </label>
                    <select
                      value={selectedM2Idx}
                      onChange={(e) => setSelectedM2Idx(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-amber-500/50 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none transition-colors"
                    >
                      {missionsPool.map((m, idx) => (
                        <option key={m.id} value={idx}>
                          #{idx + 1} • {m.title}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1 truncate">
                      {missionsPool[selectedM2Idx]?.client}
                    </p>
                  </div>
                </div>

                <div className="pt-2 text-center border-t border-slate-800/80 flex flex-col items-center">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase mb-2">
                    Flasher sur la scannette Zebra 2
                  </span>
                  <div className="bg-white p-2.5 rounded-xl shadow-lg mb-2">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrZebra2)}`}
                      alt="QR Zebra 2"
                      className="w-32 h-32 object-contain"
                    />
                  </div>
                  <a
                    href={qrZebra2}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-mono font-bold"
                  >
                    <span>Ouvrir l'onglet Duo 2</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Big Launch Button */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
              <div className="text-xs text-slate-400 font-mono">
                ⚡ Le clic démarrera le chrono 3:00 et activera les missions sur les 2 scannettes.
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsSetupModalOpen(false)}
                  className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={() => handleLaunchDuelFromTv()}
                  className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all hover:scale-105 cursor-pointer w-full sm:w-auto"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>DÉMARRER LE DUEL EN DIRECT !</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="Réinitialiser l'Arène TV 55'' ?"
        message="Voulez-vous remettre l'arène en direct à zéro (vider les 2 stations et remettre le chronomètre à 03:00 pour le prochain duel) ?"
        confirmLabel="Oui, réinitialiser l'arène"
        variant="warning"
        onCancel={() => setIsResetConfirmOpen(false)}
        onConfirm={executeResetArena}
      />

      {/* ========================================================================= */}
      {/* 6. SYNCHRONIZED 3-2-1 DEPARTURE OVERLAY                                   */}
      {/* ========================================================================= */}
      {syncCountdown !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center animate-fadeIn select-none">
          <div className="relative flex flex-col items-center text-center">
            {syncCountdown > 0 ? (
              <div className="flex flex-col items-center">
                <div className="w-48 h-48 rounded-full border-4 border-amber-400 bg-amber-500/10 flex items-center justify-center shadow-[0_0_80px_rgba(251,191,36,0.6)] animate-pulse">
                  <span className="font-display font-black text-8xl text-amber-300">
                    {syncCountdown}
                  </span>
                </div>
                <span className="mt-8 font-mono text-2xl uppercase tracking-widest text-slate-200 font-bold">
                  DÉPART IMMINENT...
                </span>
                <span className="mt-2 text-sm text-slate-400 font-mono">
                  Préparez vos scannettes Zebra !
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center scale-110 transition-transform duration-300">
                <div className="px-12 py-6 rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-slate-950 shadow-[0_0_100px_rgba(16,185,129,0.8)]">
                  <span className="font-display font-black text-6xl sm:text-7xl uppercase tracking-wider">
                    TOP DÉPART !
                  </span>
                </div>
                <span className="mt-8 font-mono text-2xl uppercase tracking-widest text-emerald-300 font-bold animate-pulse">
                  QUE LES MEILLEURS LOGISTICIENS GAGNENT !
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. OFFICIAL END-OF-SHIFT PROCLAMATION MODAL (Axe 1 & 5)                   */}
      {/* ========================================================================= */}
      {isEndMatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn select-none">
          <div className="relative bg-slate-900 border-2 border-amber-500/70 rounded-3xl p-6 sm:p-8 max-w-4xl w-full shadow-2xl text-slate-100 max-h-[95vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setIsEndMatchModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center pb-4 mb-6 border-b border-slate-800">
              <span className="text-xs font-mono font-bold tracking-widest uppercase text-amber-400 block mb-1">
                CHALLENGE LOGISTIQUE 25 ANS • CEA GRENOBLE
              </span>
              <h2 className="text-3xl sm:text-4xl font-display font-black text-white tracking-wide">
                FIN DE POSTE • PROCLAMATION DU DUEL
              </h2>
            </div>

            {/* Winner Announcement Banner */}
            {(() => {
              const s1Score = station1?.score || 0;
              const s2Score = station2?.score || 0;
              const isS1Winner = s1Score > s2Score;
              const isS2Winner = s2Score > s1Score;
              const isTie = s1Score === s2Score;

              return (
                <div className={`p-4 rounded-2xl mb-6 text-center border shadow-xl ${
                  isTie
                    ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-200'
                    : isS1Winner
                    ? 'bg-gradient-to-r from-sky-950/80 via-indigo-950/80 to-sky-950/80 border-sky-400/60 text-sky-200'
                    : 'bg-gradient-to-r from-amber-950/80 via-orange-950/80 to-amber-950/80 border-amber-400/60 text-amber-200'
                }`}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Trophy className="w-6 h-6 text-amber-400 animate-bounce" />
                    <span className="font-display font-black text-xl sm:text-2xl uppercase tracking-wider text-white">
                      {isTie
                        ? '🤝 MATCH NUL HISTORIQUE !'
                        : isS1Winner
                        ? `🏆 VICTOIRE : ${station1?.team_name || 'DUO BLEU'} !`
                        : `🏆 VICTOIRE : ${station2?.team_name || 'DUO ORANGE'} !`}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-mono text-slate-300">
                    {isTie
                      ? `Une synchronisation parfaite avec ${s1Score} points chacun !`
                      : isS1Winner
                      ? `${station1?.team_name} remporte le duel avec ${s1Score} pts (écart de ${s1Score - s2Score} pts) !`
                      : `${station2?.team_name} remporte le duel avec ${s2Score} pts (écart de ${s2Score - s1Score} pts) !`}
                  </p>
                </div>
              );
            })()}

            {/* Side-by-Side Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              {/* Station 1 Card */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-sky-500/40 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                    <span className="text-xs font-mono font-bold text-sky-400 uppercase">
                      POSTE 1 • {station1?.team_name || 'Duo Bleu'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Quai A</span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-900">
                    <span className="text-slate-400">Score Final :</span>
                    <span className="font-display font-black text-lg text-white">
                      {station1?.score || 0} PTS
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-900">
                    <span className="text-slate-400">Flux Commande :</span>
                    <span className={`font-bold ${isStation1Finished ? 'text-emerald-400' : 'text-sky-300'}`}>
                      {station1?.progress_percent || 0}% {isStation1Finished && '(Complétée)'}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-900">
                    <span className="text-slate-400">Multiplicateur Max :</span>
                    <span className="font-bold text-amber-300">
                      x{station1?.combo && station1.combo > 1 ? station1.combo : 1}
                    </span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Binôme :</span>
                    <span className="text-slate-200">
                      {station1?.operator_cea} & {station1?.client_guest}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDiplomeStation(station1)}
                  className="w-full mt-3 py-2.5 bg-sky-950/80 hover:bg-sky-900 text-sky-300 hover:text-white border border-sky-500/50 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Voir Diplôme Duo Bleu</span>
                </button>
              </div>

              {/* Station 2 Card */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-amber-500/40 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="text-xs font-mono font-bold text-amber-400 uppercase">
                      POSTE 2 • {station2?.team_name || 'Duo Orange'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Quai B</span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-900">
                    <span className="text-slate-400">Score Final :</span>
                    <span className="font-display font-black text-lg text-white">
                      {station2?.score || 0} PTS
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-900">
                    <span className="text-slate-400">Flux Commande :</span>
                    <span className={`font-bold ${isStation2Finished ? 'text-emerald-400' : 'text-amber-300'}`}>
                      {station2?.progress_percent || 0}% {isStation2Finished && '(Complétée)'}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-900">
                    <span className="text-slate-400">Multiplicateur Max :</span>
                    <span className="font-bold text-amber-300">
                      x{station2?.combo && station2.combo > 1 ? station2.combo : 1}
                    </span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Binôme :</span>
                    <span className="text-slate-200">
                      {station2?.operator_cea} & {station2?.client_guest}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDiplomeStation(station2)}
                  className="w-full mt-3 py-2.5 bg-amber-950/80 hover:bg-amber-900 text-amber-300 hover:text-white border border-amber-500/50 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Voir Diplôme Duo Orange</span>
                </button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEndMatchModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Fermer
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsEndMatchModalOpen(false);
                    setIsSetupModalOpen(true);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 via-indigo-600 to-amber-500 hover:from-sky-500 hover:to-amber-400 text-white font-black text-xs transition-all shadow-lg cursor-pointer flex items-center gap-1.5"
                >
                  <Users className="w-4 h-4" />
                  <span>Nouveau Duel & Binômes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. OFFICIAL DIPLOMA MODAL (Axe 5)                                         */}
      {/* ========================================================================= */}
      {selectedDiplomeStation && (
        <DiplomeModal
          isOpen={!!selectedDiplomeStation}
          onClose={() => setSelectedDiplomeStation(null)}
          operator={{
            name: selectedDiplomeStation.team_name || selectedDiplomeStation.station_name,
            companyOrRole: `GT: ${selectedDiplomeStation.operator_cea} | Invité: ${selectedDiplomeStation.client_guest}`,
            score: selectedDiplomeStation.score || 0,
            completedMissions: (selectedDiplomeStation.progress_percent || 0) >= 100 ? 1 : 0,
            accuracy: 100,
            shiftDurationSeconds: appConfig.shiftDurationSeconds || 180
          }}
          collaboratorName={selectedDiplomeStation.operator_cea}
          guestName={selectedDiplomeStation.client_guest}
          stationName={selectedDiplomeStation.station_name}
          appConfig={appConfig}
        />
      )}
    </div>
  );
};
