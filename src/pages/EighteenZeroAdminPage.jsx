import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  Eye,
  Link2,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  Trash2,
} from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';
import { DRAFT_POSITIONS } from '@/data/cdbPlayers.js';
import { baseCdbEvents, eventStatOptions } from '@/data/cdbEvents.js';
import { defaultCdbCoaches } from '@/data/cdbCoaches.js';
import {
  baseEighteenZeroSkills,
  basePlayerChemistryLinks,
  getStoredEighteenZeroChemistryLinks,
  getStoredEighteenZeroCoaches,
  getStoredEighteenZeroEvents,
  getStoredEighteenZeroPlayers,
  getStoredEighteenZeroSkills,
  resetEighteenZeroChemistryLinks,
  resetEighteenZeroCoaches,
  resetEighteenZeroEvents,
  resetEighteenZeroPlayers,
  resetEighteenZeroSkills,
  saveEighteenZeroChemistryLinks,
  saveEighteenZeroCoaches,
  saveEighteenZeroEvents,
  saveEighteenZeroPlayers,
  saveEighteenZeroSkills,
} from '@/utils/eighteenZeroStorage.js';
import { GAME_DATA_KEYS, loadEighteenZeroBundle, saveGameDocument } from '@/lib/gameDataRepository.js';

const statFields = [
  ['attack', 'Ataque'],
  ['defense', 'Defensa'],
  ['rebound', 'Rebote'],
  ['playmaking', 'Dirección'],
  ['threePoint', 'Triple'],
  ['physical', 'Físico'],
  ['leadership', 'Liderazgo'],
  ['clutch', 'Clutch'],
];

const emptyPlayer = {
  id: '',
  personId: '',
  name: '',
  number: '',
  position: 'Base',
  secondaryPositions: [],
  season: '2025/26',
  stats: {
    attack: 70,
    defense: 70,
    rebound: 70,
    playmaking: 70,
    threePoint: 70,
    physical: 70,
    leadership: 70,
    clutch: 70,
  },
  tags: ['ADN Banquiller'],
  description: '',
  draftEligible: true,
};

const emptyEvent = {
  id: '',
  name: '',
  description: '',
  stats: ['leadership'],
  target: 75,
  divisor: 6,
  positiveResult: 'por responder bien al contexto.',
  negativeResult: 'porque el contexto castigó al quinteto.',
  requiredPlayerIds: [],
  requirementMode: 'all',
  chance: 100,
  playerRequirementScope: 'person',
};

const emptyChemistryLink = {
  id: '',
  name: '',
  playerIds: ['', ''],
  description: '',
};
const emptyCoach = {
  id: '',
  name: '',
  role: 'Entrenador',
  image: '',
  event: { ...emptyEvent, id: '', name: 'Evento del entrenador', chance: 100 },
};

const slugify = (value) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const clamp = (value, min, max) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
};

const normalizeForm = (form) => {
  const name = form.name.trim();
  const season = form.season.trim() || '2025/26';
  const personId = form.personId || slugify(name);
  return {
  ...form,
  id: form.id || `${personId}-${slugify(season)}`,
  personId,
  name,
  number: Number(form.number) || 0,
  season,
  description: form.description.trim(),
  secondaryPositions: (form.secondaryPositions || []).filter((position) => position !== form.position),
  tags: (form.tags || []).filter(Boolean),
  stats: Object.fromEntries(
    statFields.map(([key]) => [key, clamp(form.stats[key], 0, 100)]),
  ),
  };
};

const EighteenZeroAdminPage = () => {
  const { authMode, loading, isAuthenticated, isAdmin, user } = useAuth();
  const [players, setPlayers] = useState(() => getStoredEighteenZeroPlayers());
  const [selectedId, setSelectedId] = useState(players[0]?.id || '');
  const [form, setForm] = useState(() => players[0] || emptyPlayer);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [skills, setSkills] = useState(() => getStoredEighteenZeroSkills());
  const [skillInput, setSkillInput] = useState('');
  const [events, setEvents] = useState(() => getStoredEighteenZeroEvents());
  const [selectedEventId, setSelectedEventId] = useState(() => events[0]?.id || '');
  const [chemistryLinks, setChemistryLinks] = useState(() =>
    getStoredEighteenZeroChemistryLinks(),
  );
  const [selectedChemistryId, setSelectedChemistryId] = useState(
    () => chemistryLinks[0]?.id || '',
  );
  const [coaches, setCoaches] = useState(() => getStoredEighteenZeroCoaches());
  const [selectedCoachId, setSelectedCoachId] = useState(() => coaches[0]?.id || '');
  const [coachForm, setCoachForm] = useState(() => coaches[0] || emptyCoach);

  const selectedEventIndex = events.findIndex((item) => item.id === selectedEventId);
  const selectedEvent = selectedEventIndex >= 0 ? events[selectedEventIndex] : null;
  const selectedChemistryIndex = chemistryLinks.findIndex(
    (item) => item.id === selectedChemistryId,
  );
  const selectedChemistry =
    selectedChemistryIndex >= 0 ? chemistryLinks[selectedChemistryIndex] : null;

  const filteredPlayers = useMemo(
    () =>
      players
        .filter((player) =>
          `${player.name} ${player.position} ${player.tags?.join(' ') || ''}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
        )
        .sort((a, b) => a.position.localeCompare(b.position) || a.name.localeCompare(b.name)),
    [players, query],
  );
  const playerPeople = useMemo(
    () => Array.from(new Map(players.map((player) => [player.personId || player.id, { id: player.personId || player.id, name: player.name }])).values()),
    [players],
  );
  const linkedPlayer = playerPeople.find((person) => person.id === (form.personId || form.id));

  useEffect(() => {
    if (loading || !isAdmin) return;
    let active = true;
    loadEighteenZeroBundle({ players, events, skills, chemistry: chemistryLinks, coaches }).then((bundle) => {
      if (!active) return;
      setPlayers(bundle.players);
      setEvents(bundle.events);
      setSkills(bundle.skills);
      setChemistryLinks(bundle.chemistry);
      setCoaches(bundle.coaches);
      setSelectedId(bundle.players[0]?.id || '');
      setForm(bundle.players[0] || emptyPlayer);
      setSelectedEventId(bundle.events[0]?.id || '');
      setSelectedChemistryId(bundle.chemistry[0]?.id || '');
      setSelectedCoachId(bundle.coaches[0]?.id || '');
      setCoachForm(bundle.coaches[0] || emptyCoach);
      void Promise.all([
        saveGameDocument(GAME_DATA_KEYS.eighteenZeroPlayers, 'eighteen-zero', bundle.players),
        saveGameDocument(GAME_DATA_KEYS.eighteenZeroEvents, 'eighteen-zero', bundle.events),
        saveGameDocument(GAME_DATA_KEYS.eighteenZeroSkills, 'eighteen-zero', bundle.skills),
        saveGameDocument(GAME_DATA_KEYS.eighteenZeroChemistry, 'eighteen-zero', bundle.chemistry),
        saveGameDocument(GAME_DATA_KEYS.eighteenZeroCoaches, 'eighteen-zero', bundle.coaches),
      ]);
    });
    return () => { active = false; };
  // Initial migration from local storage to Supabase.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAdmin]);

  const saveRemote = (key, payload) => void saveGameDocument(key, 'eighteen-zero', payload);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070707] text-white">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-16">Cargando sesión...</main>
        <Footer />
      </div>
    );
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
    setForm(emptyPlayer);
    setNotice('');
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateStat = (field, value) => {
    setForm((current) => ({
      ...current,
      stats: {
        ...current.stats,
        [field]: clamp(value, 0, 100),
      },
    }));
  };

  const toggleSecondaryPosition = (position) => {
    setForm((current) => {
      const currentPositions = current.secondaryPositions || [];
      const nextPositions = currentPositions.includes(position)
        ? currentPositions.filter((item) => item !== position)
        : [...currentPositions, position];

      return { ...current, secondaryPositions: nextPositions };
    });
  };

  const togglePlayerSkill = (skill) => {
    setForm((current) => {
      const currentTags = Array.isArray(current.tags) ? current.tags : [];
      const nextTags = currentTags.includes(skill)
        ? currentTags.filter((tag) => tag !== skill)
        : [...currentTags, skill];

      return { ...current, tags: nextTags };
    });
  };

  const addSkill = () => {
    const skill = skillInput.trim();
    if (!skill) return;

    const nextSkills = Array.from(new Set([...skills, skill])).sort((first, second) =>
      first.localeCompare(second),
    );
    setSkills(nextSkills);
    saveEighteenZeroSkills(nextSkills);
    saveRemote(GAME_DATA_KEYS.eighteenZeroSkills, nextSkills);
    setSkillInput('');
    setNotice('Habilidad añadida.');
  };

  const removeSkill = (skill) => {
    const nextSkills = skills.filter((item) => item !== skill);
    const nextPlayers = players.map((player) => ({
      ...player,
      tags: (player.tags || []).filter((tag) => tag !== skill),
    }));

    setSkills(nextSkills);
    setPlayers(nextPlayers);
    setForm((current) => ({
      ...current,
      tags: (current.tags || []).filter((tag) => tag !== skill),
    }));
    saveEighteenZeroSkills(nextSkills);
    saveEighteenZeroPlayers(nextPlayers);
    saveRemote(GAME_DATA_KEYS.eighteenZeroSkills, nextSkills);
    saveRemote(GAME_DATA_KEYS.eighteenZeroPlayers, nextPlayers);
    setNotice('Habilidad eliminada y retirada de los jugadores.');
  };

  const restoreSkills = () => {
    resetEighteenZeroSkills();
    setSkills(baseEighteenZeroSkills);
    saveRemote(GAME_DATA_KEYS.eighteenZeroSkills, baseEighteenZeroSkills);
    setNotice('Habilidades restauradas.');
  };

  const updateEventItem = (index, field, value) => {
    setEvents((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
  };

  const toggleEventStat = (index, stat) => {
    setEvents((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const currentStats = Array.isArray(item.stats) ? item.stats : [];
        const nextStats = currentStats.includes(stat)
          ? currentStats.filter((entry) => entry !== stat)
          : [...currentStats, stat];

        return { ...item, stats: nextStats.length ? nextStats : [stat] };
      }),
    );
  };

  const toggleEventPlayer = (index, playerId) => {
    setEvents((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const requiredIds = Array.isArray(item.requiredPlayerIds) ? item.requiredPlayerIds : [];
        return {
          ...item,
          requiredPlayerIds: requiredIds.includes(playerId)
            ? requiredIds.filter((id) => id !== playerId)
            : [...requiredIds, playerId],
        };
      }),
    );
  };

  const changeEventRequirementScope = (index, scope) => {
    setEvents((current) => current.map((item, itemIndex) => itemIndex === index
      ? { ...item, playerRequirementScope: scope, requiredPlayerIds: [] }
      : item));
  };

  const addSeasonEvent = () => {
    const nextEvent = { ...emptyEvent, id: `evento-${Date.now()}`, name: 'Nuevo evento' };
    setEvents((current) => [...current, nextEvent]);
    setSelectedEventId(nextEvent.id);
  };

  const deleteSeasonEvent = (index) => {
    setEvents((current) => {
      const nextEvents = current.filter((_, itemIndex) => itemIndex !== index);
      setSelectedEventId(nextEvents[0]?.id || '');
      return nextEvents;
    });
  };

  const persistEvents = () => {
    saveEighteenZeroEvents(events);
    saveRemote(GAME_DATA_KEYS.eighteenZeroEvents, events);
    setEvents(getStoredEighteenZeroEvents());
    setNotice('Eventos de temporada guardados.');
  };

  const restoreEvents = () => {
    resetEighteenZeroEvents();
    setEvents(baseCdbEvents);
    saveRemote(GAME_DATA_KEYS.eighteenZeroEvents, baseCdbEvents);
    setSelectedEventId(baseCdbEvents[0]?.id || '');
    setNotice('Eventos de temporada restaurados.');
  };

  const updateChemistryLink = (index, field, value) => {
    setChemistryLinks((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
  };

  const updateChemistryPlayer = (index, playerIndex, playerId) => {
    setChemistryLinks((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const nextPlayerIds = [...(item.playerIds || ['', ''])];
        nextPlayerIds[playerIndex] = playerId;
        const cleanPlayerIds = nextPlayerIds.slice(0, 5);
        return { ...item, playerIds: cleanPlayerIds, modifier: Math.max(1, cleanPlayerIds.length - 1) };
      }),
    );
  };

  const updateChemistryPlayerCount = (index, count) => {
    const playerCount = clamp(count, 2, 5);
    setChemistryLinks((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const nextPlayerIds = Array.from(
          { length: playerCount },
          (_, playerIndex) => item.playerIds?.[playerIndex] || '',
        );
        return { ...item, playerIds: nextPlayerIds, modifier: playerCount - 1 };
      }),
    );
  };

  const addChemistryLink = () => {
    const nextLink = {
      ...emptyChemistryLink,
      id: `quimica-${Date.now()}`,
      name: 'Nueva química',
    };
    setChemistryLinks((current) => [...current, nextLink]);
    setSelectedChemistryId(nextLink.id);
  };

  const deleteChemistryLink = (index) => {
    setChemistryLinks((current) => {
      const nextLinks = current.filter((_, itemIndex) => itemIndex !== index);
      setSelectedChemistryId(nextLinks[0]?.id || '');
      return nextLinks;
    });
  };

  const persistChemistryLinks = () => {
    saveEighteenZeroChemistryLinks(chemistryLinks);
    saveRemote(GAME_DATA_KEYS.eighteenZeroChemistry, chemistryLinks);
    setChemistryLinks(getStoredEighteenZeroChemistryLinks());
    setNotice('Química entre jugadores guardada.');
  };

  const restoreChemistryLinks = () => {
    resetEighteenZeroChemistryLinks();
    setChemistryLinks(basePlayerChemistryLinks);
    saveRemote(GAME_DATA_KEYS.eighteenZeroChemistry, basePlayerChemistryLinks);
    setSelectedChemistryId(basePlayerChemistryLinks[0]?.id || '');
    setNotice('Química entre jugadores restaurada.');
  };

  const selectCoach = (coach) => {
    setSelectedCoachId(coach.id);
    setCoachForm({ ...emptyCoach, ...coach, event: { ...emptyEvent, ...coach.event, chance: 100 } });
    setNotice('');
  };

  const startNewCoach = () => {
    setSelectedCoachId('');
    setCoachForm({ ...emptyCoach, event: { ...emptyCoach.event } });
    setNotice('');
  };

  const updateCoachEvent = (field, value) => {
    setCoachForm((current) => ({ ...current, event: { ...current.event, [field]: value } }));
  };

  const toggleCoachEventStat = (stat) => {
    setCoachForm((current) => {
      const stats = current.event.stats || [];
      const nextStats = stats.includes(stat) ? stats.filter((item) => item !== stat) : [...stats, stat];
      return { ...current, event: { ...current.event, stats: nextStats.length ? nextStats : [stat] } };
    });
  };

  const saveCoach = () => {
    if (!coachForm.name.trim()) {
      setNotice('El entrenador necesita un nombre.');
      return;
    }
    const id = coachForm.id || slugify(coachForm.name) || `coach-${Date.now()}`;
    const nextCoach = { ...coachForm, id, event: { ...coachForm.event, id: coachForm.event.id || `coach-${id}`, chance: 100 } };
    const nextCoaches = selectedCoachId ? coaches.map((coach) => coach.id === selectedCoachId ? nextCoach : coach) : [...coaches, nextCoach];
    const saved = saveEighteenZeroCoaches(nextCoaches);
    setCoaches(saved);
    saveRemote(GAME_DATA_KEYS.eighteenZeroCoaches, saved);
    setSelectedCoachId(id);
    setCoachForm(saved.find((coach) => coach.id === id) || nextCoach);
    setNotice(selectedCoachId ? 'Entrenador actualizado.' : 'Entrenador creado.');
  };

  const deleteCoach = () => {
    const nextCoaches = coaches.filter((coach) => coach.id !== selectedCoachId);
    const savedCoaches = saveEighteenZeroCoaches(nextCoaches);
    setCoaches(savedCoaches);
    saveRemote(GAME_DATA_KEYS.eighteenZeroCoaches, savedCoaches);
    setSelectedCoachId(nextCoaches[0]?.id || '');
    setCoachForm(nextCoaches[0] || emptyCoach);
    setNotice('Entrenador eliminado.');
  };

  const restoreCoaches = () => {
    resetEighteenZeroCoaches();
    setCoaches(defaultCdbCoaches);
    saveRemote(GAME_DATA_KEYS.eighteenZeroCoaches, defaultCdbCoaches);
    setSelectedCoachId(defaultCdbCoaches[0]?.id || '');
    setCoachForm(defaultCdbCoaches[0] || emptyCoach);
    setNotice('Entrenadores restaurados.');
  };

  const savePlayer = () => {
    const normalized = normalizeForm(form);

    if (!normalized.name) {
      setNotice('El jugador necesita nombre antes de guardar.');
      return;
    }

    const exists = players.some((player) => player.id === normalized.id);
    if (exists && !selectedId) {
      setNotice('Ya existe una ficha de este jugador para esa temporada.');
      return;
    }
    const nextPlayers = exists
      ? players.map((player) => (player.id === normalized.id ? normalized : player))
      : [...players, normalized];

    setPlayers(nextPlayers);
    setSelectedId(normalized.id);
    setForm(normalized);
    saveEighteenZeroPlayers(nextPlayers);
    saveRemote(GAME_DATA_KEYS.eighteenZeroPlayers, nextPlayers);
    setNotice(exists ? 'Jugador actualizado.' : 'Jugador creado.');
  };

  const deletePlayer = () => {
    if (!selectedId) return;
    const nextPlayers = players.filter((player) => player.id !== selectedId);
    setPlayers(nextPlayers);
    saveEighteenZeroPlayers(nextPlayers);
    saveRemote(GAME_DATA_KEYS.eighteenZeroPlayers, nextPlayers);
    setSelectedId(nextPlayers[0]?.id || '');
    setForm(nextPlayers[0] || emptyPlayer);
    setNotice('Jugador eliminado del juego 18-0.');
  };

  const resetPlayers = () => {
    resetEighteenZeroPlayers();
    const restoredPlayers = getStoredEighteenZeroPlayers();
    setPlayers(restoredPlayers);
    setSelectedId(restoredPlayers[0]?.id || '');
    setForm(restoredPlayers[0] || emptyPlayer);
    saveRemote(GAME_DATA_KEYS.eighteenZeroPlayers, restoredPlayers);
    setNotice('Datos restaurados a la plantilla base.');
  };

  return (
    <>
      <Helmet>
        <title>Panel 18-0 | La Comunidad del Banquillo</title>
      </Helmet>
      <div className="min-h-screen bg-[#070707] text-white">
        <Header />
        <main className="relative overflow-hidden py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(212,175,55,0.16),transparent_28%),radial-gradient(circle_at_82%_36%,rgba(255,255,255,0.05),transparent_24%)]" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <Link
                to="/panel-control"
                className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-white/70 hover:text-[#d7b23f]"
              >
                <ArrowLeft className="h-5 w-5" />
                Volver al panel
              </Link>
              <Link
                to="/18-0"
                className="inline-flex items-center gap-2 rounded-full border border-[#d7b23f]/40 bg-[#d7b23f]/10 px-4 py-2 text-sm font-black text-[#d7b23f] hover:bg-[#d7b23f]/20"
              >
                <Eye className="h-4 w-4" />
                Ver juego
              </Link>
            </div>

            <section className="mb-8 rounded-[8px] border border-[#d7b23f]/25 bg-[#101010]/90 p-6">
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[#d7b23f]">
                    Juego 18-0
                  </p>
                  <h1 className="mt-2 text-4xl font-black md:text-5xl">Panel de jugadores</h1>
                  <p className="mt-3 max-w-3xl text-sm font-semibold leading-relaxed text-white/65">
                    Crea y ajusta jugadores, precio, temporada, habilidades y texto. De momento se
                    guarda en este navegador para probar la mecánica; después lo llevamos a Supabase.
                  </p>
                </div>
                <div className="rounded-[8px] border border-[#d7b23f]/30 bg-[#d7b23f]/10 px-5 py-4 text-sm font-black">
                  <div className="flex items-center gap-2 text-[#d7b23f]">
                    <ShieldCheck className="h-5 w-5" />
                    Sesión admin
                  </div>
                  <p className="mt-1 text-white">{user?.email}</p>
                  <p className="mt-1 text-xs uppercase text-white/50">{authMode}</p>
                </div>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
              <aside className="rounded-[8px] border border-white/10 bg-[#101010]/90 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-[#d7b23f]">Plantilla</p>
                    <h2 className="text-2xl font-black">{players.length} jugadores</h2>
                  </div>
                  <button
                    type="button"
                    onClick={startNewPlayer}
                    className="inline-flex items-center gap-2 rounded-[8px] bg-[#d7b23f] px-3 py-2 text-xs font-black text-black"
                  >
                    <Plus className="h-4 w-4" />
                    Nuevo
                  </button>
                </div>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar jugador..."
                  className="mb-4 w-full rounded-[8px] border border-white/10 bg-black px-3 py-2 text-sm font-semibold outline-none focus:border-[#d7b23f]"
                />
                <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1">
                  {filteredPlayers.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => selectPlayer(player)}
                      className={`w-full rounded-[8px] border p-3 text-left transition ${
                        player.id === selectedId
                          ? 'border-[#d7b23f] bg-[#d7b23f]/15'
                          : 'border-white/10 bg-black/50 hover:border-[#d7b23f]/50'
                      }`}
                    >
                      <p className="font-black">{player.name}</p>
                      <p className="mt-1 text-xs font-bold uppercase text-white/45">
                        #{player.displayNumber ?? player.number} · {player.position} · {player.season}
                      </p>
                    </button>
                  ))}
                </div>
              </aside>

              <section className="rounded-[8px] border border-white/10 bg-[#101010]/90 p-5">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-xs font-black uppercase text-[#d7b23f]">
                      <SlidersHorizontal className="h-4 w-4" />
                      Editor
                    </p>
                    <h2 className="mt-1 text-3xl font-black">
                      {selectedId ? 'Editar jugador' : 'Nuevo jugador'}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={resetPlayers}
                      className="inline-flex items-center gap-2 rounded-[8px] border border-white/10 px-4 py-2 text-xs font-black text-white/70 hover:border-[#d7b23f]/40 hover:text-[#d7b23f]"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restaurar base
                    </button>
                    {selectedId && (
                      <button
                        type="button"
                        onClick={deletePlayer}
                        className="inline-flex items-center gap-2 rounded-[8px] border border-red-400/30 px-4 py-2 text-xs font-black text-red-200 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={savePlayer}
                      className="inline-flex items-center gap-2 rounded-[8px] bg-[#d7b23f] px-5 py-2 text-xs font-black text-black"
                    >
                      <Save className="h-4 w-4" />
                      Guardar
                    </button>
                  </div>
                </div>

                {notice && (
                  <div className="mb-5 rounded-[8px] border border-[#d7b23f]/30 bg-[#d7b23f]/10 px-4 py-3 text-sm font-bold text-[#f0cf64]">
                    {notice}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase text-white/50">Nombre</span>
                    <input
                      value={form.name}
                      onChange={(event) => updateField('name', event.target.value)}
                      className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-3 font-bold outline-none focus:border-[#d7b23f]"
                    />
                  </label>
                  {selectedId ? (
                    <div className="space-y-2">
                      <span className="text-xs font-black uppercase text-white/50">Jugador vinculado</span>
                      <div className="rounded-[8px] border border-white/10 bg-black/60 px-3 py-3">
                        <p className="font-bold text-white">{linkedPlayer?.name || form.name}</p>
                        <p className="mt-1 text-xs font-medium text-white/40">Todas sus temporadas cuentan como el mismo jugador.</p>
                      </div>
                    </div>
                  ) : (
                    <label className="space-y-2">
                      <span className="text-xs font-black uppercase text-white/50">¿Es otra versión de un jugador?</span>
                      <select
                        value={form.personId || ''}
                        onChange={(event) => {
                          const person = playerPeople.find((item) => item.id === event.target.value);
                          setForm((current) => ({ ...current, personId: event.target.value, name: person?.name || current.name }));
                        }}
                        className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-3 font-bold outline-none focus:border-[#d7b23f]"
                      >
                        <option value="">No, es un jugador nuevo</option>
                        {playerPeople.map((person) => <option key={person.id} value={person.id}>Sí, otra temporada de {person.name}</option>)}
                      </select>
                    </label>
                  )}
                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase text-white/50">Identificador interno</span>
                    <input
                      readOnly
                      value={form.id || `${form.personId || slugify(form.name || 'jugador')}-${slugify(form.season || '2025/26')}`}
                      className="w-full rounded-[8px] border border-white/10 bg-black/60 px-3 py-3 text-sm font-bold text-white/45 outline-none"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase text-white/50">Dorsal</span>
                    <input
                      type="number"
                      value={form.number}
                      onChange={(event) => updateField('number', event.target.value)}
                      className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-3 font-bold outline-none focus:border-[#d7b23f]"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase text-white/50">Temporada</span>
                    <input
                      value={form.season}
                      onChange={(event) => updateField('season', event.target.value)}
                      className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-3 font-bold outline-none focus:border-[#d7b23f]"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase text-white/50">Posición principal</span>
                    <select
                      value={form.position}
                      onChange={(event) => updateField('position', event.target.value)}
                      className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-3 font-bold outline-none focus:border-[#d7b23f]"
                    >
                      {DRAFT_POSITIONS.map((position) => (
                        <option key={position} value={position}>
                          {position}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-5 rounded-[8px] border border-white/10 bg-black/40 p-4">
                  <p className="mb-3 text-xs font-black uppercase text-white/50">
                    Posiciones secundarias
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {DRAFT_POSITIONS.map((position) => (
                      <button
                        key={position}
                        type="button"
                        onClick={() => toggleSecondaryPosition(position)}
                        disabled={position === form.position}
                        className={`rounded-full border px-3 py-2 text-xs font-black ${
                          form.secondaryPositions?.includes(position)
                            ? 'border-[#d7b23f] bg-[#d7b23f]/20 text-[#d7b23f]'
                            : 'border-white/10 text-white/55'
                        } ${position === form.position ? 'cursor-not-allowed opacity-30' : ''}`}
                      >
                        {position}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-[8px] border border-white/10 bg-black/40 p-4">
                  <p className="mb-3 text-xs font-black uppercase text-white/50">
                    Habilidades
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => {
                      const isSelected = form.tags?.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => togglePlayerSkill(skill)}
                          className={`rounded-full border px-3 py-2 text-xs font-black transition ${
                            isSelected
                              ? 'border-[#d7b23f] bg-[#d7b23f]/20 text-[#d7b23f]'
                              : 'border-white/10 text-white/55 hover:border-[#d7b23f]/40 hover:text-[#d7b23f]'
                          }`}
                        >
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs font-semibold text-white/40">
                    La lista de habilidades activas se gestiona en el bloque inferior del panel.
                  </p>
                </div>

                <div className="mt-6">
                  <h3 className="mb-4 text-2xl font-black">Estadísticas</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {statFields.map(([key, label]) => (
                      <label
                        key={key}
                        className="rounded-[8px] border border-white/10 bg-black/40 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between gap-4">
                          <span className="text-sm font-black uppercase text-white/60">{label}</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={form.stats[key]}
                            onChange={(event) => updateStat(key, event.target.value)}
                            className="w-20 rounded-[8px] border border-white/10 bg-black px-2 py-1 text-center font-black outline-none focus:border-[#d7b23f]"
                          />
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={form.stats[key]}
                          onChange={(event) => updateStat(key, event.target.value)}
                          className="w-full accent-[#d7b23f]"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            <section className="mt-8 grid gap-6 xl:grid-cols-3">
              <div className="rounded-[8px] border border-white/10 bg-[#101010]/90 p-5">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="flex items-center gap-2 text-xs font-black uppercase text-[#d7b23f]">
                      <Tags className="h-4 w-4" />
                      Configuración
                    </p>
                    <h2 className="mt-1 text-2xl font-black">Habilidades activas</h2>
                  </div>
                  <button
                    type="button"
                    onClick={restoreSkills}
                    className="rounded-[8px] border border-white/10 px-3 py-2 text-xs font-black text-white/60 hover:border-[#d7b23f]/40 hover:text-[#d7b23f]"
                  >
                    Restaurar
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    value={skillInput}
                    onChange={(event) => setSkillInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') addSkill();
                    }}
                    placeholder="Nueva habilidad"
                    className="min-w-0 flex-1 rounded-[8px] border border-white/10 bg-black px-3 py-3 text-sm font-bold outline-none focus:border-[#d7b23f]"
                  />
                  <button
                    type="button"
                    onClick={addSkill}
                    className="rounded-[8px] bg-[#d7b23f] px-4 py-3 text-xs font-black text-black"
                  >
                    Añadir
                  </button>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-2 rounded-full border border-[#d7b23f]/30 bg-[#d7b23f]/10 px-3 py-2 text-xs font-black text-[#f0cf64]"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="text-white/45 hover:text-red-200"
                        aria-label={`Eliminar ${skill}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[8px] border border-white/10 bg-[#101010]/90 p-5 xl:col-span-2">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="flex items-center gap-2 text-xs font-black uppercase text-[#d7b23f]">
                      <CalendarClock className="h-4 w-4" />
                      Liga municipal
                    </p>
                    <h2 className="mt-1 text-2xl font-black">Eventos de temporada</h2>
                    <p className="mt-2 text-sm font-semibold text-white/50">
                      Cada evento usa una o varias estadísticas y suma o resta su modificador en las secciones correspondientes del resultado.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={restoreEvents}
                      className="rounded-[8px] border border-white/10 px-3 py-2 text-xs font-black text-white/60 hover:border-[#d7b23f]/40 hover:text-[#d7b23f]"
                    >
                      Restaurar
                    </button>
                    <button
                      type="button"
                      onClick={addSeasonEvent}
                      className="rounded-[8px] border border-[#d7b23f]/40 px-3 py-2 text-xs font-black text-[#d7b23f] hover:bg-[#d7b23f]/10"
                    >
                      Nuevo evento
                    </button>
                    <button
                      type="button"
                      onClick={persistEvents}
                      className="rounded-[8px] bg-[#d7b23f] px-4 py-2 text-xs font-black text-black"
                    >
                      Guardar eventos
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {events.map((seasonEvent, index) => (
                    <button
                      key={seasonEvent.id || index}
                      type="button"
                      onClick={() => setSelectedEventId(seasonEvent.id)}
                      className={`rounded-full border px-4 py-2.5 text-left text-xs font-black transition ${
                        selectedEventId === seasonEvent.id
                          ? 'border-[#d7b23f] bg-[#d7b23f]/20 text-[#f0cf64]'
                          : 'border-white/10 bg-black/35 text-white/60 hover:border-[#d7b23f]/40 hover:text-white'
                      }`}
                    >
                      {seasonEvent.name || 'Evento sin nombre'}
                      {seasonEvent.requiredPlayerIds?.length > 0 && ' · Condicionado'}
                    </button>
                  ))}
                </div>

                {selectedEvent && (
                  <div className="mt-5 rounded-[8px] border border-[#d7b23f]/25 bg-black/45 p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase text-[#d7b23f]">Editando evento</p>
                        <h3 className="mt-1 text-xl font-black">{selectedEvent.name || 'Evento sin nombre'}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteSeasonEvent(selectedEventIndex)}
                        className="rounded-[8px] border border-red-400/30 px-3 py-2 text-xs font-black text-red-200 hover:bg-red-500/10"
                      >
                        Eliminar
                      </button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-2"><span className="text-xs font-black uppercase text-white/45">Nombre</span><input value={selectedEvent.name} onChange={(event) => updateEventItem(selectedEventIndex, 'name', event.target.value)} className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2 text-sm font-bold outline-none focus:border-[#d7b23f]" /></label>
                      <label className="space-y-2"><span className="text-xs font-black uppercase text-white/45">Descripción</span><input value={selectedEvent.description} onChange={(event) => updateEventItem(selectedEventIndex, 'description', event.target.value)} className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2 text-sm font-bold outline-none focus:border-[#d7b23f]" /></label>
                    </div>
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-black uppercase text-white/45">Estadísticas que mide</p>
                      <div className="flex flex-wrap gap-2">
                        {eventStatOptions.map(([key, label]) => {
                          const isSelected = selectedEvent.stats?.includes(key);
                          return <button key={key} type="button" onClick={() => toggleEventStat(selectedEventIndex, key)} className={`rounded-full border px-3 py-2 text-xs font-black ${isSelected ? 'border-[#d7b23f] bg-[#d7b23f]/20 text-[#d7b23f]' : 'border-white/10 text-white/50 hover:border-[#d7b23f]/40'}`}>{label}</button>;
                        })}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-4">
                      <label className="space-y-2"><span className="text-xs font-black uppercase text-white/45">Objetivo</span><input type="number" min="0" max="800" value={selectedEvent.target} onChange={(event) => updateEventItem(selectedEventIndex, 'target', clamp(event.target.value, 0, 800))} className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2 text-sm font-black outline-none focus:border-[#d7b23f]" /><span className="block text-[10px] font-bold text-white/35">Máximo 100 por cada estadística seleccionada.</span></label>
                      <label className="space-y-2"><span className="text-xs font-black uppercase text-white/45">Divisor</span><input type="number" value={selectedEvent.divisor} onChange={(event) => updateEventItem(selectedEventIndex, 'divisor', clamp(event.target.value, 1, 20))} className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2 text-sm font-black outline-none focus:border-[#d7b23f]" /></label>
                      <label className="space-y-2 md:col-span-2"><span className="text-xs font-black uppercase text-white/45">Resultado positivo</span><input value={selectedEvent.positiveResult} onChange={(event) => updateEventItem(selectedEventIndex, 'positiveResult', event.target.value)} className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2 text-sm font-bold outline-none focus:border-[#d7b23f]" /></label>
                      <label className="space-y-2 md:col-span-4"><span className="text-xs font-black uppercase text-white/45">Resultado negativo</span><input value={selectedEvent.negativeResult} onChange={(event) => updateEventItem(selectedEventIndex, 'negativeResult', event.target.value)} className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2 text-sm font-bold outline-none focus:border-[#d7b23f]" /></label>
                    </div>
                    <div className="mt-5 rounded-[8px] border border-white/10 bg-black/40 p-4">
                      <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                        <div><p className="text-xs font-black uppercase text-[#d7b23f]">Condiciones de aparición</p><p className="mt-1 text-sm text-white/50">Sin jugadores seleccionados, el evento será general. Si eliges alguno, solo entrará en el sorteo cuando esté en el quinteto.</p></div>
                        <label className="space-y-2"><span className="text-xs font-black uppercase text-white/45">Probabilidad</span><div className="relative"><input type="number" min="0" max="100" value={selectedEvent.chance ?? 100} onChange={(event) => updateEventItem(selectedEventIndex, 'chance', clamp(event.target.value, 0, 100))} className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2 pr-9 text-sm font-black outline-none focus:border-[#d7b23f]" /><span className="absolute right-3 top-2 text-sm font-black text-white/40">%</span></div></label>
                      </div>
                      <label className="mt-4 block max-w-xs space-y-2"><span className="text-xs font-black uppercase text-white/45">Afecta a</span><select value={selectedEvent.playerRequirementScope || 'person'} onChange={(event) => changeEventRequirementScope(selectedEventIndex, event.target.value)} className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2 text-sm font-bold outline-none focus:border-[#d7b23f]"><option value="person">Cualquier temporada del jugador</option><option value="version">Una ficha concreta</option></select></label>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(selectedEvent.playerRequirementScope === 'version' ? players : playerPeople).map((player) => {
                          const requiredId = selectedEvent.playerRequirementScope === 'version' ? player.id : player.id;
                          const required = selectedEvent.requiredPlayerIds?.includes(requiredId);
                          const label = selectedEvent.playerRequirementScope === 'version' ? `${player.name} · ${player.season}` : player.name;
                          return <button key={requiredId} type="button" onClick={() => toggleEventPlayer(selectedEventIndex, requiredId)} className={`rounded-full border px-3 py-2 text-xs font-black transition ${required ? 'border-[#d7b23f] bg-[#d7b23f]/20 text-[#f0cf64]' : 'border-white/10 text-white/50 hover:border-[#d7b23f]/40'}`}>{label}</button>;
                        })}
                      </div>
                      {selectedEvent.requiredPlayerIds?.length > 1 && <label className="mt-4 block max-w-xs space-y-2"><span className="text-xs font-black uppercase text-white/45">Cómo se cumple</span><select value={selectedEvent.requirementMode || 'all'} onChange={(event) => updateEventItem(selectedEventIndex, 'requirementMode', event.target.value)} className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2 text-sm font-bold outline-none focus:border-[#d7b23f]"><option value="all">Deben estar todos</option><option value="any">Basta con cualquiera</option></select></label>}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="mt-6 rounded-[8px] border border-white/10 bg-[#101010]/90 p-5">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-xs font-black uppercase text-[#d7b23f]">
                    <Link2 className="h-4 w-4" />
                    Química jugadores
                  </p>
                  <h2 className="mt-1 text-2xl font-black">Conexiones especiales</h2>
                  <p className="mt-2 text-sm font-semibold text-white/50">
                    Estas uniones funcionan aparte de las habilidades. Si todos los jugadores de la
                    conexión están en el quinteto, se aplica el bonus o penalización.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={restoreChemistryLinks}
                    className="rounded-[8px] border border-white/10 px-3 py-2 text-xs font-black text-white/60 hover:border-[#d7b23f]/40 hover:text-[#d7b23f]"
                  >
                    Restaurar
                  </button>
                  <button
                    type="button"
                    onClick={addChemistryLink}
                    className="rounded-[8px] border border-[#d7b23f]/40 px-3 py-2 text-xs font-black text-[#d7b23f] hover:bg-[#d7b23f]/10"
                  >
                    Nueva conexión
                  </button>
                  <button
                    type="button"
                    onClick={persistChemistryLinks}
                    className="rounded-[8px] bg-[#d7b23f] px-4 py-2 text-xs font-black text-black"
                  >
                    Guardar química
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {chemistryLinks.map((link, index) => (
                  <button
                    key={link.id || index}
                    type="button"
                    onClick={() => setSelectedChemistryId(link.id)}
                    className={`rounded-full border px-4 py-2.5 text-left text-xs font-black transition ${
                      selectedChemistryId === link.id
                        ? 'border-[#d7b23f] bg-[#d7b23f]/20 text-[#f0cf64]'
                        : 'border-white/10 bg-black/35 text-white/60 hover:border-[#d7b23f]/40 hover:text-white'
                    }`}
                  >
                    {link.name || 'Conexión sin nombre'} · {link.playerIds?.length || 2} jugadores
                  </button>
                ))}
              </div>

              {selectedChemistry && (
                <div className="mt-5 rounded-[8px] border border-[#d7b23f]/25 bg-black/45 p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase text-[#d7b23f]">Editando conexión</p>
                      <h3 className="mt-1 text-xl font-black">{selectedChemistry.name || 'Conexión sin nombre'}</h3>
                    </div>
                    <button type="button" onClick={() => deleteChemistryLink(selectedChemistryIndex)} className="rounded-[8px] border border-red-400/30 px-3 py-2 text-xs font-black text-red-200 hover:bg-red-500/10">Eliminar conexión</button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1fr_140px_110px]">
                    <label className="space-y-2"><span className="text-xs font-black uppercase text-white/45">Nombre</span><input value={selectedChemistry.name} onChange={(event) => updateChemistryLink(selectedChemistryIndex, 'name', event.target.value)} className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2 text-sm font-bold outline-none focus:border-[#d7b23f]" /></label>
                    <label className="space-y-2"><span className="text-xs font-black uppercase text-white/45">Jugadores</span><select value={clamp(selectedChemistry.playerIds?.length || 2, 2, 5)} onChange={(event) => updateChemistryPlayerCount(selectedChemistryIndex, event.target.value)} className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2 text-center text-sm font-black outline-none focus:border-[#d7b23f]">{[2, 3, 4, 5].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
                    <label className="space-y-2"><span className="text-xs font-black uppercase text-white/45">Bonus</span><input readOnly value={`+${Math.max(1, (selectedChemistry.playerIds?.length || 2) - 1)}`} className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2 text-center text-sm font-black" /></label>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {Array.from({ length: clamp(selectedChemistry.playerIds?.length || 2, 2, 5) }, (_, playerIndex) => (
                      <label key={playerIndex} className="space-y-2">
                        <span className="text-xs font-black uppercase text-white/45">Jugador {playerIndex + 1}</span>
                        <select value={selectedChemistry.playerIds?.[playerIndex] || ''} onChange={(event) => updateChemistryPlayer(selectedChemistryIndex, playerIndex, event.target.value)} className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2 text-sm font-bold outline-none focus:border-[#d7b23f]">
                          <option value="">Elegir jugador</option>
                          {playerPeople.map((player) => <option key={player.id} value={player.id}>{player.name} · cualquier temporada</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                  <label className="mt-3 block space-y-2"><span className="text-xs font-black uppercase text-white/45">Descripción</span><input value={selectedChemistry.description || ''} onChange={(event) => updateChemistryLink(selectedChemistryIndex, 'description', event.target.value)} className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2 text-sm font-bold outline-none focus:border-[#d7b23f]" /></label>
                </div>
              )}
            </section>

            <section className="mt-6 rounded-[8px] border border-white/10 bg-[#101010]/90 p-5">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div><p className="flex items-center gap-2 text-xs font-black uppercase text-[#d7b23f]"><ClipboardList className="h-4 w-4" /> Sexta elección</p><h2 className="mt-1 text-2xl font-black">Entrenadores</h2><p className="mt-2 text-sm font-semibold text-white/50">Cada entrenador añade siempre su evento. Los otros tres se sortean desde el pool de temporada.</p></div>
                <div className="flex gap-2"><button type="button" onClick={restoreCoaches} className="rounded-[8px] border border-white/10 px-3 py-2 text-xs font-black text-white/60 hover:text-[#d7b23f]">Restaurar</button><button type="button" onClick={startNewCoach} className="rounded-[8px] border border-[#d7b23f]/40 px-3 py-2 text-xs font-black text-[#d7b23f]"><Plus className="mr-1 inline h-4 w-4" /> Nuevo entrenador</button></div>
              </div>
              <div className="flex flex-wrap gap-2">{coaches.map((coach) => <button key={coach.id} type="button" onClick={() => selectCoach(coach)} className={`rounded-full border px-4 py-2.5 text-xs font-black ${selectedCoachId === coach.id ? 'border-[#d7b23f] bg-[#d7b23f]/20 text-[#f0cf64]' : 'border-white/10 bg-black/35 text-white/60 hover:border-[#d7b23f]/40'}`}>{coach.name}</button>)}</div>

              <div className="mt-5 rounded-[8px] border border-[#d7b23f]/25 bg-black/45 p-5">
                <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-black uppercase text-[#d7b23f]">{selectedCoachId ? 'Editando entrenador' : 'Nuevo entrenador'}</p><h3 className="mt-1 text-xl font-black">{coachForm.name || 'Sin nombre'}</h3></div>{selectedCoachId && <button type="button" onClick={deleteCoach} className="rounded-[8px] border border-red-400/30 px-3 py-2 text-xs font-black text-red-200">Eliminar</button>}</div>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="space-y-2"><span className="text-xs font-black uppercase text-white/45">Nombre</span><input value={coachForm.name} onChange={(event) => setCoachForm({ ...coachForm, name: event.target.value })} className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2 text-sm font-bold outline-none focus:border-[#d7b23f]" /></label>
                  <label className="space-y-2"><span className="text-xs font-black uppercase text-white/45">Rol</span><input value={coachForm.role} onChange={(event) => setCoachForm({ ...coachForm, role: event.target.value })} className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2 text-sm font-bold outline-none focus:border-[#d7b23f]" /></label>
                  <label className="space-y-2"><span className="text-xs font-black uppercase text-white/45">Ruta de imagen</span><input value={coachForm.image} onChange={(event) => setCoachForm({ ...coachForm, image: event.target.value })} placeholder="/img/entrenador.png" className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2 text-sm font-bold outline-none focus:border-[#d7b23f]" /></label>
                </div>
                <div className="mt-5 border-t border-white/10 pt-5"><p className="text-xs font-black uppercase text-[#d7b23f]">Evento garantizado · 100%</p><div className="mt-3 grid gap-3 md:grid-cols-2"><label className="space-y-2"><span className="text-xs font-black uppercase text-white/45">Nombre del evento</span><input value={coachForm.event.name} onChange={(event) => updateCoachEvent('name', event.target.value)} className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2 text-sm font-bold outline-none focus:border-[#d7b23f]" /></label><label className="space-y-2"><span className="text-xs font-black uppercase text-white/45">Descripción</span><input value={coachForm.event.description} onChange={(event) => updateCoachEvent('description', event.target.value)} className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2 text-sm font-bold outline-none focus:border-[#d7b23f]" /></label></div>
                  <div className="mt-3 flex flex-wrap gap-2">{eventStatOptions.map(([key, label]) => <button key={key} type="button" onClick={() => toggleCoachEventStat(key)} className={`rounded-full border px-3 py-2 text-xs font-black ${coachForm.event.stats?.includes(key) ? 'border-[#d7b23f] bg-[#d7b23f]/20 text-[#d7b23f]' : 'border-white/10 text-white/50'}`}>{label}</button>)}</div>
                  <div className="mt-3 grid gap-3 md:grid-cols-4"><label className="space-y-2"><span className="text-xs font-black uppercase text-white/45">Objetivo</span><input type="number" value={coachForm.event.target} onChange={(event) => updateCoachEvent('target', Number(event.target.value))} className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2 font-black" /></label><label className="space-y-2"><span className="text-xs font-black uppercase text-white/45">Divisor</span><input type="number" value={coachForm.event.divisor} onChange={(event) => updateCoachEvent('divisor', Number(event.target.value))} className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2 font-black" /></label><label className="space-y-2 md:col-span-2"><span className="text-xs font-black uppercase text-white/45">Resultado positivo</span><input value={coachForm.event.positiveResult} onChange={(event) => updateCoachEvent('positiveResult', event.target.value)} className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2 text-sm font-bold" /></label><label className="space-y-2 md:col-span-4"><span className="text-xs font-black uppercase text-white/45">Resultado negativo</span><input value={coachForm.event.negativeResult} onChange={(event) => updateCoachEvent('negativeResult', event.target.value)} className="w-full rounded-[8px] border border-white/10 bg-black px-3 py-2 text-sm font-bold" /></label></div>
                </div>
                <button type="button" onClick={saveCoach} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#d7b23f] px-4 py-3 text-xs font-black uppercase text-black"><Save className="h-4 w-4" /> Guardar entrenador y evento</button>
              </div>
            </section>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default EighteenZeroAdminPage;
