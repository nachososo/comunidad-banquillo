import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { ArrowLeft, Lock, Save, Undo2, X } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext.jsx';
import { femalePlayers, matches, menRoster } from '@/data/data.js';
import {
  DEFAULT_STATS_SEASON,
  hasStatsCaptureAccess,
  loadStatsCaptureSettings,
  publishOfficialStatsSession,
  saveStatsSession,
} from '@/lib/statsCaptureRepository.js';

const APP_LOGO = '/img/stats-app/adn-banquiller-stats-transparent.png';
const TEAM_LOGO = '/img/stats-app/team-logo.png';
const WORDMARK = '/img/stats-app/comunidad-del-banquillo-wordmark.png';
const COURT = '/img/stats-app/court-cdb.png';

const periods = ['1Q', '2Q', '3Q', '4Q'];

const actionButtons = [
  { action: 'pts2_made', label: '2PT anotado', short: 'T2', value: 2, stat: 'shot', shotType: 2, made: true },
  { action: 'pts2_missed', label: '2PT fallado', short: 'T2', value: 0, stat: 'shot', shotType: 2, made: false },
  { action: 'pts3_made', label: '3PT anotado', short: 'T3', value: 3, stat: 'shot', shotType: 3, made: true },
  { action: 'pts3_missed', label: '3PT fallado', short: 'T3', value: 0, stat: 'shot', shotType: 3, made: false },
  { action: 'ft_made', label: '1PT anotado', short: 'TL', value: 1, stat: 'shot', shotType: 1, made: true },
  { action: 'ft_missed', label: '1PT fallado', short: 'TL', value: 0, stat: 'shot', shotType: 1, made: false },
  { action: 'reb_off', label: 'REB ofensivo', short: 'RO', value: 0, stat: 'rebOff' },
  { action: 'reb_def', label: 'REB defensivo', short: 'RD', value: 0, stat: 'rebDef' },
  { action: 'foul_def', label: 'Falta defensa', short: 'FP', value: 0, stat: 'foulCommitted' },
  { action: 'foul_att', label: 'Falta ataque', short: 'FR', value: 0, stat: 'foulReceived' },
  { action: 'turnover', label: 'PER', short: 'PER', value: 0, stat: 'turnover' },
  { action: 'steal', label: 'ROB', short: 'ROB', value: 0, stat: 'steal' },
  { action: 'assist', label: 'AST', short: 'AST', value: 0, stat: 'assist' },
  { action: 'block', label: 'BLK', short: 'BLK', value: 0, stat: 'block' },
];

const emptyStats = (player) => ({
  player,
  pts: 0,
  tlMade: 0,
  tlAttempted: 0,
  t2Made: 0,
  t2Attempted: 0,
  t3Made: 0,
  t3Attempted: 0,
  rebOff: 0,
  rebDef: 0,
  turnover: 0,
  steal: 0,
  assist: 0,
  block: 0,
  foulCommitted: 0,
  foulReceived: 0,
});

const pct = (made, attempted) => (attempted ? `${Math.round((made / attempted) * 100)}%` : '0%');
const shotText = (made, attempted) => `${made}/${attempted} ${pct(made, attempted)}`;
const playerLabel = (player) => (player?.isOpponent ? player.name : `#${player?.number ?? '-'} ${player?.name ?? ''}`);

const getStatsForEvents = (players, rivalName, events) => {
  const rows = new Map();
  [...players, { id: 'rival-team', name: rivalName || 'Rival', number: '', isOpponent: true }].forEach((player) => {
    rows.set(String(player.id), emptyStats(player));
  });

  events.forEach((event) => {
    const row = rows.get(String(event.playerId));
    if (!row) return;
    row.pts += event.value || 0;
    if (event.stat === 'shot') {
      if (event.shotType === 1) {
        row.tlAttempted += 1;
        if (event.made) row.tlMade += 1;
      }
      if (event.shotType === 2) {
        row.t2Attempted += 1;
        if (event.made) row.t2Made += 1;
      }
      if (event.shotType === 3) {
        row.t3Attempted += 1;
        if (event.made) row.t3Made += 1;
      }
    }
    if (event.stat === 'rebOff') row.rebOff += 1;
    if (event.stat === 'rebDef') row.rebDef += 1;
    if (event.stat === 'turnover') row.turnover += 1;
    if (event.stat === 'steal') row.steal += 1;
    if (event.stat === 'assist') row.assist += 1;
    if (event.stat === 'block') row.block += 1;
    if (event.stat === 'foulCommitted') row.foulCommitted += 1;
    if (event.stat === 'foulReceived') row.foulReceived += 1;
  });

  return Array.from(rows.values()).map((row) => ({
    ...row,
    rebounds: row.rebOff + row.rebDef,
    val: row.pts + row.rebOff + row.rebDef + row.assist + row.steal + row.block + row.foulReceived - row.turnover - row.foulCommitted,
  }));
};

const getOrdinalPeriod = (periodIndex) => ['segundo', 'tercer', 'cuarto'][periodIndex] || 'siguiente';

const buildCreatedTeamPlayers = (teamId, roster) => roster.map((player) => ({
  slotId: `${teamId}-${player.id}`,
  linkedPlayerId: String(player.id),
  nickname: '',
}));

const AppShell = ({ children, showWebBack = true }) => (
  <div className="min-h-screen bg-[radial-gradient(circle_at_18%_12%,rgba(255,214,10,0.18),transparent_23rem),linear-gradient(145deg,#050505_0%,#111_44%,#171304_100%)] text-[#f7f3df]">
    <Helmet>
      <title>App de estadísticas - La Comunidad del Banquillo</title>
      <meta name="description" content="App de estadísticas de La Comunidad del Banquillo." />
    </Helmet>
    {showWebBack && (
      <a
        href="/"
        className="fixed right-4 top-4 z-50 rounded-full border border-[#ffd60a]/70 bg-black/80 px-4 py-2 text-xs font-black uppercase tracking-wide text-[#ffd60a] shadow-[0_10px_24px_rgba(0,0,0,0.35)] backdrop-blur transition hover:bg-[#ffd60a] hover:text-black"
      >
        Volver a la web
      </a>
    )}
    <div className="mx-auto min-h-screen w-full max-w-[1210px] pb-6">
      {children}
    </div>
  </div>
);

const StatsCapturePage = () => {
  const { loading, isAuthenticated, isAdmin, user } = useAuth();
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [canUseOfficialMatches, setCanUseOfficialMatches] = useState(false);
  const [activeSeason, setActiveSeason] = useState(DEFAULT_STATS_SEASON);
  const [view, setView] = useState('home');
  const [matchKind, setMatchKind] = useState(null);
  const [team, setTeam] = useState('masculine');
  const [rivalName, setRivalName] = useState('');
  const [venue, setVenue] = useState('Local');
  const [rivalPhoto, setRivalPhoto] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [rosterIds, setRosterIds] = useState([]);
  const [lineupIds, setLineupIds] = useState([]);
  const [onCourtIds, setOnCourtIds] = useState([]);
  const [periodIndex, setPeriodIndex] = useState(0);
  const [events, setEvents] = useState([]);
  const [pendingCourtPoint, setPendingCourtPoint] = useState(null);
  const [targetAction, setTargetAction] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [notice, setNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSessionId, setSavedSessionId] = useState(null);
  const [shotFilters, setShotFilters] = useState({ type: 'all', result: 'all', period: 'all' });
  const [createdTeam, setCreatedTeam] = useState('masculine');
  const [createdTeamPlayers, setCreatedTeamPlayers] = useState(() => ({
    masculine: buildCreatedTeamPlayers('masculine', menRoster),
    feminine: buildCreatedTeamPlayers('feminine', femalePlayers),
  }));

  const players = team === 'feminine' ? femalePlayers : menRoster;
  const activeRosterByTeam = createdTeam === 'feminine' ? femalePlayers : menRoster;
  const editableTeamPlayers = createdTeamPlayers[createdTeam] || [];
  const officialMatches = useMemo(
    () => matches
      .filter((match) => match.team === team && match.season === activeSeason)
      .sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`)),
    [activeSeason, team],
  );

  const officialRivals = useMemo(() => {
    const seen = new Map();
    officialMatches.forEach((match) => {
      if (!seen.has(match.rival)) seen.set(match.rival, match);
    });
    return Array.from(seen.values());
  }, [officialMatches]);

  const rosterPlayers = useMemo(
    () => players.filter((player) => rosterIds.includes(String(player.id))),
    [players, rosterIds],
  );

  const onCourtPlayers = useMemo(
    () => rosterPlayers.filter((player) => onCourtIds.includes(String(player.id))),
    [onCourtIds, rosterPlayers],
  );

  const statsRows = useMemo(() => getStatsForEvents(rosterPlayers, rivalName, events), [events, rivalName, rosterPlayers]);
  const mvpRow = useMemo(
    () => statsRows
      .filter((row) => !row.player.isOpponent)
      .sort((a, b) => b.val - a.val || b.pts - a.pts || b.rebounds - a.rebounds)[0],
    [statsRows],
  );

  const ownScore = events.filter((event) => event.teamSide === 'own').reduce((total, event) => total + (event.value || 0), 0);
  const rivalScore = events.filter((event) => event.teamSide === 'rival').reduce((total, event) => total + (event.value || 0), 0);

  const shots = events.filter((event) => event.stat === 'shot' && event.x !== null && event.x !== undefined && event.y !== null && event.y !== undefined);
  const filteredShots = shots.filter((shot) => {
    const typeOk = shotFilters.type === 'all' || Number(shotFilters.type) === shot.shotType;
    const resultOk = shotFilters.result === 'all' || (shotFilters.result === 'made' ? shot.made : !shot.made);
    const periodOk = shotFilters.period === 'all' || shot.period === shotFilters.period;
    return typeOk && resultOk && periodOk;
  });

  useEffect(() => {
    let mounted = true;
    loadStatsCaptureSettings().then((settings) => {
      if (mounted) setActiveSeason(settings.activeSeason);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      setCanUseOfficialMatches(false);
      setCheckingAccess(false);
      return;
    }

    let active = true;
    setCheckingAccess(true);
    hasStatsCaptureAccess(user, isAdmin).then((allowed) => {
      if (!active) return;
      setCanUseOfficialMatches(allowed);
      setCheckingAccess(false);
    });

    return () => {
      active = false;
    };
  }, [isAdmin, isAuthenticated, loading, user]);

  const clearMessages = () => {
    setNotice('');
    setErrorMessage('');
  };

  const resetMatch = () => {
    setRivalName('');
    setVenue('Local');
    setRivalPhoto('');
    setSelectedMatchId('');
    setRosterIds([]);
    setLineupIds([]);
    setOnCourtIds([]);
    setPeriodIndex(0);
    setEvents([]);
    setSavedSessionId(null);
    setPendingCourtPoint(null);
    setTargetAction(null);
    setConfirmModal(null);
    setShotFilters({ type: 'all', result: 'all', period: 'all' });
    clearMessages();
  };

  const goHome = () => {
    setView('home');
    setMatchKind(null);
    clearMessages();
  };

  const startMatchKind = (kind) => {
    clearMessages();
    if (kind === 'official') {
      if (loading || checkingAccess) {
        setErrorMessage('Estamos comprobando tus permisos. Prueba otra vez en un momento.');
        return;
      }
      if (!isAuthenticated) {
        setErrorMessage('Para partidos oficiales tienes que iniciar sesión con una cuenta autorizada.');
        return;
      }
      if (!canUseOfficialMatches) {
        setErrorMessage('El partido oficial está bloqueado para tu usuario. Un administrador puede darte permiso desde el panel.');
        return;
      }
    }
    resetMatch();
    setMatchKind(kind);
    setView('team');
  };

  const chooseTeam = (teamId) => {
    setTeam(teamId);
    setRosterIds([]);
    setLineupIds([]);
    setOnCourtIds([]);
    setRivalName('');
    setSelectedMatchId('');
    setView('rival');
  };

  const openCreatedTeamEditor = (teamId) => {
    setCreatedTeam(teamId);
    clearMessages();
    setView('createdTeamEditor');
  };

  const syncCreatedTeamWithActiveRoster = () => {
    setCreatedTeamPlayers((current) => ({
      ...current,
      [createdTeam]: buildCreatedTeamPlayers(createdTeam, activeRosterByTeam),
    }));
    setNotice('Equipo reenlazado con la plantilla activa de la web.');
  };

  const updateCreatedTeamPlayer = (slotId, patch) => {
    setCreatedTeamPlayers((current) => ({
      ...current,
      [createdTeam]: (current[createdTeam] || []).map((player) => (
        player.slotId === slotId ? { ...player, ...patch } : player
      )),
    }));
  };

  const getLinkedPlayer = (linkedPlayerId) => activeRosterByTeam.find((player) => String(player.id) === String(linkedPlayerId));

  const chooseOfficialMatch = (matchId) => {
    setSelectedMatchId(matchId);
    const match = officialMatches.find((item) => String(item.id) === String(matchId));
    if (match) {
      setRivalName(match.rival);
      setVenue(match.location || 'Local');
    }
  };

  const readRivalPhoto = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRivalPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const toggleRoster = (playerId) => {
    clearMessages();
    setRosterIds((current) => {
      if (current.includes(playerId)) return current.filter((id) => id !== playerId);
      if (current.length >= 12) {
        setErrorMessage('La convocatoria tiene un máximo de 12 jugadores.');
        return current;
      }
      return [...current, playerId];
    });
  };

  const toggleLineup = (playerId) => {
    clearMessages();
    setLineupIds((current) => {
      if (current.includes(playerId)) return current.filter((id) => id !== playerId);
      if (current.length >= 5) return current;
      return [...current, playerId];
    });
  };

  const toggleOnCourt = (playerId) => {
    setOnCourtIds((current) => {
      if (current.includes(playerId)) return current.filter((id) => id !== playerId);
      if (current.length >= 5) return current;
      return [...current, playerId];
    });
  };

  const continueFromRoster = () => {
    clearMessages();
    if (rosterIds.length < 5 || rosterIds.length > 12) {
      setErrorMessage('Elige entre 5 y 12 convocados.');
      return;
    }
    setLineupIds([]);
    setView('lineup');
  };

  const startLiveMatch = () => {
    clearMessages();
    if (lineupIds.length !== 5) {
      setErrorMessage('El quinteto inicial tiene que tener exactamente 5 jugadores.');
      return;
    }
    setOnCourtIds(lineupIds);
    setView('live');
  };

  const targetPlayers = useMemo(
    () => [...onCourtPlayers, { id: 'rival-team', name: rivalName || 'Rival', number: '', isOpponent: true }],
    [onCourtPlayers, rivalName],
  );

  const addEvent = (player, action) => {
    const usesCourtPoint = action.stat === 'shot' && action.shotType !== 1 && pendingCourtPoint;
    const event = {
      id: `stat-${Date.now()}-${events.length}`,
      playerId: player.id,
      playerName: player.name,
      playerNumber: player.number,
      teamSide: player.isOpponent ? 'rival' : 'own',
      action: action.action,
      label: action.label,
      value: action.value,
      stat: action.stat,
      shotType: action.shotType ?? null,
      made: action.made ?? null,
      period: periods[periodIndex],
      happenedAt: new Date().toISOString(),
      x: usesCourtPoint ? pendingCourtPoint.x : null,
      y: usesCourtPoint ? pendingCourtPoint.y : null,
    };
    setEvents((current) => [event, ...current]);
    if (action.stat === 'shot') setPendingCourtPoint(null);
    setTargetAction(null);
    clearMessages();
  };

  const undoLastEvent = () => {
    setEvents((current) => {
      if (!current.length) return current;
      const [lastEvent, ...remainingEvents] = current;
      setErrorMessage('');
      setNotice(`Acción deshecha: ${lastEvent.label} · ${lastEvent.playerName}.`);
      return remainingEvents;
    });
  };

  const handleCourtClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPendingCourtPoint({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  };

  const saveSession = async (status = 'captured') => {
    clearMessages();
    if (!isAuthenticated) {
      setNotice('Partido finalizado en pantalla. Para guardarlo en Supabase tienes que iniciar sesión.');
      return false;
    }
    if (matchKind === 'official' && !canUseOfficialMatches) {
      setErrorMessage('Tu usuario no tiene permiso para guardar partidos oficiales.');
      return false;
    }

    setIsSaving(true);
    try {
      const summary = {
        ownScore,
        rivalScore,
        events: events.length,
        roster: rosterPlayers.length,
        shots: shots.length,
      };
      const saved = await saveStatsSession({
        userId: user.id,
        mode: matchKind === 'official' ? 'connected' : 'simple',
        team,
        opponent: rivalName.trim() || 'Rival sin nombre',
        matchId: matchKind === 'official' && selectedMatchId ? Number(selectedMatchId) : null,
        status,
        summary,
        payload: {
          matchKind,
          activeSeason,
          venue,
          rivalPhoto,
          rosterIds,
          lineupIds,
          onCourtIds,
          score: { own: ownScore, rival: rivalScore },
          source: 'web-stats-app',
        },
        events: [...events].reverse(),
      });
      setNotice(matchKind === 'official'
        ? 'Partido oficial guardado. Ya queda preparado para enlazarlo con calendario y estadísticas públicas.'
        : 'Partido amistoso guardado correctamente.');
      if (saved?.session?.id) setSavedSessionId(saved.session.id);
      return saved;
    } catch (error) {
      setErrorMessage(error.message || 'No se ha podido guardar la sesión.');
      return false;
    } finally {
      setIsSaving(false);
      setConfirmModal(null);
    }
  };

  const finishMatch = async () => {
    clearMessages();
    if (matchKind === 'official') await saveSession('captured');
    setConfirmModal(null);
    setView('finished');
  };

  const publishOfficialMatch = async () => {
    clearMessages();
    if (matchKind !== 'official' || !selectedMatchId) {
      setErrorMessage('Selecciona un partido oficial del calendario antes de publicar.');
      return;
    }

    let sessionId = savedSessionId;
    if (!sessionId) {
      const saved = await saveSession('captured');
      sessionId = saved?.session?.id;
      if (!sessionId) return;
    }

    const publicStats = statsRows
      .filter((row) => !row.player.isOpponent)
      .map((row) => ({
        player_id: Number(row.player.id),
        minutes: null,
        points: row.pts,
        field_goals: `${row.t2Made + row.t3Made}-${row.t2Attempted + row.t3Attempted}`,
        three_pointers: `${row.t3Made}-${row.t3Attempted}`,
        free_throws: `${row.tlMade}-${row.tlAttempted}`,
        offensive_rebounds: row.rebOff,
        defensive_rebounds: row.rebDef,
        fouls: row.foulCommitted,
        steals: row.steal,
        turnovers: row.turnover,
        blocks: row.block,
        assists: row.assist,
        valuation: row.val,
      }));

    setIsSaving(true);
    try {
      await publishOfficialStatsSession({
        sessionId,
        matchId: selectedMatchId,
        ownScore,
        rivalScore,
        stats: publicStats,
      });
      setNotice('Partido publicado: calendario y fichas de los jugadores actualizados.');
    } catch (error) {
      setErrorMessage(error.message || 'No se ha podido publicar el partido oficial.');
    } finally {
      setIsSaving(false);
    }
  };

  const shareText = useMemo(() => {
    const mvp = mvpRow
      ? `MVP: ${mvpRow.player.name} #${mvpRow.player.number} · ${mvpRow.pts}pts, ${mvpRow.rebounds}reb, ${mvpRow.val}val`
      : 'MVP: pendiente de estadísticas';
    return [
      `Comunidad del banquillo ${ownScore} - ${rivalScore} ${rivalName || 'Rival'}`,
      `${matchKind === 'official' ? 'Partido oficial' : 'Amistoso'} · ${venue} · ${rosterPlayers.length} convocados`,
      mvp,
      '',
      'Estadísticas tomadas con la App de estadísticas de ADN Banquiller.',
    ].join('\n');
  }, [matchKind, mvpRow, ownScore, rivalName, rivalScore, rosterPlayers.length, venue]);

  const shareStats = async () => {
    clearMessages();
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Estadísticas del partido',
          text: shareText,
        });
        return;
      }
      await navigator.clipboard?.writeText(shareText);
      setNotice('Resumen copiado al portapapeles para compartirlo.');
    } catch (error) {
      setErrorMessage('No se ha podido abrir el menú de compartir. He dejado el resumen preparado para copiarlo.');
    }
  };

  const summaryEntries = events.map((event, index) => {
    const priorEvents = [...events].slice(index).reverse();
    const rows = getStatsForEvents(rosterPlayers, rivalName, priorEvents);
    const row = rows.find((item) => String(item.player.id) === String(event.playerId));
    const scoreAtEvent = priorEvents.reduce(
      (score, item) => ({
        own: score.own + (item.teamSide === 'own' ? item.value || 0 : 0),
        rival: score.rival + (item.teamSide === 'rival' ? item.value || 0 : 0),
      }),
      { own: 0, rival: 0 },
    );

    let detail = '';
    if (event.stat === 'shot') {
      const total = event.shotType === 1 ? shotText(row.tlMade, row.tlAttempted) : event.shotType === 2 ? shotText(row.t2Made, row.t2Attempted) : shotText(row.t3Made, row.t3Attempted);
      const verb = event.made ? (event.shotType === 1 ? 'ha metido un tiro libre' : `ha metido una canasta de ${event.shotType} puntos`) : (event.shotType === 1 ? 'ha fallado un tiro libre' : `ha fallado una canasta de ${event.shotType} puntos`);
      detail = `${playerLabel(row.player)} ${verb} (${row.pts}pts, ${total})`;
    } else {
      const labels = {
        rebOff: ['ha capturado un rebote ofensivo', row?.rebOff],
        rebDef: ['ha capturado un rebote defensivo', row?.rebDef],
        foulCommitted: ['ha cometido una falta', row?.foulCommitted],
        foulReceived: ['ha recibido una falta', row?.foulReceived],
        turnover: ['ha cometido una pérdida', row?.turnover],
        steal: ['ha recuperado un balón', row?.steal],
        assist: ['ha dado una asistencia', row?.assist],
        block: ['ha realizado un tapón', row?.block],
      };
      const [text, value] = labels[event.stat] || [event.label, 0];
      detail = `${playerLabel(row.player)} ${text} (${value})`;
    }

    return {
      id: event.id,
      heading: `Comunidad del banquillo ${scoreAtEvent.own} - ${scoreAtEvent.rival} ${rivalName || 'Rival'} · ${event.period}`,
      detail,
    };
  });

  const TopBar = ({ title, back = goHome, right = null, showBack = true }) => (
    <header className="sticky top-0 z-40 grid h-[66px] grid-cols-[1fr_auto_1fr] items-center border-b border-[#ffd60a]/15 bg-[#151515]/95 px-4 backdrop-blur-xl">
      {showBack ? (
        <button type="button" onClick={back} className="inline-flex items-center gap-2 justify-self-start text-base font-black text-[#f7f3df]">
          <ArrowLeft className="text-[#ffd60a]" size={24} />
          Inicio
        </button>
      ) : <div />}
      <h1 className="text-center text-3xl font-black leading-none text-[#f7f3df]">{title}</h1>
      <div className="justify-self-end">{right}</div>
    </header>
  );

  const PrimaryButton = ({ children, disabled = false, onClick, className = '' }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`min-h-[50px] rounded-[1.25rem] border-2 border-[#ffd60a] bg-[#ffd60a]/[0.08] px-5 text-base font-black text-[#f7f3df] transition hover:bg-[#ffd60a]/[0.15] disabled:cursor-not-allowed disabled:border-[#806d12] disabled:text-[#817b67] ${className}`}
    >
      {children}
    </button>
  );

  const PlayerCard = ({ player, selected, onClick, compact = false, green = false }) => (
    <button
      type="button"
      onClick={onClick}
      className={`relative grid justify-items-center rounded-[1rem] border-2 bg-[#191919]/90 p-3 text-center shadow-[0_16px_30px_rgba(0,0,0,0.26)] transition ${
        selected ? (green ? 'border-emerald-400 bg-emerald-500/15' : 'border-[#ffd60a] bg-[#ffd60a]/15') : 'border-white/25 hover:border-[#ffd60a]'
      } ${compact ? 'min-h-[160px] w-[150px]' : 'min-h-[190px] w-[154px]'}`}
    >
      <p className="justify-self-end text-3xl font-black text-[#f7f3df]">#{player.number}</p>
      <div className="grid h-[92px] w-[92px] place-items-center overflow-hidden rounded-xl border-2 border-[#ffd60a] bg-[#222]">
        {player.poster ? (
          <img src={player.poster} alt={player.name} className="h-full w-full object-cover object-top" />
        ) : (
          <span className="text-4xl">♙</span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-xl font-black leading-tight text-[#f7f3df]">{player.name?.split(' ')[0] || player.name}</p>
    </button>
  );

  const Court = ({ showShots = false, shotsToShow = [], onClick = null }) => (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      className={`relative mx-auto w-full overflow-hidden rounded border-2 ${pendingCourtPoint && !showShots ? 'border-sky-200' : 'border-[#ffd60a]'} bg-[#171006] p-2`}
    >
      <img src={COURT} alt="Pista CDB" className="block w-full select-none" draggable="false" />
      {!showShots && pendingCourtPoint && (
        <span className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-white shadow-[0_0_0_2px_#ffd60a]" style={{ left: `${pendingCourtPoint.x}%`, top: `${pendingCourtPoint.y}%` }} />
      )}
      {showShots && shotsToShow.map((shot) => (
        <span key={shot.id} className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black ${shot.made ? 'bg-emerald-400' : 'bg-red-400'}`} style={{ left: `${shot.x}%`, top: `${shot.y}%` }} title={`${shot.label} · ${shot.period}`} />
      ))}
    </div>
  );

  const TargetModal = () => targetAction && (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-3 backdrop-blur-sm sm:p-5">
      <section className="w-full max-w-[1120px] rounded-[1.5rem] border-2 border-[#ffd60a] bg-[#111] p-4 shadow-[0_30px_70px_rgba(0,0,0,0.65)] sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ffd60a]">Asignar estadística</p>
            <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">{targetAction.label}</h2>
          </div>
          <button type="button" onClick={() => setTargetAction(null)} className="grid h-11 w-11 place-items-center rounded-full border border-[#ffd60a] text-white"><X size={22} /></button>
        </div>
        <p className="mb-5 text-sm font-bold text-[#b8b09a]">Pulsa el jugador en pista o el equipo rival.</p>
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
          {targetPlayers.map((player) => (
            <button
              key={player.id}
              type="button"
              onClick={() => addEvent(player, targetAction)}
              className={`group relative grid min-h-[210px] w-[154px] shrink-0 snap-start grid-rows-[auto_1fr_auto] justify-items-center overflow-hidden rounded-2xl border-2 p-3 text-center transition hover:-translate-y-1 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd60a]/40 sm:w-[164px] ${
                player.isOpponent
                  ? 'border-white/35 bg-[#1c1c1c] hover:border-white/70'
                  : 'border-[#ffd60a] bg-[linear-gradient(145deg,rgba(255,214,10,0.28),rgba(40,34,4,0.75))] hover:bg-[#ffd60a]/30'
              }`}
            >
              <p className="justify-self-end text-3xl font-black leading-none text-[#f7f3df]">
                {player.isOpponent ? 'RIVAL' : `#${player.number}`}
              </p>
              <div className="my-2 grid h-[106px] w-[106px] place-items-center overflow-hidden rounded-xl border-2 border-[#ffd60a] bg-[#242424]">
                {player.isOpponent && !rivalPhoto ? (
                  <span className="text-5xl text-[#f7f3df]">♙</span>
                ) : (
                  <img
                    src={player.isOpponent ? rivalPhoto : player.poster}
                    alt={player.isOpponent ? rivalName || 'Rival' : player.name}
                    className="h-full w-full object-cover object-top"
                  />
                )}
              </div>
              <p className="line-clamp-2 text-lg font-black leading-tight text-[#f7f3df]">
                {player.isOpponent ? (rivalName || 'Rival') : (player.name?.split(' ')[0] || player.name)}
              </p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );

  const ConfirmModal = () => confirmModal && (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4">
      <section className="w-full max-w-[520px] rounded-[1.35rem] border-2 border-[#ffd60a] bg-[#111] p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-2xl font-black text-white">{confirmModal.title}</h2>
          <button type="button" onClick={() => setConfirmModal(null)} className="grid h-11 w-11 place-items-center rounded-full border border-[#ffd60a]"><X /></button>
        </div>
        <div className="grid gap-3">
          <PrimaryButton onClick={confirmModal.onConfirm}>{confirmModal.confirmText}</PrimaryButton>
          <PrimaryButton onClick={() => setConfirmModal(null)}>Cancelar</PrimaryButton>
        </div>
      </section>
    </div>
  );

  const HomeView = () => (
    <AppShell>
      <main className="grid min-h-screen grid-cols-1 items-center gap-8 px-8 py-10 md:grid-cols-[1.05fr_0.95fr] md:px-16">
        <section className="grid justify-items-center text-center">
          <img src={APP_LOGO} alt="ADN Banquiller Stats" className="w-[min(31vw,310px)] min-w-[220px] drop-shadow-[0_24px_38px_rgba(255,214,10,0.14)]" />
          <img src={WORDMARK} alt="Comunidad del Banquillo" className="mt-2 w-[min(40vw,440px)] min-w-[270px]" />
        </section>
        <section className="mx-auto grid w-full max-w-[390px] gap-5">
          <PrimaryButton className="min-h-[74px] rounded-full text-xl" onClick={() => setView('createdTeams')}>Equipos creados</PrimaryButton>
          <PrimaryButton className="min-h-[74px] rounded-full text-xl" onClick={() => setView('matchKind')}>Partidos</PrimaryButton>
          {errorMessage && <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-center text-sm font-bold text-red-100">{errorMessage}</p>}
        </section>
      </main>
    </AppShell>
  );

  const MatchKindView = () => (
    <AppShell>
      <TopBar title="Partidos" />
      <main className="px-5 py-7">
        <p className="text-sm font-black uppercase text-[#ffd60a]">Nuevo partido</p>
        <p className="mt-1 text-[#b8b09a]">Elige el tipo de partido para empezar a tomar estadísticas.</p>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <button type="button" onClick={() => startMatchKind('friendly')} className="min-h-[220px] rounded-[2rem] border-2 border-[#ffd60a] bg-[#181818]/90 p-7 text-left shadow-[0_24px_50px_rgba(0,0,0,0.35)] transition hover:bg-[#ffd60a]/10">
            <p className="text-xs font-black uppercase text-[#ffd60a]">Acceso libre</p>
            <h2 className="mt-3 text-4xl font-black text-white">Partido amistoso</h2>
            <p className="mt-3 max-w-lg text-sm font-bold text-[#b8b09a]">Para pruebas, torneos, pachangas o cualquier partido que no tenga que alimentar el calendario oficial.</p>
          </button>
          <button type="button" onClick={() => startMatchKind('official')} className="min-h-[220px] rounded-[2rem] border-2 border-[#ffd60a] bg-[#181818]/90 p-7 text-left shadow-[0_24px_50px_rgba(0,0,0,0.35)] transition hover:bg-[#ffd60a]/10">
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase text-[#ffd60a]"><Lock size={15} /> Acceso autorizado</p>
            <h2 className="mt-3 text-4xl font-black text-white">Partido oficial</h2>
            <p className="mt-3 max-w-lg text-sm font-bold text-[#b8b09a]">Temporada activa: {activeSeason.replace('-', '/')} · Enlazado con el calendario y limitado a usuarios autorizados.</p>
          </button>
        </div>
        {errorMessage && <p className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{errorMessage}</p>}
      </main>
    </AppShell>
  );

  const TeamView = () => (
    <AppShell>
      <TopBar title="Partidos" back={() => setView('matchKind')} />
      <main className="px-5 py-7">
        <p className="text-sm font-black uppercase text-[#ffd60a]">Nuevo partido</p>
        <p className="mt-1 text-[#b8b09a]">Elige con qué equipo vas a apuntar estadísticas.</p>
        <div className="mt-5 grid gap-5">
          {[
            { id: 'masculine', name: 'Comunidad del banquillo masculino', count: menRoster.length },
            { id: 'feminine', name: 'Comunidad del banquillo femenino', count: femalePlayers.length },
          ].map((item) => (
            <article key={item.id} className="grid min-h-[260px] max-w-[945px] grid-cols-[120px_1fr] items-center gap-7 rounded-[2rem] border-2 border-[#ffd60a] bg-[#181818]/90 p-7 shadow-[0_26px_52px_rgba(0,0,0,0.38)]">
              <img src={TEAM_LOGO} alt="ADN Banquiller" className="h-28 w-28 object-contain" />
              <div>
                <h2 className="text-4xl font-black text-white">{item.name}</h2>
                <p className="mt-2 font-bold text-[#b8b09a]">{item.count} jugadores disponibles</p>
                <PrimaryButton className="mt-8 rounded-full" onClick={() => chooseTeam(item.id)}>Elegir equipo</PrimaryButton>
              </div>
            </article>
          ))}
        </div>
      </main>
    </AppShell>
  );

  const RivalView = () => (
    <AppShell>
      <TopBar title="Rival" back={() => setView('team')} />
      <main className="grid justify-items-center px-5 py-6">
        <section className="w-full max-w-[620px] rounded-[1.75rem] border-2 border-[#ffd60a] bg-[#181818]/95 p-5 shadow-[0_24px_50px_rgba(0,0,0,0.4)]">
          <p className="text-sm font-black uppercase text-[#ffd60a]">Rival</p>
          <p className="mb-6 text-[#b8b09a]">Registra los datos básicos del rival para identificar el partido.</p>
          <label className="mx-auto mb-6 grid w-fit cursor-pointer justify-items-center gap-3">
            <input type="file" accept="image/*" className="hidden" onChange={(event) => readRivalPhoto(event.target.files?.[0])} />
            <span className="grid h-28 w-28 place-items-center overflow-hidden rounded-full border-2 border-[#ffd60a] bg-[#242424]">
              {rivalPhoto ? <img src={rivalPhoto} alt="Rival" className="h-full w-full object-cover" /> : <span className="text-5xl">♙</span>}
            </span>
            <span className="rounded-full border border-[#ffd60a] px-4 py-2 text-sm font-black">Tocar para añadir foto</span>
          </label>
          {matchKind === 'official' ? (
            <label className="grid gap-2 text-xs font-black uppercase text-[#b8b09a]">
              Nombre del rival
              <select value={selectedMatchId} onChange={(event) => chooseOfficialMatch(event.target.value)} className="min-h-12 rounded-xl border border-white/20 bg-[#2a2a2a] px-3 text-sm font-black text-white outline-none">
                <option value="">Elige rival del calendario · {activeSeason.replace('-', '/')}</option>
                {officialRivals.map((match) => <option key={match.id} value={match.id}>{match.rival}</option>)}
              </select>
              {!officialRivals.length && <span className="normal-case text-amber-200">Todavía no hay partidos publicados para esta temporada y equipo.</span>}
            </label>
          ) : (
            <label className="grid gap-2 text-xs font-black uppercase text-[#b8b09a]">
              Nombre del rival
              <input value={rivalName} onChange={(event) => setRivalName(event.target.value)} placeholder="Nombre del rival" className="min-h-12 rounded-xl border border-white/20 bg-[#2a2a2a] px-3 text-sm font-black text-white outline-none" />
            </label>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {['Local', 'Visitante'].map((item) => (
              <button key={item} type="button" onClick={() => setVenue(item)} className={`min-h-12 rounded-full border-2 border-[#ffd60a] text-xl font-black ${venue === item ? 'bg-[#ffd60a] text-black' : 'bg-transparent text-white'}`}>{item}</button>
            ))}
          </div>
          <PrimaryButton className="mt-4 w-full" onClick={() => rivalName.trim() ? setView('roster') : setErrorMessage('Pon el nombre del rival antes de continuar.')}>Siguiente</PrimaryButton>
          {errorMessage && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm font-bold text-red-100">{errorMessage}</p>}
        </section>
      </main>
    </AppShell>
  );

  const RosterView = () => (
    <AppShell>
      <TopBar title="Convocados" back={() => setView('rival')} />
      <main className="px-5 py-6">
        <p className="text-sm font-black uppercase text-[#ffd60a]">Convocatoria</p>
        <p className="text-[#b8b09a]">Elige un mínimo de 5 y un máximo de 12 jugadores.</p>
        <div className="mt-5 flex flex-wrap gap-4">
          {players.map((player) => <PlayerCard key={player.id} player={player} selected={rosterIds.includes(String(player.id))} onClick={() => toggleRoster(String(player.id))} />)}
        </div>
        <div className="mt-8 grid justify-items-center">
          <PrimaryButton disabled={rosterIds.length < 5 || rosterIds.length > 12} className="w-full max-w-[420px] rounded-full" onClick={continueFromRoster}>Elegir convocados ({rosterIds.length}/12)</PrimaryButton>
        </div>
        {errorMessage && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm font-bold text-red-100">{errorMessage}</p>}
      </main>
    </AppShell>
  );

  const LineupView = () => (
    <AppShell>
      <TopBar title="Quinteto inicial" back={() => setView('roster')} />
      <main className="px-5 py-6">
        <p className="text-sm font-black uppercase text-[#ffd60a]">Quinteto inicial</p>
        <p className="text-[#b8b09a]">Elige los cinco titulares.</p>
        <div className="mt-5 flex flex-wrap gap-4">
          {rosterPlayers.map((player) => <PlayerCard key={player.id} player={player} selected={lineupIds.includes(String(player.id))} onClick={() => toggleLineup(String(player.id))} />)}
        </div>
        <div className="mt-20 grid justify-items-center">
          <PrimaryButton disabled={lineupIds.length !== 5} className="w-full max-w-[420px] rounded-full" onClick={startLiveMatch}>Elegir quinteto ({lineupIds.length}/5)</PrimaryButton>
        </div>
        {errorMessage && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm font-bold text-red-100">{errorMessage}</p>}
      </main>
    </AppShell>
  );

  const LiveView = () => (
    <AppShell showWebBack={false}>
      <TopBar
        title="Partido"
        back={() => setView('lineup')}
        right={(
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!events.length}
              onClick={undoLastEvent}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#ffd60a] px-3 text-sm font-black text-[#f7f3df] transition hover:bg-[#ffd60a] hover:text-black disabled:cursor-not-allowed disabled:border-white/20 disabled:text-white/30 disabled:hover:bg-transparent"
            >
              <Undo2 size={18} />
              <span className="hidden sm:inline">Deshacer</span>
            </button>
            <a href="/" className="hidden min-h-10 items-center rounded-full border border-white/25 px-3 text-xs font-black uppercase text-[#f7f3df] transition hover:border-[#ffd60a] hover:text-[#ffd60a] md:inline-flex">
              Volver a la web
            </a>
          </div>
        )}
      />
      <main className="px-4 py-4">
        {notice && <p className="mb-3 rounded-xl bg-emerald-500/10 p-3 text-sm font-bold text-emerald-100">{notice}</p>}
        {errorMessage && <p className="mb-3 rounded-xl bg-red-500/10 p-3 text-sm font-bold text-red-100">{errorMessage}</p>}
        <section className="grid gap-4 lg:grid-cols-[334px_1fr]">
          <div className="grid grid-cols-2 gap-2">
            {actionButtons.map((button) => <PrimaryButton key={button.action} className="min-h-[98px] rounded-lg" onClick={() => setTargetAction(button)}>{button.label}</PrimaryButton>)}
          </div>
          <div className="rounded-lg border-2 border-[#ffd60a] bg-[#120d04] p-3">
            <Court onClick={handleCourtClick} />
          </div>
        </section>
        <section className="mt-4 grid min-h-[70px] grid-cols-[auto_auto_1fr_auto_auto_auto] items-center gap-2 rounded-2xl border border-[#ffd60a]/40 bg-black/35 p-2">
          <PrimaryButton onClick={() => setView('stats')}>Estadísticas</PrimaryButton>
          <PrimaryButton onClick={() => setView('subs')}>SUB</PrimaryButton>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-3">
            <p className="truncate text-right text-sm font-black">Comunidad del banquillo</p>
            <p className="whitespace-nowrap text-4xl font-black text-[#ffd60a]">{ownScore} - {rivalScore}</p>
            <p className="truncate text-sm font-black">{rivalName || 'Rival'}</p>
          </div>
          <PrimaryButton onClick={() => {
            if (periodIndex < periods.length - 1) {
              setConfirmModal({ title: `¿Quieres avanzar al ${getOrdinalPeriod(periodIndex)} cuarto?`, confirmText: 'Continuar', onConfirm: () => { setPeriodIndex((current) => current + 1); setConfirmModal(null); } });
            } else {
              setConfirmModal({ title: 'Finalizar partido', confirmText: isSaving ? 'Guardando...' : 'Finalizar partido', onConfirm: finishMatch });
            }
          }}>{periods[periodIndex]}</PrimaryButton>
          <PrimaryButton onClick={() => setView('shotChart')}>Campo de tiro</PrimaryButton>
          <PrimaryButton onClick={() => setView('summary')}>Resumen</PrimaryButton>
        </section>
        <TargetModal />
        <ConfirmModal />
      </main>
    </AppShell>
  );

  const StatsView = () => (
    <AppShell>
      <TopBar title="Estadísticas" back={() => setView('live')} />
      <main className="px-5 py-6">
        <p className="text-sm font-black uppercase text-[#ffd60a]">Estadísticas</p>
        <p className="mb-5 text-[#b8b09a]">Detalle acumulado del partido.</p>
        <div className="overflow-x-auto rounded-2xl border border-[#ffd60a]/45">
          <table className="w-full min-w-[920px] border-collapse bg-black/20 text-left">
            <thead className="text-xs uppercase text-[#ffd60a]">
              <tr>{['Jugador', 'PTS', 'TL', 'T2', 'T3', 'RO', 'RD', 'REB', 'PER', 'ROB', 'AST', 'BLK', 'FP', 'FR', 'VAL'].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr>
            </thead>
            <tbody>
              {statsRows.map((row) => (
                <tr key={row.player.id} className="border-t border-white/10 text-white">
                  <td className="px-3 py-3 font-bold">{playerLabel(row.player)}</td>
                  <td className="px-3 py-3">{row.pts}</td>
                  <td className="px-3 py-3">{shotText(row.tlMade, row.tlAttempted)}</td>
                  <td className="px-3 py-3">{shotText(row.t2Made, row.t2Attempted)}</td>
                  <td className="px-3 py-3">{shotText(row.t3Made, row.t3Attempted)}</td>
                  <td className="px-3 py-3">{row.rebOff}</td>
                  <td className="px-3 py-3">{row.rebDef}</td>
                  <td className="px-3 py-3">{row.rebounds}</td>
                  <td className="px-3 py-3">{row.turnover}</td>
                  <td className="px-3 py-3">{row.steal}</td>
                  <td className="px-3 py-3">{row.assist}</td>
                  <td className="px-3 py-3">{row.block}</td>
                  <td className="px-3 py-3">{row.foulCommitted}</td>
                  <td className="px-3 py-3">{row.foulReceived}</td>
                  <td className="px-3 py-3">{row.val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </AppShell>
  );

  const SubsView = () => (
    <AppShell>
      <TopBar title="SUB" back={() => setView('live')} />
      <main className="px-5 py-6">
        <p className="text-sm font-black uppercase text-[#ffd60a]">Sustituciones</p>
        <p className="text-[#b8b09a]">Selecciona los cinco jugadores que están en pista.</p>
        <div className="mt-5 flex flex-wrap gap-4">
          {rosterPlayers.map((player) => <PlayerCard key={player.id} player={player} selected={onCourtIds.includes(String(player.id))} onClick={() => toggleOnCourt(String(player.id))} green compact />)}
        </div>
        <div className="mt-20 grid justify-items-center">
          <PrimaryButton disabled={onCourtIds.length !== 5} className="w-full max-w-[420px] rounded-full" onClick={() => setView('live')}>Guardar cambios ({onCourtIds.length}/5)</PrimaryButton>
        </div>
      </main>
    </AppShell>
  );

  const SummaryView = () => (
    <AppShell>
      <TopBar title="Resumen" back={() => setView('live')} />
      <main className="px-5 py-6">
        <p className="text-sm font-black uppercase text-[#ffd60a]">Resumen</p>
        <p className="mb-5 text-[#b8b09a]">Acciones registradas durante el partido.</p>
        <div className="grid gap-3">
          {summaryEntries.length ? summaryEntries.map((entry) => (
            <article key={entry.id} className="rounded-2xl border border-[#ffd60a]/45 bg-black/30 p-4">
              <p className="font-black text-[#ffd60a]">{entry.heading}</p>
              <p className="mt-2 font-bold text-white">{entry.detail}</p>
            </article>
          )) : <p className="rounded-2xl border border-[#ffd60a]/30 p-5 text-center font-bold text-[#b8b09a]">Todavía no hay acciones registradas.</p>}
        </div>
      </main>
    </AppShell>
  );

  const ShotChartView = () => (
    <AppShell>
      <TopBar title="Campo de tiro" back={() => setView('live')} />
      <main className="px-5 py-6">
        <p className="text-sm font-black uppercase text-[#ffd60a]">Campo de tiro</p>
        <p className="mb-5 text-[#b8b09a]">Mapa de tiros registrados por ubicación, acierto y tipo de lanzamiento.</p>
        <div className="mx-auto mb-4 grid max-w-[960px] gap-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ['all', 'Todos'],
              ['1', '1PT'],
              ['2', '2PT'],
              ['3', '3PT'],
            ].map(([value, label]) => <PrimaryButton key={value} className={shotFilters.type === value ? '!border-[#ffd60a] !bg-[#ffd60a] !text-black' : ''} onClick={() => setShotFilters((current) => ({ ...current, type: value }))}>{label}</PrimaryButton>)}
            {[
              ['made', 'Anotados'],
              ['missed', 'Fallados'],
            ].map(([value, label]) => <PrimaryButton key={value} className={shotFilters.result === value ? '!border-[#ffd60a] !bg-[#ffd60a] !text-black' : ''} onClick={() => setShotFilters((current) => ({ ...current, result: current.result === value ? 'all' : value }))}>{label}</PrimaryButton>)}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {['all', ...periods].map((value) => <PrimaryButton key={value} className={shotFilters.period === value ? '!border-[#ffd60a] !bg-[#ffd60a] !text-black' : ''} onClick={() => setShotFilters((current) => ({ ...current, period: value }))}>{value === 'all' ? 'Todos los cuartos' : value}</PrimaryButton>)}
          </div>
        </div>
        <Court showShots shotsToShow={filteredShots} />
      </main>
    </AppShell>
  );

  const FinishedView = () => (
    <AppShell>
      <TopBar title="Partido finalizado" showBack={false} />
      <main className="px-5 py-8">
        <section className="rounded-[1.35rem] border border-[#ffd60a]/45 bg-black/35 p-5 shadow-[0_20px_45px_rgba(0,0,0,0.35)]">
          <h1 className="text-2xl font-black text-white md:text-3xl">
            Comunidad del banquillo {ownScore} - {rivalScore} {rivalName || 'Rival'}
          </h1>
          <p className="mt-2 font-bold text-[#b8b09a]">
            {matchKind === 'official' ? 'Partido oficial' : 'Amistoso'} · {venue} · {rosterPlayers.length} convocados
          </p>
          <div className="mt-5 rounded-2xl border border-[#ffd60a]/30 bg-[#151515] p-4">
            <p className="text-xs font-black uppercase text-[#ffd60a]">Jugador más destacado</p>
            <p className="mt-2 text-xl font-black text-white">
              {mvpRow
                ? `MVP: ${mvpRow.player.name} #${mvpRow.player.number} ${mvpRow.pts}pts, ${mvpRow.rebounds}reb, ${mvpRow.val} val`
                : 'MVP: pendiente de estadísticas'}
            </p>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <PrimaryButton onClick={() => setView('stats')}>Ver estadísticas</PrimaryButton>
            <PrimaryButton onClick={shareStats}>Compartir estadísticas</PrimaryButton>
          </div>
          {matchKind === 'official' && (
            <div className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4">
              <p className="text-sm font-black uppercase text-emerald-200">Partido oficial</p>
              <p className="mt-1 text-sm font-bold text-emerald-50/90">
                Al guardar/publicar este partido queda asociado al calendario seleccionado y preparado para alimentar las estadísticas de cada jugador.
              </p>
              <PrimaryButton className="mt-4 w-full !border-emerald-300 !bg-emerald-400 !text-black" disabled={isSaving} onClick={publishOfficialMatch}>
                {isSaving ? 'Publicando...' : 'Conectar con calendario y actualizar fichas'}
              </PrimaryButton>
            </div>
          )}
          {notice && <p className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-sm font-bold text-emerald-100">{notice}</p>}
          {matchKind === 'official' && errorMessage && (
            <div className="mt-4 rounded-xl bg-red-500/10 p-3">
              <p className="text-sm font-bold text-red-100">{errorMessage}</p>
              <PrimaryButton className="mt-3 w-full !border-red-300" onClick={() => saveSession('captured')}>Reintentar guardado</PrimaryButton>
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );

  const CreatedTeamsView = () => (
    <AppShell>
      <TopBar title="Equipos creados" />
      <main className="px-5 py-7">
        <div className="grid gap-5 md:grid-cols-2">
          {[
            { id: 'masculine', name: 'Comunidad del banquillo masculino', count: menRoster.length },
            { id: 'feminine', name: 'Comunidad del banquillo femenino', count: femalePlayers.length },
          ].map((item) => (
            <article key={item.id} className="rounded-[2rem] border-2 border-[#ffd60a] bg-[#181818]/90 p-7 shadow-[0_25px_55px_rgba(0,0,0,0.35)]">
              <div className="grid grid-cols-[112px_1fr] items-center gap-5">
                <img src={TEAM_LOGO} alt="ADN Banquiller" className="h-28 w-28 object-contain" />
                <div>
                  <h2 className="text-3xl font-black leading-tight text-white md:text-4xl">Comunidad del banquillo</h2>
                  <p className="mt-2 font-bold text-[#b8b09a]">{item.count} jugadores</p>
                </div>
              </div>
              <div className="mt-6 grid gap-3">
                <PrimaryButton className="rounded-full" onClick={() => openCreatedTeamEditor(item.id)}>Editar equipo</PrimaryButton>
              </div>
            </article>
          ))}
        </div>
      </main>
    </AppShell>
  );

  const CreatedTeamEditorView = () => {
    const teamName = createdTeam === 'feminine' ? 'Comunidad del banquillo femenino' : 'Comunidad del banquillo masculino';

    return (
      <AppShell>
        <TopBar title="Editar equipo" back={() => setView('createdTeams')} />
        <main className="px-4 py-5">
          <section className="rounded-[1.5rem] border-2 border-[#ffd60a] bg-[#111]/90 p-5 shadow-[0_25px_55px_rgba(0,0,0,0.35)]">
            <div className="grid grid-cols-[96px_1fr] items-center gap-4">
              <img src={TEAM_LOGO} alt="ADN Banquiller" className="h-24 w-24 object-contain" />
              <div>
                <h1 className="text-3xl font-black leading-tight text-white md:text-4xl">Comunidad del banquillo</h1>
                <p className="mt-1 font-bold text-[#b8b09a]">{editableTeamPlayers.length} jugadores · {teamName}</p>
              </div>
            </div>
          </section>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-sm font-black uppercase text-[#ffd60a]">Plantilla</p>
              <p className="text-[#b8b09a]">Edita motes o reenlaza cada ficha sin perder el jugador real al que pertenecen las estadísticas.</p>
            </div>
            <PrimaryButton className="rounded-full" onClick={syncCreatedTeamWithActiveRoster}>Enlazar plantilla activa</PrimaryButton>
          </div>

          {notice && <p className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-sm font-bold text-emerald-100">{notice}</p>}

          <section className="mt-4 overflow-x-auto pb-5">
            <div className="flex min-w-max gap-4">
              {editableTeamPlayers.map((createdPlayer) => {
                const linkedPlayer = getLinkedPlayer(createdPlayer.linkedPlayerId) || activeRosterByTeam[0];
                const displayName = createdPlayer.nickname.trim() || linkedPlayer?.name?.split(' ')[0] || 'Jugador';
                const surname = linkedPlayer?.name?.split(' ').slice(1).join(' ') || 'Sin apellido';

                return (
                  <article key={createdPlayer.slotId} className="grid w-[238px] shrink-0 content-start rounded-[1.25rem] border border-[#ffd60a] bg-[#181818]/95 p-4 shadow-[0_22px_45px_rgba(0,0,0,0.34)]">
                    <div className="grid min-h-[245px] content-center justify-items-center">
                      <p className="justify-self-end text-3xl font-black text-[#ffd60a]">#{linkedPlayer?.number ?? '-'}</p>
                      <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full border-2 border-[#ffd60a] bg-[#24210f]">
                        {linkedPlayer?.poster ? (
                          <img src={linkedPlayer.poster} alt={linkedPlayer.name} className="h-full w-full object-cover object-top" />
                        ) : (
                          <span className="text-5xl">♙</span>
                        )}
                      </div>
                      <h2 className="mt-4 text-center text-3xl font-black leading-none text-white">{displayName}</h2>
                      <p className="mt-3 text-center font-bold text-[#b8b09a]">{createdPlayer.nickname.trim() ? `Real: ${linkedPlayer?.name}` : surname}</p>
                    </div>

                    <label className="mt-4 grid gap-2 text-xs font-black uppercase text-[#b8b09a]">
                      Mote o nombre visible
                      <input
                        value={createdPlayer.nickname}
                        onChange={(event) => updateCreatedTeamPlayer(createdPlayer.slotId, { nickname: event.target.value })}
                        placeholder={linkedPlayer?.name?.split(' ')[0] || 'Mote'}
                        className="min-h-11 rounded-xl border border-white/15 bg-black/35 px-3 text-sm font-black normal-case text-white outline-none focus:border-[#ffd60a]"
                      />
                    </label>

                    <label className="mt-3 grid gap-2 text-xs font-black uppercase text-[#b8b09a]">
                      Jugador real enlazado
                      <select
                        value={createdPlayer.linkedPlayerId}
                        onChange={(event) => updateCreatedTeamPlayer(createdPlayer.slotId, { linkedPlayerId: event.target.value })}
                        className="min-h-11 rounded-xl border border-white/15 bg-black/35 px-3 text-sm font-black normal-case text-white outline-none focus:border-[#ffd60a]"
                      >
                        {activeRosterByTeam.map((player) => (
                          <option key={player.id} value={player.id}>#{player.number} · {player.name}</option>
                        ))}
                      </select>
                    </label>
                  </article>
                );
              })}
            </div>
          </section>
        </main>
      </AppShell>
    );
  };

  if (view === 'home') return HomeView();
  if (view === 'matchKind') return MatchKindView();
  if (view === 'team') return TeamView();
  if (view === 'rival') return RivalView();
  if (view === 'roster') return RosterView();
  if (view === 'lineup') return LineupView();
  if (view === 'live') return LiveView();
  if (view === 'stats') return StatsView();
  if (view === 'subs') return SubsView();
  if (view === 'summary') return SummaryView();
  if (view === 'shotChart') return ShotChartView();
  if (view === 'finished') return FinishedView();
  if (view === 'createdTeams') return CreatedTeamsView();
  if (view === 'createdTeamEditor') return CreatedTeamEditorView();
  return HomeView();
};

export default StatsCapturePage;
