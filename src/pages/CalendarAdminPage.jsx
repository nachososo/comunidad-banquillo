import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock, Database, Eye, MapPin, Plus, RefreshCw, Save, ShieldCheck, Trash2 } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';
import { matches as staticMatches } from '@/data/data.js';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import {
  createStatsSeason,
  deleteStatsSeason,
  loadStatsCaptureSettings,
  loadStatsSeasons,
} from '@/lib/statsCaptureRepository.js';

const teamOptions = [
  { value: 'masculine', label: 'Masculino' },
  { value: 'feminine', label: 'Femenino' },
];

const statusOptions = [
  { value: 'scheduled', label: 'Programado' },
  { value: 'finished', label: 'Finalizado' },
  { value: 'postponed', label: 'Aplazado' },
  { value: 'cancelled', label: 'Cancelado' },
];

const emptyForm = {
  id: null,
  team: 'masculine',
  season: '2025-2026',
  phase: 'Fase 1',
  match_date: '',
  match_time: '',
  rival: '',
  venue: 'JDM Distrito Barajas',
  court: 'Barajas P1',
  our_score: '',
  rival_score: '',
  status: 'scheduled',
};

const parseResult = (result) => {
  if (!result || !String(result).includes('-')) {
    return { our_score: null, rival_score: null };
  }

  const [ourScore, rivalScore] = String(result).split('-').map((score) => Number(score.trim()));

  return {
    our_score: Number.isFinite(ourScore) ? ourScore : null,
    rival_score: Number.isFinite(rivalScore) ? rivalScore : null,
  };
};

const localMatches = staticMatches.map((match) => {
  const { our_score, rival_score } = parseResult(match.result);

  return {
    id: match.id,
    team: match.team,
    season: match.season,
    phase: match.phase || 'Fase 1',
    match_date: match.date,
    match_time: match.time || null,
    rival: match.rival,
    venue: 'JDM Distrito Barajas',
    court: match.venue || '',
    our_score,
    rival_score,
    status: match.result ? 'finished' : 'scheduled',
    created_at: null,
  };
});
const localSeasons = Array.from(new Set(localMatches.map((match) => match.season).filter(Boolean))).sort();

const normalizeMatch = (match) => ({
  id: match.id,
  team: match.team || 'masculine',
  season: match.season || '2025-2026',
  phase: match.phase || 'Fase 1',
  match_date: match.match_date || match.date || '',
  match_time: match.match_time ? String(match.match_time).slice(0, 5) : match.time || '',
  rival: match.rival || '',
  venue: match.venue || 'JDM Distrito Barajas',
  court: match.court || match.venue || '',
  our_score: match.our_score ?? parseResult(match.result).our_score,
  rival_score: match.rival_score ?? parseResult(match.result).rival_score,
  status: match.status || (match.result ? 'finished' : 'scheduled'),
  created_at: match.created_at || null,
});

const buildPayload = (form) => ({
  team: form.team,
  season: form.season.trim(),
  phase: form.phase.trim() || null,
  match_date: form.match_date,
  match_time: form.match_time || null,
  rival: form.rival.trim(),
  venue: form.venue.trim() || null,
  court: form.court.trim() || null,
  our_score: form.our_score === '' ? null : Number(form.our_score),
  rival_score: form.rival_score === '' ? null : Number(form.rival_score),
  status: form.status,
});

const formatMatchDate = (value) => {
  if (!value) return 'Sin fecha';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getTeamLabel = (team) => teamOptions.find((option) => option.value === team)?.label || team;
const getStatusLabel = (status) => statusOptions.find((option) => option.value === status)?.label || status;

const CalendarAdminPage = () => {
  const { authMode, loading, isAuthenticated, isAdmin, user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [savingMatch, setSavingMatch] = useState(false);
  const [syncingSeed, setSyncingSeed] = useState(false);
  const [usingLocalReference, setUsingLocalReference] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [seasons, setSeasons] = useState(localSeasons);
  const [seasonFilter, setSeasonFilter] = useState('all');
  const [newSeason, setNewSeason] = useState('');
  const [activeStatsSeason, setActiveStatsSeason] = useState('2025-2026');
  const [savingSeason, setSavingSeason] = useState(false);

  const filteredMatches = useMemo(
    () => seasonFilter === 'all' ? matches : matches.filter((match) => match.season === seasonFilter),
    [matches, seasonFilter],
  );

  const sortedMatches = useMemo(
    () =>
      [...filteredMatches].sort((a, b) => {
        const dateOrder = String(b.match_date || '').localeCompare(String(a.match_date || ''));
        if (dateOrder !== 0) return dateOrder;
        return String(b.match_time || '').localeCompare(String(a.match_time || ''));
      }),
    [filteredMatches],
  );

  const seasonGroups = useMemo(() => {
    return sortedMatches.reduce((groups, match) => {
      const key = `${match.team}-${match.season}-${match.phase || 'Sin fase'}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          team: match.team,
          season: match.season,
          phase: match.phase || 'Sin fase',
          matches: [],
        };
      }
      groups[key].matches.push(match);
      return groups;
    }, {});
  }, [sortedMatches]);

  const summary = useMemo(
    () => ({
      total: matches.length,
      finished: matches.filter((match) => match.status === 'finished').length,
      scheduled: matches.filter((match) => match.status === 'scheduled').length,
      seasons: seasons.length,
    }),
    [matches, seasons],
  );

  const loadMatches = async () => {
    setIsLoadingMatches(true);
    setErrorMessage('');
    setSuccessMessage('');
    setUsingLocalReference(false);

    if (!isSupabaseConfigured) {
      setMatches(localMatches);
      setSeasons(localSeasons);
      setUsingLocalReference(true);
      setIsLoadingMatches(false);
      return;
    }

    const [matchesResponse, seasonOptions, settings] = await Promise.all([
      supabase
        .from('matches')
        .select('id,team,season,phase,match_date,match_time,rival,venue,court,our_score,rival_score,status,created_at')
        .order('match_date', { ascending: false })
        .order('match_time', { ascending: false }),
      loadStatsSeasons(localSeasons),
      loadStatsCaptureSettings(),
    ]);

    const { data, error } = matchesResponse;
    setSeasons(seasonOptions);
    setActiveStatsSeason(settings.activeSeason);

    if (error) {
      setErrorMessage(`No he podido leer la tabla matches: ${error.message}`);
      setMatches(localMatches);
      setUsingLocalReference(true);
    } else {
      setMatches((data || []).map(normalizeMatch));
    }

    setIsLoadingMatches(false);
  };

  useEffect(() => {
    if (loading || !isAuthenticated || !isAdmin) return;
    loadMatches();
  }, [isAdmin, isAuthenticated, loading]);

  const resetForm = () => setForm({
    ...emptyForm,
    season: seasonFilter === 'all' ? activeStatsSeason : seasonFilter,
  });

  const addSeason = async () => {
    const normalizedSeason = newSeason.trim().replace('/', '-');
    const match = normalizedSeason.match(/^(\d{4})-(\d{4})$/);
    if (!match || Number(match[2]) !== Number(match[1]) + 1) {
      setErrorMessage('Usa el formato 2026-2027 y asegúrate de que sean años consecutivos.');
      return;
    }
    if (seasons.includes(normalizedSeason)) {
      setErrorMessage('Esa temporada ya existe.');
      return;
    }

    setSavingSeason(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const savedSeason = await createStatsSeason({ season: normalizedSeason, userId: user?.id });
      setSeasons((current) => [...current, savedSeason].sort());
      setForm((current) => ({ ...current, season: savedSeason }));
      setNewSeason('');
      setSuccessMessage(`Temporada ${savedSeason.replace('-', '/')} añadida.`);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSavingSeason(false);
    }
  };

  const removeSeason = async (season) => {
    if (season === activeStatsSeason) {
      setErrorMessage('No puedes borrar la temporada activa de la App de estadísticas. Activa otra primero.');
      return;
    }
    if (matches.some((match) => match.season === season)) {
      setErrorMessage('No puedes borrar una temporada que todavía tiene partidos. Mueve primero esos partidos a otra temporada.');
      return;
    }
    if (seasons.length <= 1) {
      setErrorMessage('Debe existir al menos una temporada.');
      return;
    }

    setSavingSeason(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await deleteStatsSeason(season);
      const nextSeasons = seasons.filter((candidate) => candidate !== season);
      setSeasons(nextSeasons);
      if (seasonFilter === season) setSeasonFilter('all');
      if (form.season === season) setForm((current) => ({ ...current, season: nextSeasons[0] }));
      setSuccessMessage(`Temporada ${season.replace('-', '/')} eliminada.`);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSavingSeason(false);
    }
  };

  const handleEdit = (match) => {
    setForm({
      id: match.id,
      team: match.team || 'masculine',
      season: match.season || '2025-2026',
      phase: match.phase || '',
      match_date: match.match_date || '',
      match_time: match.match_time || '',
      rival: match.rival || '',
      venue: match.venue || '',
      court: match.court || '',
      our_score: match.our_score ?? '',
      rival_score: match.rival_score ?? '',
      status: match.status || 'scheduled',
    });
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSavingMatch(true);
    setErrorMessage('');
    setSuccessMessage('');

    const payload = buildPayload(form);

    if (!payload.season || !payload.match_date || !payload.rival) {
      setErrorMessage('Temporada, fecha y rival son obligatorios.');
      setSavingMatch(false);
      return;
    }

    if (payload.our_score !== null && !Number.isFinite(payload.our_score)) {
      setErrorMessage('Los puntos de La Comunidad deben ser un número.');
      setSavingMatch(false);
      return;
    }

    if (payload.rival_score !== null && !Number.isFinite(payload.rival_score)) {
      setErrorMessage('Los puntos del rival deben ser un número.');
      setSavingMatch(false);
      return;
    }

    if (!isSupabaseConfigured || usingLocalReference) {
      if (form.id) {
        setMatches((currentMatches) =>
          currentMatches.map((match) => (match.id === form.id ? normalizeMatch({ ...match, ...payload }) : match)),
        );
        setSuccessMessage('Partido actualizado en vista local. Para guardarlo definitivo lo conectamos a Supabase.');
      } else {
        setMatches((currentMatches) => [normalizeMatch({ ...payload, id: Date.now() }), ...currentMatches]);
        setSuccessMessage('Partido creado en vista local. Para guardarlo definitivo lo conectamos a Supabase.');
      }
      resetForm();
      setSavingMatch(false);
      return;
    }

    const query = form.id
      ? supabase.from('matches').update(payload).eq('id', form.id).select().single()
      : supabase.from('matches').insert(payload).select().single();

    const { data, error } = await query;

    if (error) {
      setErrorMessage(error.message);
    } else if (form.id) {
      setMatches((currentMatches) => currentMatches.map((match) => (match.id === form.id ? normalizeMatch(data) : match)));
      setSuccessMessage('Partido actualizado correctamente.');
      resetForm();
    } else {
      setMatches((currentMatches) => [normalizeMatch(data), ...currentMatches]);
      setSuccessMessage('Partido creado correctamente.');
      resetForm();
    }

    setSavingMatch(false);
  };

  const seedCurrentCalendar = async () => {
    if (!isSupabaseConfigured) {
      setErrorMessage('Para importar el calendario actual hace falta tener Supabase configurado.');
      return;
    }

    setSyncingSeed(true);
    setErrorMessage('');
    setSuccessMessage('');

    const payload = localMatches.map((match) => ({
      id: match.id,
      team: match.team,
      season: match.season,
      phase: match.phase,
      match_date: match.match_date,
      match_time: match.match_time,
      rival: match.rival,
      venue: match.venue,
      court: match.court,
      our_score: match.our_score,
      rival_score: match.rival_score,
      status: match.status,
    }));

    const { error } = await supabase.from('matches').upsert(payload, { onConflict: 'id' });

    if (error) {
      setErrorMessage(error.message);
    } else {
      setSuccessMessage('Calendario actual importado en Supabase.');
      await loadMatches();
    }

    setSyncingSeed(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Header />
        <main className="container mx-auto px-4 py-24 text-gray-300">Cargando panel...</main>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Helmet>
        <title>Calendario | Panel de control</title>
      </Helmet>
      <Header />

      <main className="container mx-auto px-4 py-24">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link to="/panel-control" className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-400 transition-smooth hover:text-[hsl(43_65%_52%)]">
            <ArrowLeft size={18} />
            Volver al panel
          </Link>

          <div className="rounded-lg border border-[hsl(43_65%_52%_/_0.35)] bg-[hsl(43_65%_52%_/_0.12)] px-4 py-3 text-xs font-bold uppercase tracking-wide text-[hsl(43_65%_52%)]">
            <ShieldCheck size={16} className="mr-2 inline" />
            Sesión admin: {user?.email || authMode}
          </div>
        </div>

        <section className="mb-8 rounded-xl border border-[hsl(43_65%_52%_/_0.28)] bg-[#101010] p-6 md:p-8">
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-[hsl(43_65%_52%)]">Administración</p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="mb-3 text-4xl font-black md:text-6xl">Calendario</h1>
              <p className="max-w-3xl text-gray-400">
                Crea partidos, separa temporadas y fases, actualiza resultados y deja preparada la información que alimentará el calendario público.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={loadMatches}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition-smooth hover:border-[hsl(43_65%_52%_/_0.45)]"
              >
                <RefreshCw size={16} />
                Recargar
              </button>
              <button
                type="button"
                onClick={seedCurrentCalendar}
                disabled={syncingSeed}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(43_65%_52%)] px-4 py-3 text-sm font-black text-black transition-smooth hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Database size={16} />
                {syncingSeed ? 'Importando...' : 'Importar calendario actual'}
              </button>
            </div>
          </div>
        </section>

        {(errorMessage || successMessage || usingLocalReference) && (
          <div className="mb-6 space-y-3">
            {errorMessage && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{errorMessage}</div>}
            {successMessage && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                <CheckCircle2 size={16} className="mr-2 inline" />
                {successMessage}
              </div>
            )}
            {usingLocalReference && (
              <div className="rounded-lg border border-yellow-500/25 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
                Estoy mostrando el calendario local como referencia. Cuando Supabase esté disponible, se guardará en la tabla real.
              </div>
            )}
          </div>
        )}

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          {[
            ['Partidos', summary.total],
            ['Finalizados', summary.finished],
            ['Programados', summary.scheduled],
            ['Temporadas', summary.seasons],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-[hsl(43_65%_52%_/_0.22)] bg-[#0d0d0d] p-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">{label}</p>
              <p className="text-3xl font-black">{value}</p>
            </div>
          ))}
        </section>

        <section className="mb-6 rounded-xl border border-[hsl(43_65%_52%_/_0.22)] bg-[#101010] p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[hsl(43_65%_52%)]">Configuración</p>
              <h2 className="mt-1 text-xl font-black">Gestionar temporadas</h2>
              <p className="mt-1 text-sm text-gray-500">Añade temporadas para el calendario y la App de estadísticas.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {seasons.map((season) => (
                  <span key={season} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-2 text-xs font-black text-gray-200">
                    {season.replace('-', '/')}
                    {season === activeStatsSeason && <span className="text-[10px] uppercase text-emerald-300">Activa</span>}
                    <button
                      type="button"
                      disabled={savingSeason}
                      onClick={() => removeSeason(season)}
                      className="text-gray-500 transition hover:text-red-300 disabled:opacity-40"
                      aria-label={`Eliminar temporada ${season}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
              <input
                value={newSeason}
                onChange={(event) => setNewSeason(event.target.value)}
                placeholder="2026-2027"
                className="min-h-11 rounded-lg border border-white/10 bg-black px-4 text-sm font-bold text-white outline-none focus:border-[hsl(43_65%_52%)] sm:w-52"
              />
              <button
                type="button"
                disabled={savingSeason}
                onClick={addSeason}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[hsl(43_65%_52%)] px-4 text-sm font-black text-black disabled:opacity-50"
              >
                <Plus size={16} /> Añadir temporada
              </button>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-xl border border-[hsl(43_65%_52%_/_0.22)] bg-[#101010] p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-lg border border-[hsl(43_65%_52%_/_0.35)] bg-[hsl(43_65%_52%_/_0.12)] p-2 text-[hsl(43_65%_52%)]">
                <CalendarDays size={18} />
              </div>
              <div>
                <h2 className="text-xl font-black">{form.id ? 'Editar partido' : 'Nuevo partido'}</h2>
                <p className="text-sm text-gray-500">Temporada, fase, rival y resultado.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-2 text-sm font-bold text-gray-300">Equipo<select value={form.team} onChange={(event) => setForm({ ...form, team: event.target.value })} className="w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-white outline-none focus:border-[hsl(43_65%_52%)]">{teamOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                <label className="space-y-2 text-sm font-bold text-gray-300">Estado<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-white outline-none focus:border-[hsl(43_65%_52%)]">{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                <label className="space-y-2 text-sm font-bold text-gray-300">Temporada<select value={form.season} onChange={(event) => setForm({ ...form, season: event.target.value })} className="w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-white outline-none focus:border-[hsl(43_65%_52%)]">{seasons.map((season) => <option key={season} value={season}>{season.replace('-', '/')}</option>)}</select></label>
                <label className="space-y-2 text-sm font-bold text-gray-300">Fase<input value={form.phase} onChange={(event) => setForm({ ...form, phase: event.target.value })} className="w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-white outline-none focus:border-[hsl(43_65%_52%)]" /></label>
                <label className="space-y-2 text-sm font-bold text-gray-300">Fecha<input type="date" value={form.match_date} onChange={(event) => setForm({ ...form, match_date: event.target.value })} className="w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-white outline-none focus:border-[hsl(43_65%_52%)]" /></label>
                <label className="space-y-2 text-sm font-bold text-gray-300">Hora<input type="time" value={form.match_time} onChange={(event) => setForm({ ...form, match_time: event.target.value })} className="w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-white outline-none focus:border-[hsl(43_65%_52%)]" /></label>
                <label className="space-y-2 text-sm font-bold text-gray-300 md:col-span-2">Rival<input value={form.rival} onChange={(event) => setForm({ ...form, rival: event.target.value })} className="w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-white outline-none focus:border-[hsl(43_65%_52%)]" /></label>
                <label className="space-y-2 text-sm font-bold text-gray-300">Lugar<input value={form.venue} onChange={(event) => setForm({ ...form, venue: event.target.value })} className="w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-white outline-none focus:border-[hsl(43_65%_52%)]" /></label>
                <label className="space-y-2 text-sm font-bold text-gray-300">Pista<input value={form.court} onChange={(event) => setForm({ ...form, court: event.target.value })} className="w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-white outline-none focus:border-[hsl(43_65%_52%)]" /></label>
                <label className="space-y-2 text-sm font-bold text-gray-300">Puntos CDB<input type="number" value={form.our_score} onChange={(event) => setForm({ ...form, our_score: event.target.value })} className="w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-white outline-none focus:border-[hsl(43_65%_52%)]" /></label>
                <label className="space-y-2 text-sm font-bold text-gray-300">Puntos rival<input type="number" value={form.rival_score} onChange={(event) => setForm({ ...form, rival_score: event.target.value })} className="w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-white outline-none focus:border-[hsl(43_65%_52%)]" /></label>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button type="submit" disabled={savingMatch} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(43_65%_52%)] px-5 py-3 text-sm font-black text-black transition-smooth hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
                  <Save size={16} />
                  {savingMatch ? 'Guardando...' : 'Guardar partido'}
                </button>
                <button type="button" onClick={resetForm} className="rounded-lg border border-white/10 px-5 py-3 text-sm font-bold text-gray-300 transition-smooth hover:border-white/25">
                  Limpiar
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-xl border border-[hsl(43_65%_52%_/_0.22)] bg-[#101010] p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">Partidos creados</h2>
                <p className="text-sm text-gray-500">Agrupados por equipo, temporada y fase.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select value={seasonFilter} onChange={(event) => setSeasonFilter(event.target.value)} className="rounded-lg border border-white/10 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-[hsl(43_65%_52%)]">
                  <option value="all">Todas las temporadas</option>
                  {seasons.map((season) => <option key={season} value={season}>{season.replace('-', '/')}</option>)}
                </select>
                <Link to="/calendario" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-3 text-sm font-bold text-gray-300 transition-smooth hover:border-[hsl(43_65%_52%_/_0.45)] hover:text-[hsl(43_65%_52%)]">
                  <Eye size={16} /> Ver público
                </Link>
              </div>
            </div>

            {isLoadingMatches ? (
              <div className="rounded-lg border border-white/10 bg-black/30 p-6 text-gray-400">Cargando partidos...</div>
            ) : (
              <div className="space-y-5">
                {Object.values(seasonGroups).map((group) => (
                  <div key={group.key} className="rounded-xl border border-white/10 bg-black/25 p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-[hsl(43_65%_52%)]">{getTeamLabel(group.team)}</p>
                        <h3 className="text-lg font-black">{group.season} · {group.phase}</h3>
                      </div>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-gray-400">{group.matches.length} partidos</span>
                    </div>

                    <div className="space-y-3">
                      {group.matches.map((match) => (
                        <article key={match.id} className="rounded-lg border border-white/10 bg-[#111] p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <p className="text-base font-black">vs {match.rival}</p>
                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-400">
                                <span className="inline-flex items-center gap-2"><CalendarDays size={15} className="text-[hsl(43_65%_52%)]" />{formatMatchDate(match.match_date)}</span>
                                <span className="inline-flex items-center gap-2"><Clock size={15} className="text-[hsl(43_65%_52%)]" />{match.match_time || 'Sin hora'}</span>
                                <span className="inline-flex items-center gap-2"><MapPin size={15} className="text-[hsl(43_65%_52%)]" />{match.court || match.venue || 'Sin pista'}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              <div className="rounded-lg bg-black px-4 py-2 text-center">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{getStatusLabel(match.status)}</p>
                                <p className="text-lg font-black text-[hsl(43_65%_52%)]">
                                  {match.our_score ?? '-'} - {match.rival_score ?? '-'}
                                </p>
                              </div>
                              <button type="button" onClick={() => handleEdit(match)} className="rounded-lg border border-[hsl(43_65%_52%_/_0.35)] px-4 py-3 text-sm font-bold text-[hsl(43_65%_52%)] transition-smooth hover:bg-[hsl(43_65%_52%)] hover:text-black">
                                Editar
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ))}

                {!filteredMatches.length && <div className="rounded-lg border border-white/10 bg-black/30 p-6 text-gray-400">No hay partidos en la temporada seleccionada.</div>}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CalendarAdminPage;
