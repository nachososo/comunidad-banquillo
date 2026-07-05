import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Save, ShieldCheck, UserPlus, UsersRound } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';
import { allPlayers, staff } from '@/data/data.js';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';

const teamOptions = [
  { value: 'masculine', label: 'Masculino' },
  { value: 'feminine', label: 'Femenino' },
  { value: 'staff', label: 'Staff' },
];

const emptyForm = {
  id: null,
  name: '',
  number: '',
  team: 'masculine',
  position: '',
  height: '',
  seniority: '',
  instagram: '',
  poster_url: '',
  profile_text: '',
  active: true,
};

const normalizeInstagram = (value) => value.trim().replace(/^@/, '');

const localPlayers = [
  ...allPlayers.map((player) => ({
    id: player.id,
    name: player.name,
    number: String(player.number ?? ''),
    team: player.team,
    position: player.position || '',
    height: player.height || '',
    seniority: player.antiguedad ? String(player.antiguedad) : '',
    instagram: player.instagram || '',
    poster_url: player.poster || '',
    profile_text: player.profile_text || '',
    active: true,
  })),
  ...staff.map((member) => ({
    id: 900 + member.id,
    name: member.name,
    number: '',
    team: 'staff',
    position: member.role || '',
    height: '',
    seniority: member.antiguedad ? String(member.antiguedad) : '',
    instagram: member.instagram || '',
    poster_url: member.poster || '',
    profile_text: member.profile_text || '',
    active: true,
  })),
];

const getTeamLabel = (team) => teamOptions.find((option) => option.value === team)?.label || team;

const PlayersAdminPage = () => {
  const { authMode, loading, isAuthenticated, isAdmin, user } = useAuth();
  const [players, setPlayers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [savingPlayer, setSavingPlayer] = useState(false);
  const [syncingSeed, setSyncingSeed] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [usingLocalReference, setUsingLocalReference] = useState(false);
  const [teamFilter, setTeamFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');

  const visiblePlayers = useMemo(
    () =>
      [...players].sort((a, b) => {
        const teamOrder = teamOptions.findIndex((option) => option.value === a.team) - teamOptions.findIndex((option) => option.value === b.team);
        if (teamOrder !== 0) return teamOrder;
        return Number(a.number || 999) - Number(b.number || 999) || a.name.localeCompare(b.name);
      }),
    [players],
  );

  const positionOptions = useMemo(() => {
    if (!['masculine', 'feminine'].includes(teamFilter)) return [];
    return Array.from(new Set(
      players
        .filter((player) => player.team === teamFilter && player.position)
        .map((player) => player.position),
    )).sort((first, second) => first.localeCompare(second));
  }, [players, teamFilter]);

  const filteredVisiblePlayers = useMemo(
    () => visiblePlayers.filter((player) => {
      if (teamFilter !== 'all' && player.team !== teamFilter) return false;
      if (['masculine', 'feminine'].includes(teamFilter) && positionFilter !== 'all' && player.position !== positionFilter) return false;
      return true;
    }),
    [positionFilter, teamFilter, visiblePlayers],
  );

  const changeTeamFilter = (nextTeam) => {
    setTeamFilter(nextTeam);
    setPositionFilter('all');
  };

  const teamCounts = useMemo(
    () =>
      players.reduce(
        (counts, player) => ({
          ...counts,
          [player.team]: (counts[player.team] || 0) + 1,
        }),
        {},
      ),
    [players],
  );

  const loadPlayers = async () => {
    setIsLoadingPlayers(true);
    setErrorMessage('');
    setSuccessMessage('');
    setUsingLocalReference(false);

    if (!isSupabaseConfigured) {
      setPlayers(localPlayers);
      setUsingLocalReference(true);
      setIsLoadingPlayers(false);
      return;
    }

    const { data, error } = await supabase
      .from('players')
      .select('id,name,number,team,position,height,seniority,instagram,poster_url,profile_text,active,created_at')
      .order('team', { ascending: true })
      .order('number', { ascending: true });

    if (error) {
      setErrorMessage(`No he podido leer la tabla players: ${error.message}`);
      setPlayers(localPlayers);
      setUsingLocalReference(true);
    } else {
      setPlayers(data || []);
    }

    setIsLoadingPlayers(false);
  };

  useEffect(() => {
    if (loading || !isAuthenticated || !isAdmin) return;
    loadPlayers();
  }, [isAdmin, isAuthenticated, loading]);

  const resetForm = () => setForm(emptyForm);

  const handleEdit = (player) => {
    setForm({
      id: player.id,
      name: player.name || '',
      number: player.number || '',
      team: player.team || 'masculine',
      position: player.position || '',
      height: player.height || '',
      seniority: player.seniority || '',
      instagram: player.instagram || '',
      poster_url: player.poster_url || '',
      profile_text: player.profile_text || '',
      active: player.active !== false,
    });
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSavingPlayer(true);
    setErrorMessage('');
    setSuccessMessage('');

    const payload = {
      name: form.name.trim(),
      number: form.number.trim() || null,
      team: form.team,
      position: form.position.trim() || null,
      height: form.height.trim() || null,
      seniority: form.seniority.trim() || null,
      instagram: normalizeInstagram(form.instagram) || null,
      poster_url: form.poster_url.trim() || null,
      profile_text: form.profile_text.trim() || null,
      active: form.active,
    };

    if (!payload.name) {
      setErrorMessage('El nombre es obligatorio.');
      setSavingPlayer(false);
      return;
    }

    if (!isSupabaseConfigured || usingLocalReference) {
      if (form.id) {
        setPlayers((currentPlayers) =>
          currentPlayers.map((player) => (player.id === form.id ? { ...player, ...payload } : player)),
        );
        setSuccessMessage('Perfil actualizado en vista local. Para guardarlo definitivo lo conectamos a Supabase.');
      } else {
        setPlayers((currentPlayers) => [{ ...payload, id: Date.now() }, ...currentPlayers]);
        setSuccessMessage('Perfil creado en vista local. Para guardarlo definitivo lo conectamos a Supabase.');
      }
      resetForm();
      setSavingPlayer(false);
      return;
    }

    const query = form.id
      ? supabase.from('players').update(payload).eq('id', form.id).select().single()
      : supabase.from('players').insert(payload).select().single();

    const { data, error } = await query;

    if (error) {
      setErrorMessage(error.message);
    } else if (form.id) {
      setPlayers((currentPlayers) => currentPlayers.map((player) => (player.id === form.id ? data : player)));
      setSuccessMessage('Perfil actualizado correctamente.');
      resetForm();
    } else {
      setPlayers((currentPlayers) => [data, ...currentPlayers]);
      setSuccessMessage('Perfil creado correctamente.');
      resetForm();
    }

    setSavingPlayer(false);
  };

  const toggleActive = async (player) => {
    const nextActive = player.active === false;
    setErrorMessage('');
    setSuccessMessage('');

    if (!isSupabaseConfigured || usingLocalReference) {
      setPlayers((currentPlayers) =>
        currentPlayers.map((currentPlayer) =>
          currentPlayer.id === player.id ? { ...currentPlayer, active: nextActive } : currentPlayer,
        ),
      );
      return;
    }

    const { error } = await supabase.from('players').update({ active: nextActive }).eq('id', player.id);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setPlayers((currentPlayers) =>
        currentPlayers.map((currentPlayer) =>
          currentPlayer.id === player.id ? { ...currentPlayer, active: nextActive } : currentPlayer,
        ),
      );
    }
  };

  const seedCurrentRoster = async () => {
    if (!isSupabaseConfigured) {
      setErrorMessage('Para importar la plantilla actual hace falta tener Supabase configurado.');
      return;
    }

    setSyncingSeed(true);
    setErrorMessage('');
    setSuccessMessage('');

    const payload = localPlayers.map((player) => ({
      id: player.id,
      name: player.name,
      number: player.number || null,
      team: player.team,
      position: player.position || null,
      height: player.height || null,
      seniority: player.seniority || null,
      instagram: player.instagram || null,
      poster_url: player.poster_url || null,
      profile_text: player.profile_text || null,
      active: player.active,
    }));

    const { error } = await supabase.from('players').upsert(payload, { onConflict: 'id' });

    if (error) {
      setErrorMessage(error.message);
    } else {
      setSuccessMessage('Plantilla actual importada a Supabase.');
      await loadPlayers();
    }

    setSyncingSeed(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4">
          <p className="text-sm font-black uppercase text-[hsl(43_65%_52%)]">Cargando plantillas...</p>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/mi-cuenta" replace />;

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Helmet>
        <title>Plantillas - Panel de control</title>
        <meta name="description" content="Gestión de plantillas del club." />
      </Helmet>

      <Header />

      <main className="flex-1 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            to="/panel-control"
            className="mb-5 inline-flex items-center gap-2 text-sm font-black uppercase text-gray-400 transition hover:text-[hsl(43_65%_52%)]"
          >
            <ArrowLeft size={17} />
            Volver al panel
          </Link>

          <section className="mb-6 grid gap-4 rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <span className="text-sm font-bold uppercase text-[hsl(43_65%_52%)]">Panel de control</span>
              <h1 className="mt-2 text-white">Plantillas</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-400">
                Gestiona jugadores, jugadoras y staff desde un único sitio. La tabla pública ya está preparada para leer
                estos datos cuando hagamos el siguiente paso de conexión.
              </p>
            </div>

            <div className="rounded-xl border border-[hsl(43_65%_52%_/_0.25)] bg-[hsl(43_65%_52%_/_0.08)] p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck size={22} className="text-[hsl(43_65%_52%)]" />
                <div>
                  <p className="text-xs font-bold uppercase text-gray-500">
                    Backend · {authMode === 'supabase' ? 'Supabase' : 'Local'}
                  </p>
                  <p className="text-sm font-black text-white">{user.email}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-6 grid gap-3 md:grid-cols-4">
            {teamOptions.map((team) => (
              <article key={team.value} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-black uppercase text-gray-500">{team.label}</p>
                <p className="mt-2 text-3xl font-black text-white">{teamCounts[team.value] || 0}</p>
              </article>
            ))}
            <article className="rounded-xl border border-[hsl(43_65%_52%_/_0.35)] bg-[hsl(43_65%_52%_/_0.08)] p-4">
              <p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">Total</p>
              <p className="mt-2 text-3xl font-black text-white">{players.length}</p>
            </article>
          </section>

          {errorMessage && (
            <p className="mb-4 rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
              {errorMessage}
            </p>
          )}

          {successMessage && (
            <p className="mb-4 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-100">
              {successMessage}
            </p>
          )}

          {usingLocalReference && (
            <p className="mb-4 rounded-lg border border-[hsl(43_65%_52%_/_0.25)] bg-[hsl(43_65%_52%_/_0.08)] px-4 py-3 text-sm font-bold text-[hsl(43_65%_72%)]">
              Estás viendo la plantilla actual de la web como referencia local. Cuando la tabla `players` esté lista en
              Supabase, podrás guardar cambios reales desde aquí.
            </p>
          )}

          <section className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
            <form
              onSubmit={handleSubmit}
              className="rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-5"
            >
              <div className="mb-5 flex items-center gap-3">
                <UserPlus size={22} className="text-[hsl(43_65%_52%)]" />
                <div>
                  <p className="text-xs font-bold uppercase text-[hsl(43_65%_52%)]">
                    {form.id ? 'Editar perfil' : 'Nuevo perfil'}
                  </p>
                  <h2 className="text-xl font-black text-white">Datos principales</h2>
                </div>
              </div>

              <div className="grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase text-gray-500">Nombre</span>
                  <input
                    value={form.name}
                    onChange={(event) => setForm((currentForm) => ({ ...currentForm, name: event.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-[hsl(43_65%_52%)]"
                    placeholder="Nombre y apellidos"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase text-gray-500">Equipo</span>
                    <select
                      value={form.team}
                      onChange={(event) => setForm((currentForm) => ({ ...currentForm, team: event.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-[hsl(43_65%_52%)]"
                    >
                      {teamOptions.map((team) => (
                        <option key={team.value} value={team.value} className="bg-[#111] text-white">
                          {team.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase text-gray-500">Dorsal</span>
                    <input
                      value={form.number}
                      onChange={(event) => setForm((currentForm) => ({ ...currentForm, number: event.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-[hsl(43_65%_52%)]"
                      placeholder="Ej. 14"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase text-gray-500">Posición / rol</span>
                    <input
                      value={form.position}
                      onChange={(event) => setForm((currentForm) => ({ ...currentForm, position: event.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-[hsl(43_65%_52%)]"
                      placeholder="Base, Pívot, Entrenador..."
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase text-gray-500">Altura</span>
                    <input
                      value={form.height}
                      onChange={(event) => setForm((currentForm) => ({ ...currentForm, height: event.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-[hsl(43_65%_52%)]"
                      placeholder="Ej. 1.83m"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase text-gray-500">Antigüedad</span>
                    <input
                      value={form.seniority}
                      onChange={(event) => setForm((currentForm) => ({ ...currentForm, seniority: event.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-[hsl(43_65%_52%)]"
                      placeholder="Ej. 2 años o Fundador"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase text-gray-500">Instagram</span>
                    <input
                      value={form.instagram}
                      onChange={(event) => setForm((currentForm) => ({ ...currentForm, instagram: event.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-[hsl(43_65%_52%)]"
                      placeholder="@usuario"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase text-gray-500">Imagen / poster</span>
                  <input
                    value={form.poster_url}
                    onChange={(event) => setForm((currentForm) => ({ ...currentForm, poster_url: event.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-[hsl(43_65%_52%)]"
                    placeholder="/img/jugador.png o URL"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase text-gray-500">Texto del perfil</span>
                  <textarea
                    value={form.profile_text}
                    onChange={(event) =>
                      setForm((currentForm) => ({ ...currentForm, profile_text: event.target.value }))
                    }
                    rows={7}
                    className="w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-semibold leading-relaxed text-white outline-none transition focus:border-[hsl(43_65%_52%)]"
                    placeholder={`Escribe aquí el texto que aparecerá en Perfil de ${form.name || 'esta persona'}. Deja una línea en blanco para separar párrafos.`}
                  />
                </label>

                <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(event) => setForm((currentForm) => ({ ...currentForm, active: event.target.checked }))}
                    className="h-4 w-4 accent-[hsl(43_65%_52%)]"
                  />
                  <span className="text-sm font-bold text-white">Perfil visible</span>
                </label>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="submit"
                  disabled={savingPlayer}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(43_65%_52%)] px-4 py-3 text-sm font-black uppercase text-black transition hover:bg-[hsl(43_65%_60%)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={17} />
                  {savingPlayer ? 'Guardando' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-black uppercase text-white transition hover:border-[hsl(43_65%_52%_/_0.65)]"
                >
                  Limpiar
                </button>
              </div>
            </form>

            <section className="rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90">
              <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <UsersRound size={22} className="text-[hsl(43_65%_52%)]" />
                  <div>
                    <p className="text-xs font-bold uppercase text-[hsl(43_65%_52%)]">Plantilla</p>
                    <h2 className="text-xl font-black text-white">Perfiles disponibles</h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={seedCurrentRoster}
                  disabled={syncingSeed || !isSupabaseConfigured}
                  className="rounded-lg border border-[hsl(43_65%_52%_/_0.45)] bg-[hsl(43_65%_52%_/_0.08)] px-4 py-3 text-xs font-black uppercase text-[hsl(43_65%_72%)] transition hover:bg-[hsl(43_65%_52%_/_0.14)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {syncingSeed ? 'Importando...' : 'Importar plantilla actual'}
                </button>
              </div>

              <div className="border-b border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    ['all', 'Todos'],
                    ['masculine', 'Plantilla masculina'],
                    ['feminine', 'Plantilla femenina'],
                    ['staff', 'Staff'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => changeTeamFilter(value)}
                      className={`rounded-full border px-3 py-2 text-xs font-black uppercase transition ${teamFilter === value
                        ? 'border-[hsl(43_65%_52%)] bg-[hsl(43_65%_52%_/_0.18)] text-[hsl(43_65%_68%)]'
                        : 'border-white/10 bg-white/5 text-gray-400 hover:border-[hsl(43_65%_52%_/_0.45)] hover:text-white'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {['masculine', 'feminine'].includes(teamFilter) && (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex items-center gap-3">
                      <span className="text-xs font-black uppercase text-gray-500">Posición</span>
                      <select
                        value={positionFilter}
                        onChange={(event) => setPositionFilter(event.target.value)}
                        className="min-h-10 rounded-lg border border-white/10 bg-[#111] px-3 text-sm font-bold text-white outline-none focus:border-[hsl(43_65%_52%)]"
                      >
                        <option value="all">Todas las posiciones</option>
                        {positionOptions.map((position) => <option key={position} value={position}>{position}</option>)}
                      </select>
                    </label>
                    <p className="text-xs font-bold text-gray-500">{filteredVisiblePlayers.length} perfiles mostrados</p>
                  </div>
                )}
              </div>

              {isLoadingPlayers ? (
                <div className="p-8 text-center">
                  <p className="text-sm font-black uppercase text-gray-400">Cargando perfiles...</p>
                </div>
              ) : filteredVisiblePlayers.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm font-black uppercase text-gray-400">No hay perfiles con estos filtros.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {filteredVisiblePlayers.map((player) => (
                    <article
                      key={`${player.team}-${player.id}`}
                      className={`grid gap-4 p-4 md:grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(90px,0.35fr))_minmax(155px,0.5fr)] md:items-center ${
                        player.active === false ? 'opacity-55' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-black text-white">{player.name}</h3>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black uppercase text-gray-400">
                            {getTeamLabel(player.team)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-400">
                          {player.number ? `#${player.number}` : 'Sin dorsal'} · {player.position || 'Sin posición'}
                        </p>
                        {player.instagram && (
                          <p className="mt-1 text-xs font-bold text-[hsl(43_65%_62%)]">@{player.instagram}</p>
                        )}
                        {player.profile_text && (
                          <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-emerald-300">
                            Texto de perfil añadido
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase text-gray-500">Altura</p>
                        <p className="mt-1 text-sm font-black text-white">{player.height || '-'}</p>
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase text-gray-500">Antigüedad</p>
                        <p className="mt-1 text-sm font-black text-white">{player.seniority || '-'}</p>
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase text-gray-500">Estado</p>
                        <p className="mt-1 text-sm font-black text-white">
                          {player.active === false ? 'Oculto' : 'Visible'}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 md:justify-end">
                        <button
                          type="button"
                          onClick={() => handleEdit(player)}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black uppercase text-white transition hover:border-[hsl(43_65%_52%_/_0.65)]"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(player)}
                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs font-black uppercase text-white transition hover:border-[hsl(43_65%_52%_/_0.65)]"
                        >
                          {player.active === false ? <Eye size={14} /> : <EyeOff size={14} />}
                          {player.active === false ? 'Activar' : 'Ocultar'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PlayersAdminPage;
