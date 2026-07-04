import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Eye,
  LayoutDashboard,
  LockKeyhole,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Trash2,
  Trophy,
  UsersRound,
  Zap,
} from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';
import { buildPlayerMarket } from '@/pages/BanquigerPage.jsx';
import { applyBanquigerPricing } from '@/utils/banquigerPricing.js';
import {
  defaultBanquigerSettings,
  defaultBanquigerRounds,
  defaultBanquigerPowers,
  getStoredBanquigerPlayers,
  getStoredBanquigerRounds,
  getStoredBanquigerPowers,
  getStoredBanquigerPowerState,
  getStoredBanquigerMarketState,
  getStoredBanquigerSettings,
  resetStoredBanquigerPlayers,
  resetStoredBanquigerRounds,
  resetStoredBanquigerPowers,
  resetStoredBanquigerPowerState,
  resetStoredBanquigerMarketState,
  resetStoredBanquigerSettings,
  saveStoredBanquigerPlayers,
  saveStoredBanquigerRounds,
  saveStoredBanquigerPowers,
  saveStoredBanquigerSettings,
  saveStoredBanquigerPowerState,
  saveStoredBanquigerMarketState,
} from '@/utils/banquigerStorage.js';
import { GAME_DATA_KEYS, loadBanquigerBundle, loadBanquigerTeams, saveGameDocument } from '@/lib/gameDataRepository.js';

const positions = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'];
const baseMarket = buildPlayerMarket();
const emptyPlayer = {
  id: '',
  name: '',
  number: 0,
  position: 'Base',
  team: 'masculine',
  games: 0,
  avgMinutes: 0,
  avgValuation: 0,
  lastValuation: 0,
  price: 0.4,
  active: true,
  manualPrice: true,
};
const emptyPower = {
  id: '',
  name: '',
  description: '',
  type: 'positive',
  effect: 'own_double',
  rarity: 'common',
  active: true,
};

const panelViews = [
  { id: 'overview', label: 'Resumen', icon: LayoutDashboard },
  { id: 'rounds', label: 'Jornadas', icon: CalendarClock },
  { id: 'market', label: 'Mercado', icon: Store },
  { id: 'powers', label: 'Poderes', icon: Zap },
  { id: 'teams', label: 'Equipos', icon: Trophy },
];

const demoTeams = [
  { id: 'demo-1', manager: 'Nacho', name: 'Pizarra y Triple', players: 7, value: 61.4, points: 42.5 },
  { id: 'demo-2', manager: 'Briseida', name: 'Social Basket Club', players: 7, value: 59.8, points: 38.8 },
  { id: 'demo-3', manager: 'Irene', name: 'Delegación Fantasy', players: 7, value: 62.1, points: 35.2 },
];

const BanquigerAdminPage = () => {
  const { authMode, loading, isAuthenticated, isAdmin, user } = useAuth();
  const [settings, setSettings] = useState(() => getStoredBanquigerSettings());
  const [players, setPlayers] = useState(() => getStoredBanquigerPlayers(baseMarket, { includeInactive: true }));
  const [selectedId, setSelectedId] = useState(() => players[0]?.id || '');
  const [form, setForm] = useState(() => players[0] || emptyPlayer);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [notice, setNotice] = useState('');
  const [activeView, setActiveView] = useState('overview');
  const [rounds, setRounds] = useState(() => getStoredBanquigerRounds());
  const [newRound, setNewRound] = useState({ name: '', deadline: '' });
  const [powers, setPowers] = useState(() => getStoredBanquigerPowers({ includeInactive: true }));
  const [selectedPowerId, setSelectedPowerId] = useState(() => powers[0]?.id || '');
  const [powerForm, setPowerForm] = useState(() => powers[0] || emptyPower);
  const [remoteTeams, setRemoteTeams] = useState([]);

  useEffect(() => {
    if (loading || !isAdmin) return;
    let active = true;
    const fallbacks = {
      settings: getStoredBanquigerSettings(),
      players: getStoredBanquigerPlayers(baseMarket, { includeInactive: true }),
      rounds: getStoredBanquigerRounds(),
      powers: getStoredBanquigerPowers({ includeInactive: true }),
      powerState: getStoredBanquigerPowerState(),
      marketState: getStoredBanquigerMarketState(),
    };
    Promise.all([loadBanquigerBundle(fallbacks), loadBanquigerTeams()]).then(([bundle, teams]) => {
      if (!active) return;
      const nextSettings = saveStoredBanquigerSettings(bundle.settings);
      const nextPlayers = saveStoredBanquigerPlayers(bundle.players);
      const nextRounds = saveStoredBanquigerRounds(bundle.rounds);
      const nextPowers = saveStoredBanquigerPowers(bundle.powers);
      saveStoredBanquigerPowerState(bundle.powerState);
      if (bundle.marketState) saveStoredBanquigerMarketState(bundle.marketState);
      setSettings(nextSettings);
      setPlayers(nextPlayers);
      setRounds(nextRounds);
      setPowers(nextPowers);
      setSelectedId(nextPlayers[0]?.id || '');
      setForm(nextPlayers[0] || emptyPlayer);
      setSelectedPowerId(nextPowers[0]?.id || '');
      setPowerForm(nextPowers[0] || emptyPower);
      setRemoteTeams(teams);
      void Promise.all([
        saveGameDocument(GAME_DATA_KEYS.banquigerSettings, 'banquiger', nextSettings),
        saveGameDocument(GAME_DATA_KEYS.banquigerPlayers, 'banquiger', nextPlayers),
        saveGameDocument(GAME_DATA_KEYS.banquigerRounds, 'banquiger', nextRounds),
        saveGameDocument(GAME_DATA_KEYS.banquigerPowers, 'banquiger', nextPowers),
        saveGameDocument(GAME_DATA_KEYS.banquigerPowerState, 'banquiger', bundle.powerState),
        saveGameDocument(GAME_DATA_KEYS.banquigerMarketState, 'banquiger', bundle.marketState || fallbacks.marketState),
      ]);
    });
    return () => { active = false; };
  // Initial migration from local storage to Supabase.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAdmin]);

  const saveRemote = (key, payload) => void saveGameDocument(key, 'banquiger', payload);

  const fantasyTeams = useMemo(() => {
    let localTeam = null;
    try {
      const stored = JSON.parse(
        window.localStorage.getItem(`banquiger-team-v2:${user?.id}`)
          || window.localStorage.getItem('banquiger-team-v2')
          || 'null',
      );
      if (stored) {
        const selected = Array.isArray(stored.selectedIds) ? stored.selectedIds.map(String) : [];
        const value = selected.reduce((total, id) => total + (players.find((player) => player.id === id)?.price || 0), 0);
        localTeam = {
          id: 'local-team',
          manager: stored.managerName || 'Manager invitado',
          name: stored.teamName || 'Mi Banquiger',
          players: selected.length,
          value,
          points: 0,
          local: true,
        };
      }
    } catch {
      localTeam = null;
    }
    const sharedTeams = remoteTeams.length
      ? remoteTeams.map((team) => ({ id: team.id, manager: team.manager_name || 'Manager', name: team.name, players: team.selected_ids?.length || 0, value: Number(team.budget || 0), points: Number(team.total_points || 0) }))
      : demoTeams;
    return [...(localTeam && !remoteTeams.some((team) => team.user_id === user?.id) ? [localTeam] : []), ...sharedTeams].sort((a, b) => b.points - a.points);
  }, [players, remoteTeams, user?.id]);

  const filteredPlayers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return players
      .filter((player) => statusFilter === 'all' || (statusFilter === 'active' ? player.active : !player.active))
      .filter((player) => `${player.name} ${player.number} ${player.position}`.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => Number(b.active) - Number(a.active) || b.price - a.price);
  }, [players, query, statusFilter]);

  const stats = useMemo(() => ({
    active: players.filter((player) => player.active).length,
    averagePrice: players.filter((player) => player.active).reduce((total, player) => total + player.price, 0)
      / (players.filter((player) => player.active).length || 1),
    manualPrices: players.filter((player) => player.manualPrice).length,
  }), [players]);

  if (loading) {
    return <div className="min-h-screen bg-[#0a0a0a] text-white"><Header /><main className="mx-auto max-w-7xl px-4 py-16">Cargando sesión...</main></div>;
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/mi-cuenta" replace />;

  const selectPlayer = (player) => {
    setSelectedId(player.id);
    setForm({ ...emptyPlayer, ...player });
    setNotice('');
  };

  const startNewPlayer = () => {
    setSelectedId('');
    setForm({ ...emptyPlayer });
    setNotice('');
  };

  const saveSettings = () => {
    const saved = saveStoredBanquigerSettings(settings);
    setSettings(saved);
    saveRemote(GAME_DATA_KEYS.banquigerSettings, saved);
    setNotice('Configuración del juego guardada.');
  };

  const savePlayer = () => {
    const name = form.name.trim();
    if (!name) {
      setNotice('Escribe el nombre del jugador antes de guardar.');
      return;
    }

    const id = String(form.id || `custom-${Date.now()}`);
    const nextPlayer = { ...form, id, name, manualPrice: true };
    const nextPlayers = selectedId
      ? players.map((player) => (player.id === selectedId ? nextPlayer : player))
      : [...players, nextPlayer];
    const saved = saveStoredBanquigerPlayers(nextPlayers);
    setPlayers(saved);
    setSelectedId(id);
    setForm(saved.find((player) => player.id === id) || nextPlayer);
    saveRemote(GAME_DATA_KEYS.banquigerPlayers, saved);
    setNotice(selectedId ? 'Jugador actualizado.' : 'Jugador añadido al mercado.');
  };

  const removeCustomPlayer = () => {
    if (!selectedId.startsWith('custom-')) return;
    const nextPlayers = players.filter((player) => player.id !== selectedId);
    saveStoredBanquigerPlayers(nextPlayers);
    setPlayers(nextPlayers);
    setSelectedId(nextPlayers[0]?.id || '');
    setForm(nextPlayers[0] || emptyPlayer);
    saveRemote(GAME_DATA_KEYS.banquigerPlayers, nextPlayers);
    setNotice('Jugador personalizado eliminado.');
  };

  const restoreDefaults = () => {
    resetStoredBanquigerSettings();
    resetStoredBanquigerPlayers();
    resetStoredBanquigerRounds();
    resetStoredBanquigerPowers();
    resetStoredBanquigerPowerState();
    resetStoredBanquigerMarketState();
    const restoredPlayers = getStoredBanquigerPlayers(baseMarket, { includeInactive: true });
    setSettings(defaultBanquigerSettings);
    setPlayers(restoredPlayers);
    setRounds(defaultBanquigerRounds);
    setPowers(defaultBanquigerPowers);
    setSelectedPowerId(defaultBanquigerPowers[0]?.id || '');
    setPowerForm(defaultBanquigerPowers[0] || emptyPower);
    setSelectedId(restoredPlayers[0]?.id || '');
    setForm(restoredPlayers[0] || emptyPlayer);
    saveRemote(GAME_DATA_KEYS.banquigerSettings, defaultBanquigerSettings);
    saveRemote(GAME_DATA_KEYS.banquigerPlayers, restoredPlayers);
    saveRemote(GAME_DATA_KEYS.banquigerRounds, defaultBanquigerRounds);
    saveRemote(GAME_DATA_KEYS.banquigerPowers, defaultBanquigerPowers);
    saveRemote(GAME_DATA_KEYS.banquigerPowerState, { inventory: [], uses: [] });
    saveRemote(GAME_DATA_KEYS.banquigerMarketState, {
      lastProcessedMatchId: null,
      prices: {},
      previousPrices: {},
      changes: {},
      history: [],
    });
    setNotice('Banquiger restaurado a sus valores iniciales.');
  };

  const updateRounds = (nextRounds, message) => {
    const saved = saveStoredBanquigerRounds(nextRounds);
    setRounds(saved);
    saveRemote(GAME_DATA_KEYS.banquigerRounds, saved);
    setNotice(message);
  };

  const addRound = () => {
    if (!newRound.name.trim() || !newRound.deadline) {
      setNotice('Indica un nombre y una fecha límite para crear la jornada.');
      return;
    }
    updateRounds([
      { id: `round-${Date.now()}`, name: newRound.name, deadline: newRound.deadline, status: 'open', scored: false },
      ...rounds.map((round) => ({ ...round, status: 'closed' })),
    ], 'Jornada creada y mercado anterior cerrado.');
    setSettings((current) => {
      const next = saveStoredBanquigerSettings({ ...current, currentRound: newRound.name, marketStatus: 'open' });
      saveRemote(GAME_DATA_KEYS.banquigerSettings, next);
      return next;
    });
    setNewRound({ name: '', deadline: '' });
  };

  const toggleRound = (roundId) => {
    const target = rounds.find((round) => round.id === roundId);
    const nextStatus = target?.status === 'open' ? 'closed' : 'open';
    updateRounds(rounds.map((round) => ({
      ...round,
      status: round.id === roundId ? nextStatus : (nextStatus === 'open' ? 'closed' : round.status),
    })), nextStatus === 'open' ? 'Mercado de la jornada abierto.' : 'Mercado de la jornada bloqueado.');
    if (target?.name === settings.currentRound) setSettings((current) => {
      const next = saveStoredBanquigerSettings({ ...current, marketStatus: nextStatus });
      saveRemote(GAME_DATA_KEYS.banquigerSettings, next);
      return next;
    });
  };

  const markScored = (roundId) => updateRounds(
    rounds.map((round) => (round.id === roundId ? { ...round, scored: !round.scored } : round)),
    'Estado de puntuación actualizado.',
  );

  const recalculatePrices = () => {
    resetStoredBanquigerMarketState();
    const recalculated = applyBanquigerPricing(players).map((player) => ({ ...player, manualPrice: false }));
    setPlayers(saveStoredBanquigerPlayers(recalculated));
    saveRemote(GAME_DATA_KEYS.banquigerPlayers, recalculated);
    setForm((current) => recalculated.find((player) => player.id === current.id) || current);
    setNotice('Precios recalculados a partir de la valoración media.');
  };

  const selectPower = (power) => {
    setSelectedPowerId(power.id);
    setPowerForm({ ...emptyPower, ...power });
    setNotice('');
  };

  const startNewPower = () => {
    setSelectedPowerId('');
    setPowerForm({ ...emptyPower });
    setNotice('');
  };

  const savePower = () => {
    if (!powerForm.name.trim()) {
      setNotice('El poder necesita un nombre.');
      return;
    }
    const id = powerForm.id || `power-${Date.now()}`;
    const nextPower = { ...powerForm, id, name: powerForm.name.trim() };
    const nextPowers = selectedPowerId
      ? powers.map((power) => (power.id === selectedPowerId ? nextPower : power))
      : [...powers, nextPower];
    const saved = saveStoredBanquigerPowers(nextPowers);
    setPowers(saved);
    setSelectedPowerId(id);
    setPowerForm(saved.find((power) => power.id === id) || nextPower);
    saveRemote(GAME_DATA_KEYS.banquigerPowers, saved);
    setNotice(selectedPowerId ? 'Poder actualizado.' : 'Poder creado.');
  };

  const deletePower = () => {
    if (!selectedPowerId) return;
    const nextPowers = powers.filter((power) => power.id !== selectedPowerId);
    setPowers(saveStoredBanquigerPowers(nextPowers));
    setSelectedPowerId(nextPowers[0]?.id || '');
    setPowerForm(nextPowers[0] || emptyPower);
    saveRemote(GAME_DATA_KEYS.banquigerPowers, nextPowers);
    setNotice('Poder eliminado.');
  };

  const inputClass = 'w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-bold text-white outline-none transition focus:border-[hsl(43_65%_52%)]';

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-white">
      <Helmet><title>Banquiger - Panel de control</title></Helmet>
      <Header />
      <main className="flex-1 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link to="/panel-control" className="mb-5 inline-flex items-center gap-2 text-sm font-black uppercase text-gray-400 transition hover:text-[hsl(43_65%_52%)]">
            <ArrowLeft size={17} /> Volver al panel
          </Link>

          <section className="mb-6 flex flex-col gap-4 rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <span className="rounded-xl border border-[hsl(43_65%_52%_/_0.25)] bg-[hsl(43_65%_52%_/_0.08)] p-3"><Store className="text-[hsl(43_65%_52%)]" /></span>
              <div><p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">Panel de control</p><h1 className="mt-1">Banquiger</h1><p className="mt-2 text-sm text-gray-400">Configura las reglas, la jornada y los jugadores disponibles en el mercado.</p></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/banquiger/panel" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-black uppercase hover:border-[hsl(43_65%_52%)]"><Eye size={15} /> Ver juego</Link>
              <span className="inline-flex items-center gap-2 rounded-lg bg-[hsl(43_65%_52%_/_0.08)] px-4 py-2.5 text-xs font-black text-[hsl(43_65%_62%)]"><ShieldCheck size={15} /> {authMode === 'supabase' ? 'Supabase' : 'Local'} · {user.email}</span>
            </div>
          </section>

          {notice && <p className="mb-6 rounded-lg border border-[hsl(43_65%_52%_/_0.3)] bg-[hsl(43_65%_52%_/_0.08)] px-4 py-3 text-sm font-bold text-[hsl(43_65%_70%)]">{notice}</p>}

          <nav className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-[#111]/90 p-2 sm:grid-cols-5" aria-label="Secciones de Banquiger">
            {panelViews.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => { setActiveView(id); setNotice(''); }}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-xs font-black uppercase transition ${activeView === id ? 'bg-[hsl(43_65%_52%)] text-black' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </nav>

          {activeView === 'overview' && <>
          <section className="mb-6 grid gap-3 sm:grid-cols-3">
            {[[UsersRound, 'Jugadores activos', stats.active], [CircleDollarSign, 'Precio medio', `${stats.averagePrice.toFixed(1)}M`], [SlidersHorizontal, 'Precios manuales', stats.manualPrices]].map(([Icon, label, value]) => (
              <article key={label} className="rounded-xl border border-white/10 bg-[#111]/90 p-4"><Icon size={18} className="text-[hsl(43_65%_52%)]" /><p className="mt-3 text-xs font-black uppercase text-gray-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></article>
            ))}
          </section>

          <section className="mb-6 rounded-xl border border-white/10 bg-[#111]/90 p-5">
            <div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">Reglas activas</p><h2 className="text-xl font-black">Configuración del juego</h2></div><button type="button" onClick={saveSettings} className="inline-flex items-center gap-2 rounded-lg bg-[hsl(43_65%_52%)] px-4 py-2.5 text-xs font-black uppercase text-black"><Save size={15} /> Guardar</button></div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <label><span className="mb-2 block text-xs font-black uppercase text-gray-500">Jornada actual</span><input className={inputClass} value={settings.currentRound} onChange={(e) => setSettings({ ...settings, currentRound: e.target.value })} /></label>
              <label><span className="mb-2 block text-xs font-black uppercase text-gray-500">Estado del mercado</span><select className={inputClass} value={settings.marketStatus} onChange={(e) => setSettings({ ...settings, marketStatus: e.target.value })}><option value="open">Abierto</option><option value="closed">Cerrado</option></select></label>
              <label><span className="mb-2 block text-xs font-black uppercase text-gray-500">Presupuesto (M)</span><input className={inputClass} type="number" step="0.5" value={settings.budget} onChange={(e) => setSettings({ ...settings, budget: e.target.value })} /></label>
              <label><span className="mb-2 block text-xs font-black uppercase text-gray-500">Tamaño plantilla</span><input className={inputClass} type="number" value={settings.teamSize} onChange={(e) => setSettings({ ...settings, teamSize: e.target.value })} /></label>
              <label><span className="mb-2 block text-xs font-black uppercase text-gray-500">Multiplicador titular</span><input className={inputClass} type="number" step="0.1" value={settings.starterNonPointMultiplier} onChange={(e) => setSettings({ ...settings, starterNonPointMultiplier: e.target.value })} /></label>
            </div>
          </section>
          <section className="grid gap-4 md:grid-cols-3">
            <button type="button" onClick={() => setActiveView('rounds')} className="rounded-xl border border-white/10 bg-[#111]/90 p-5 text-left transition hover:border-[hsl(43_65%_52%_/_0.5)]"><CalendarClock className="text-[hsl(43_65%_52%)]" /><strong className="mt-4 block">Gestionar jornada</strong><span className="mt-1 block text-sm text-gray-500">Abrir mercado, fijar el cierre y publicar puntos.</span></button>
            <button type="button" onClick={() => setActiveView('market')} className="rounded-xl border border-white/10 bg-[#111]/90 p-5 text-left transition hover:border-[hsl(43_65%_52%_/_0.5)]"><Store className="text-[hsl(43_65%_52%)]" /><strong className="mt-4 block">Revisar mercado</strong><span className="mt-1 block text-sm text-gray-500">Editar disponibilidad, valoraciones y precios.</span></button>
            <button type="button" onClick={() => setActiveView('teams')} className="rounded-xl border border-white/10 bg-[#111]/90 p-5 text-left transition hover:border-[hsl(43_65%_52%_/_0.5)]"><Trophy className="text-[hsl(43_65%_52%)]" /><strong className="mt-4 block">Ver clasificación</strong><span className="mt-1 block text-sm text-gray-500">Consultar equipos, plantillas y puntuaciones.</span></button>
          </section>
          </>}

          {activeView === 'rounds' && <section className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
            <article className="rounded-xl border border-white/10 bg-[#111]/90 p-5 lg:self-start">
              <p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">Nueva jornada</p>
              <h2 className="mt-1 text-xl font-black">Programar mercado</h2>
              <p className="mt-2 text-sm text-gray-500">Al crearla, las jornadas anteriores se cierran automáticamente.</p>
              <div className="mt-5 space-y-4">
                <label><span className="mb-2 block text-xs font-black uppercase text-gray-500">Nombre</span><input className={inputClass} value={newRound.name} onChange={(e) => setNewRound({ ...newRound, name: e.target.value })} placeholder="Jornada 2" /></label>
                <label><span className="mb-2 block text-xs font-black uppercase text-gray-500">Cierre de fichajes</span><input className={inputClass} type="datetime-local" value={newRound.deadline} onChange={(e) => setNewRound({ ...newRound, deadline: e.target.value })} /></label>
                <button type="button" onClick={addRound} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[hsl(43_65%_52%)] px-4 py-3 text-xs font-black uppercase text-black"><Plus size={15} /> Crear jornada</button>
              </div>
            </article>
            <article className="rounded-xl border border-white/10 bg-[#111]/90 p-5">
              <div className="mb-5"><p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">Historial</p><h2 className="text-xl font-black">Jornadas Banquiger</h2></div>
              <div className="space-y-3">
                {rounds.map((round) => (
                  <div key={round.id} className="flex flex-col gap-4 rounded-xl border border-white/10 bg-black/25 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className={`rounded-lg p-2 ${round.status === 'open' ? 'bg-green-500/10 text-green-300' : 'bg-white/5 text-gray-500'}`}>{round.status === 'open' ? <Clock3 size={18} /> : <LockKeyhole size={18} />}</span>
                      <div><strong>{round.name}</strong><p className="mt-1 text-xs text-gray-500">Cierre: {round.deadline ? new Date(round.deadline).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin fecha'}</p><p className={`mt-1 text-xs font-bold ${round.scored ? 'text-green-300' : 'text-amber-300'}`}>{round.scored ? 'Puntuación publicada' : 'Pendiente de puntuar'}</p></div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => toggleRound(round.id)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black uppercase hover:border-[hsl(43_65%_52%)]">{round.status === 'open' ? 'Cerrar' : 'Abrir'}</button>
                      <button type="button" onClick={() => markScored(round.id)} className={`rounded-lg px-3 py-2 text-xs font-black uppercase ${round.scored ? 'bg-green-500/10 text-green-300' : 'bg-white/5 text-gray-300'}`}><CheckCircle2 size={15} className="inline" /> {round.scored ? 'Publicada' : 'Publicar'}</button>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>}

          {activeView === 'market' && <>
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-[#111]/90 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">Herramientas de mercado</p><p className="mt-1 text-sm text-gray-500">Actualiza todos los precios usando la valoración media de cada jugador.</p></div>
            <button type="button" onClick={recalculatePrices} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[hsl(43_65%_52%_/_0.35)] px-4 py-2.5 text-xs font-black uppercase text-[hsl(43_65%_62%)] hover:bg-[hsl(43_65%_52%_/_0.08)]"><RefreshCw size={15} /> Recalcular precios</button>
          </div>
          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-xl border border-white/10 bg-[#111]/90 p-5">
              <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">Mercado</p><h2 className="text-xl font-black">Jugadores</h2></div><button type="button" onClick={startNewPlayer} className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs font-black uppercase hover:bg-white/10"><Plus size={15} /> Añadir</button></div>
              <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]"><label className="relative"><Search size={16} className="absolute left-3 top-3 text-gray-500" /><input className={`${inputClass} pl-9`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar jugador" /></label><select className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select></div>
              <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
                {filteredPlayers.map((player) => <button type="button" key={player.id} onClick={() => selectPlayer(player)} className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border p-3 text-left transition ${selectedId === player.id ? 'border-[hsl(43_65%_52%)] bg-[hsl(43_65%_52%_/_0.08)]' : 'border-white/5 bg-black/25 hover:border-white/20'}`}><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/50 text-sm font-black text-[hsl(43_65%_52%)]">#{player.number}</span><span className="min-w-0"><strong className="block truncate text-sm">{player.name}</strong><small className="text-gray-500">{player.position} · {player.active ? 'Activo' : 'Fuera del mercado'}</small></span><strong>{player.price.toFixed(1)}M</strong></button>)}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#111]/90 p-5 xl:self-start">
              <div className="mb-5"><p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">Ficha de mercado</p><h2 className="text-xl font-black">{selectedId ? 'Editar jugador' : 'Nuevo jugador'}</h2></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2"><span className="mb-2 block text-xs font-black uppercase text-gray-500">Nombre</span><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
                <label><span className="mb-2 block text-xs font-black uppercase text-gray-500">Dorsal</span><input className={inputClass} type="number" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></label>
                <label><span className="mb-2 block text-xs font-black uppercase text-gray-500">Posición</span><select className={inputClass} value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}>{positions.map((position) => <option key={position}>{position}</option>)}</select></label>
                <label><span className="mb-2 block text-xs font-black uppercase text-gray-500">Equipo</span><select className={inputClass} value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })}><option value="masculine">Masculino</option><option value="feminine">Femenino</option></select></label>
                <label><span className="mb-2 block text-xs font-black uppercase text-gray-500">Precio (M)</span><input className={inputClass} type="number" min="0.5" step="0.1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
                <label><span className="mb-2 block text-xs font-black uppercase text-gray-500">Valoración media</span><input className={inputClass} type="number" step="0.1" value={form.avgValuation} onChange={(e) => setForm({ ...form, avgValuation: e.target.value })} /></label>
                <label><span className="mb-2 block text-xs font-black uppercase text-gray-500">Última valoración</span><input className={inputClass} type="number" step="0.1" value={form.lastValuation} onChange={(e) => setForm({ ...form, lastValuation: e.target.value })} /></label>
                <label className="sm:col-span-2 flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 p-3"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /><span><strong className="block text-sm">Disponible en el mercado</strong><small className="text-gray-500">Los jugadores desactivados desaparecen del juego.</small></span></label>
              </div>
              <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={savePlayer} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[hsl(43_65%_52%)] px-4 py-3 text-xs font-black uppercase text-black"><Save size={15} /> Guardar jugador</button>{selectedId.startsWith('custom-') && <button type="button" onClick={removeCustomPlayer} className="rounded-lg border border-red-400/20 px-4 text-red-300 hover:bg-red-500/10" aria-label="Eliminar jugador"><Trash2 size={17} /></button>}</div>
            </div>
          </section>
          </>}

          {activeView === 'powers' && <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <article className="rounded-xl border border-white/10 bg-[#111]/90 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div><p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">Cartas de remontada</p><h2 className="text-xl font-black">Poderes disponibles</h2></div>
                <button type="button" onClick={startNewPower} className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs font-black uppercase hover:bg-white/10"><Plus size={15} /> Añadir</button>
              </div>
              <p className="mb-4 text-sm text-gray-500">Los equipos de las tres últimas posiciones reciben una carta para la siguiente jornada.</p>
              <div className="space-y-2">
                {powers.map((power) => <button key={power.id} type="button" onClick={() => selectPower(power)} className={`w-full rounded-xl border p-4 text-left transition ${selectedPowerId === power.id ? 'border-[hsl(43_65%_52%)] bg-[hsl(43_65%_52%_/_0.08)]' : 'border-white/5 bg-black/25 hover:border-white/20'}`}>
                  <span className="flex items-start justify-between gap-3"><span><strong className="block text-sm">{power.name}</strong><small className="mt-1 block text-gray-500">{power.description}</small></span><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase ${power.type === 'positive' ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'}`}>{power.type === 'positive' ? 'Propio' : 'Rival'}</span></span>
                </button>)}
              </div>
            </article>

            <article className="rounded-xl border border-white/10 bg-[#111]/90 p-5 xl:self-start">
              <div className="mb-5"><p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">Configuración</p><h2 className="text-xl font-black">{selectedPowerId ? 'Editar poder' : 'Nuevo poder'}</h2></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2"><span className="mb-2 block text-xs font-black uppercase text-gray-500">Nombre</span><input className={inputClass} value={powerForm.name} onChange={(e) => setPowerForm({ ...powerForm, name: e.target.value })} /></label>
                <label className="sm:col-span-2"><span className="mb-2 block text-xs font-black uppercase text-gray-500">Descripción</span><textarea className={`${inputClass} min-h-24 resize-y`} value={powerForm.description} onChange={(e) => setPowerForm({ ...powerForm, description: e.target.value })} /></label>
                <label><span className="mb-2 block text-xs font-black uppercase text-gray-500">Objetivo</span><select className={inputClass} value={powerForm.type} onChange={(e) => setPowerForm({ ...powerForm, type: e.target.value })}><option value="positive">Equipo propio</option><option value="negative">Equipo rival</option></select></label>
                <label><span className="mb-2 block text-xs font-black uppercase text-gray-500">Rareza</span><select className={inputClass} value={powerForm.rarity} onChange={(e) => setPowerForm({ ...powerForm, rarity: e.target.value })}><option value="common">Común</option><option value="rare">Raro</option></select></label>
                <label className="sm:col-span-2"><span className="mb-2 block text-xs font-black uppercase text-gray-500">Efecto</span><select className={inputClass} value={powerForm.effect} onChange={(e) => setPowerForm({ ...powerForm, effect: e.target.value, type: e.target.value.startsWith('rival') || e.target.value === 'force_sale' ? 'negative' : 'positive' })}><option value="own_double">x2 adicional a jugador propio</option><option value="bench_as_starter">Suplente puntúa como titular</option><option value="rival_half">/2 a jugador rival</option><option value="force_sale">Obligar a vender jugador rival</option></select></label>
                <label className="sm:col-span-2 flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 p-3"><input type="checkbox" checked={powerForm.active} onChange={(e) => setPowerForm({ ...powerForm, active: e.target.checked })} /><span><strong className="block text-sm">Poder activo</strong><small className="text-gray-500">Solo los poderes activos pueden asignarse.</small></span></label>
              </div>
              <div className="mt-5 flex gap-2"><button type="button" onClick={savePower} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[hsl(43_65%_52%)] px-4 py-3 text-xs font-black uppercase text-black"><Save size={15} /> Guardar poder</button>{selectedPowerId && <button type="button" onClick={deletePower} className="rounded-lg border border-red-400/20 px-4 text-red-300 hover:bg-red-500/10" aria-label="Eliminar poder"><Trash2 size={17} /></button>}</div>
            </article>
          </section>}

          {activeView === 'teams' && <section className="rounded-xl border border-white/10 bg-[#111]/90 p-5">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">Competición</p><h2 className="text-xl font-black">Equipos y clasificación</h2></div><span className="text-xs font-bold uppercase text-gray-500">{fantasyTeams.length} equipos registrados</span></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs font-black uppercase text-gray-500"><tr><th className="px-3 py-3">Pos.</th><th className="px-3 py-3">Equipo</th><th className="px-3 py-3">Manager</th><th className="px-3 py-3">Plantilla</th><th className="px-3 py-3">Valor</th><th className="px-3 py-3 text-right">Puntos</th></tr></thead>
                <tbody>{fantasyTeams.map((team, index) => <tr key={team.id} className="border-b border-white/5 last:border-0"><td className="px-3 py-4"><span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg font-black ${index === 0 ? 'bg-[hsl(43_65%_52%)] text-black' : 'bg-white/5 text-gray-400'}`}>{index + 1}</span></td><td className="px-3 py-4 font-black">{team.name}{team.local && <span className="ml-2 rounded bg-blue-500/10 px-2 py-1 text-[10px] uppercase text-blue-300">Local</span>}</td><td className="px-3 py-4 text-gray-400">{team.manager}</td><td className="px-3 py-4">{team.players}/{settings.teamSize}</td><td className="px-3 py-4">{team.value.toFixed(1)}M</td><td className="px-3 py-4 text-right text-lg font-black text-[hsl(43_65%_62%)]">{team.points.toFixed(1)}</td></tr>)}</tbody>
              </table>
            </div>
          </section>}

          <button type="button" onClick={restoreDefaults} className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase text-gray-500 transition hover:text-red-300"><RotateCcw size={15} /> Restaurar todos los valores iniciales</button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BanquigerAdminPage;
