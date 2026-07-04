import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, CheckCircle2, Database, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';
import { allPlayers, matches as staticMatches, playerAdvancedStats, playerGameStats } from '@/data/data.js';
import { getValuation, mergeStatRows } from '@/utils/statCalculations.js';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';

const emptyForm = {
  id: null,
  match_id: '',
  player_id: '',
  minutes: '',
  points: '',
  field_goals: '',
  three_pointers: '',
  free_throws: '',
  offensive_rebounds: '',
  defensive_rebounds: '',
  assists: '',
  fouls: '',
  steals: '',
  turnovers: '',
  blocks: '',
  valuation: '',
};

const numberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const integerOrZero = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseResult = (result) => {
  if (!result || !String(result).includes('-')) return { our_score: null, rival_score: null };
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
  };
});

const localPlayers = allPlayers.map((player) => ({
  id: player.id,
  name: player.name,
  number: String(player.number ?? ''),
  team: player.team,
  position: player.position || '',
  active: true,
}));

const normalizeMatch = (match) => ({
  id: match.id,
  team: match.team || 'masculine',
  season: match.season || '2025-2026',
  phase: match.phase || 'Fase 1',
  match_date: match.match_date || match.date || '',
  match_time: match.match_time ? String(match.match_time).slice(0, 5) : match.time || '',
  rival: match.rival || '',
  venue: match.venue || '',
  court: match.court || match.venue || '',
  our_score: match.our_score ?? parseResult(match.result).our_score,
  rival_score: match.rival_score ?? parseResult(match.result).rival_score,
  status: match.status || (match.result ? 'finished' : 'scheduled'),
});

const normalizePlayer = (player) => ({
  id: player.id,
  name: player.name,
  number: String(player.number ?? ''),
  team: player.team,
  position: player.position || '',
  active: player.active !== false,
});

const normalizeStat = (stat) => ({
  id: stat.id || null,
  match_id: Number(stat.match_id ?? stat.matchId),
  player_id: Number(stat.player_id ?? stat.playerId),
  minutes: stat.minutes || '',
  points: stat.points ?? 0,
  field_goals: stat.field_goals || stat.fg || '',
  three_pointers: stat.three_pointers || stat.threePt || '',
  free_throws: stat.free_throws || stat.ft || '',
  offensive_rebounds: stat.offensive_rebounds ?? stat.oreb ?? null,
  defensive_rebounds: stat.defensive_rebounds ?? stat.dreb ?? null,
  assists: stat.assists ?? null,
  fouls: stat.fouls ?? null,
  steals: stat.steals ?? null,
  turnovers: stat.turnovers ?? null,
  blocks: stat.blocks ?? null,
  valuation: stat.valuation ?? null,
});

const buildLocalStats = () => {
  return staticMatches.flatMap((match) =>
    mergeStatRows({
      gameStats: playerGameStats.filter((stat) => stat.matchId === match.id),
      advancedStats: playerAdvancedStats.filter((stat) => stat.matchId === match.id),
      players: allPlayers,
    }).map((row) => ({
      id: null,
      match_id: row.matchId,
      player_id: row.playerId,
      minutes: row.minutes === '-' ? '' : row.minutes,
      points: row.points,
      field_goals: row.advanced?.fg || '',
      three_pointers: row.advanced?.threePt || '',
      free_throws: row.advanced?.ft || '',
      offensive_rebounds: row.advanced?.oreb ?? null,
      defensive_rebounds: row.advanced?.dreb ?? null,
      assists: row.assists,
      fouls: row.fouls,
      steals: row.steals,
      turnovers: row.turnovers,
      blocks: row.advanced?.blocks ?? null,
      valuation: row.valuation,
    })),
  );
};

const localStats = buildLocalStats();

const buildPayload = (form) => {
  const statForValuation = {
    fg: form.field_goals.trim() || null,
    ft: form.free_throws.trim() || null,
    oreb: integerOrZero(form.offensive_rebounds),
    dreb: integerOrZero(form.defensive_rebounds),
    assists: integerOrZero(form.assists),
    steals: integerOrZero(form.steals),
    blocks: integerOrZero(form.blocks),
    turnovers: integerOrZero(form.turnovers),
  };

  const points = integerOrZero(form.points);
  const calculatedValuation = getValuation(statForValuation, points);

  return {
    match_id: Number(form.match_id),
    player_id: Number(form.player_id),
    minutes: form.minutes.trim() || null,
    points,
    field_goals: form.field_goals.trim() || null,
    three_pointers: form.three_pointers.trim() || null,
    free_throws: form.free_throws.trim() || null,
    offensive_rebounds: numberOrNull(form.offensive_rebounds),
    defensive_rebounds: numberOrNull(form.defensive_rebounds),
    fouls: numberOrNull(form.fouls),
    steals: numberOrNull(form.steals),
    turnovers: numberOrNull(form.turnovers),
    blocks: numberOrNull(form.blocks),
    assists: numberOrNull(form.assists),
    valuation: form.valuation === '' ? calculatedValuation : numberOrNull(form.valuation),
  };
};

const formatDate = (value) => {
  if (!value) return 'Sin fecha';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const StatsAdminPage = () => {
  const { authMode, loading, isAuthenticated, isAdmin, user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [stats, setStats] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [savingStat, setSavingStat] = useState(false);
  const [syncingSeed, setSyncingSeed] = useState(false);
  const [usingLocalReference, setUsingLocalReference] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const playersById = useMemo(() => new Map(players.map((player) => [Number(player.id), player])), [players]);
  const matchesById = useMemo(() => new Map(matches.map((match) => [Number(match.id), match])), [matches]);

  const sortedMatches = useMemo(
    () =>
      [...matches].sort((a, b) => {
        const dateOrder = String(b.match_date || '').localeCompare(String(a.match_date || ''));
        if (dateOrder !== 0) return dateOrder;
        return String(b.match_time || '').localeCompare(String(a.match_time || ''));
      }),
    [matches],
  );

  const selectedMatch = matchesById.get(Number(selectedMatchId));

  const selectedStats = useMemo(
    () =>
      stats
        .filter((stat) => Number(stat.match_id) === Number(selectedMatchId))
        .sort((a, b) => (b.points || 0) - (a.points || 0)),
    [selectedMatchId, stats],
  );

  const summary = useMemo(
    () => ({
      matchesWithStats: new Set(stats.map((stat) => stat.match_id)).size,
      totalRows: stats.length,
      advancedRows: stats.filter((stat) => stat.field_goals || stat.three_pointers || stat.free_throws).length,
      playersWithStats: new Set(stats.map((stat) => stat.player_id)).size,
    }),
    [stats],
  );

  const loadAdminData = async () => {
    setIsLoadingData(true);
    setErrorMessage('');
    setSuccessMessage('');
    setUsingLocalReference(false);

    if (!isSupabaseConfigured) {
      setMatches(localMatches);
      setPlayers(localPlayers);
      setStats(localStats);
      setSelectedMatchId(String(localMatches[0]?.id || ''));
      setForm((currentForm) => ({ ...currentForm, match_id: String(localMatches[0]?.id || '') }));
      setUsingLocalReference(true);
      setIsLoadingData(false);
      return;
    }

    const [matchesResponse, playersResponse, statsResponse] = await Promise.all([
      supabase
        .from('matches')
        .select('id,team,season,phase,match_date,match_time,rival,venue,court,our_score,rival_score,status')
        .order('match_date', { ascending: false }),
      supabase
        .from('players')
        .select('id,name,number,team,position,active')
        .eq('active', true)
        .order('team', { ascending: true })
        .order('number', { ascending: true }),
      supabase
        .from('player_stats')
        .select('id,match_id,player_id,minutes,points,field_goals,three_pointers,free_throws,offensive_rebounds,defensive_rebounds,fouls,steals,turnovers,blocks,assists,valuation'),
    ]);

    if (matchesResponse.error || playersResponse.error || statsResponse.error) {
      setErrorMessage(
        matchesResponse.error?.message ||
          playersResponse.error?.message ||
          statsResponse.error?.message ||
          'No he podido cargar los datos de estadísticas.',
      );
      setMatches(localMatches);
      setPlayers(localPlayers);
      setStats(localStats);
      setSelectedMatchId(String(localMatches[0]?.id || ''));
      setForm((currentForm) => ({ ...currentForm, match_id: String(localMatches[0]?.id || '') }));
      setUsingLocalReference(true);
    } else {
      const nextMatches = (matchesResponse.data || []).map(normalizeMatch);
      setMatches(nextMatches);
      setPlayers((playersResponse.data || []).map(normalizePlayer));
      setStats((statsResponse.data || []).map(normalizeStat));
      const nextSelectedMatch = selectedMatchId || String(nextMatches[0]?.id || '');
      setSelectedMatchId(nextSelectedMatch);
      setForm((currentForm) => ({ ...currentForm, match_id: nextSelectedMatch }));
    }

    setIsLoadingData(false);
  };

  useEffect(() => {
    if (loading || !isAuthenticated || !isAdmin) return;
    loadAdminData();
  }, [isAdmin, isAuthenticated, loading]);

  const resetForm = () => {
    setForm({ ...emptyForm, match_id: selectedMatchId });
  };

  const handleMatchChange = (matchId) => {
    setSelectedMatchId(matchId);
    setForm((currentForm) => ({ ...currentForm, match_id: matchId, id: null }));
  };

  const handleEdit = (stat) => {
    setForm({
      id: stat.id,
      match_id: String(stat.match_id),
      player_id: String(stat.player_id),
      minutes: stat.minutes || '',
      points: stat.points ?? '',
      field_goals: stat.field_goals || '',
      three_pointers: stat.three_pointers || '',
      free_throws: stat.free_throws || '',
      offensive_rebounds: stat.offensive_rebounds ?? '',
      defensive_rebounds: stat.defensive_rebounds ?? '',
      assists: stat.assists ?? '',
      fouls: stat.fouls ?? '',
      steals: stat.steals ?? '',
      turnovers: stat.turnovers ?? '',
      blocks: stat.blocks ?? '',
      valuation: stat.valuation ?? '',
    });
    setSelectedMatchId(String(stat.match_id));
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSavingStat(true);
    setErrorMessage('');
    setSuccessMessage('');

    const payload = buildPayload(form);

    if (!payload.match_id || !payload.player_id) {
      setErrorMessage('Partido y jugador son obligatorios.');
      setSavingStat(false);
      return;
    }

    if (!isSupabaseConfigured || usingLocalReference) {
      const localId = `${payload.match_id}-${payload.player_id}`;
      const nextStat = normalizeStat({ ...payload, id: form.id || localId });
      setStats((currentStats) => {
        const exists = currentStats.some((stat) => String(stat.id) === String(form.id) || (stat.match_id === payload.match_id && stat.player_id === payload.player_id));
        if (!exists) return [nextStat, ...currentStats];
        return currentStats.map((stat) =>
          String(stat.id) === String(form.id) || (stat.match_id === payload.match_id && stat.player_id === payload.player_id) ? nextStat : stat,
        );
      });
      setSuccessMessage('Estadística guardada en vista local. Para guardarla definitivo la conectamos a Supabase.');
      resetForm();
      setSavingStat(false);
      return;
    }

    const { data, error } = await supabase
      .from('player_stats')
      .upsert(payload, { onConflict: 'match_id,player_id' })
      .select()
      .single();

    if (error) {
      setErrorMessage(error.message);
    } else {
      const normalized = normalizeStat(data);
      setStats((currentStats) => {
        const exists = currentStats.some((stat) => stat.id === normalized.id || (stat.match_id === normalized.match_id && stat.player_id === normalized.player_id));
        if (!exists) return [normalized, ...currentStats];
        return currentStats.map((stat) =>
          stat.id === normalized.id || (stat.match_id === normalized.match_id && stat.player_id === normalized.player_id) ? normalized : stat,
        );
      });
      setSuccessMessage('Estadística guardada correctamente.');
      resetForm();
    }

    setSavingStat(false);
  };

  const seedCurrentStats = async () => {
    if (!isSupabaseConfigured) {
      setErrorMessage('Para importar estadísticas hace falta tener Supabase configurado.');
      return;
    }

    setSyncingSeed(true);
    setErrorMessage('');
    setSuccessMessage('');

    const payload = localStats.map((stat) => ({
      match_id: stat.match_id,
      player_id: stat.player_id,
      minutes: stat.minutes || null,
      points: stat.points || 0,
      field_goals: stat.field_goals || null,
      three_pointers: stat.three_pointers || null,
      free_throws: stat.free_throws || null,
      offensive_rebounds: stat.offensive_rebounds,
      defensive_rebounds: stat.defensive_rebounds,
      fouls: stat.fouls,
      steals: stat.steals,
      turnovers: stat.turnovers,
      blocks: stat.blocks,
      assists: stat.assists,
      valuation: stat.valuation,
    }));

    const { error } = await supabase.from('player_stats').upsert(payload, { onConflict: 'match_id,player_id' });

    if (error) {
      setErrorMessage(`${error.message}. Revisa que primero estén importadas las plantillas y el calendario.`);
    } else {
      setSuccessMessage('Estadísticas actuales importadas en Supabase.');
      await loadAdminData();
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
        <title>Estadísticas | Panel de control</title>
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
              <h1 className="mb-3 text-4xl font-black md:text-6xl">Estadísticas</h1>
              <p className="max-w-3xl text-gray-400">
                Añade puntos oficiales, minutos y estadísticas avanzadas por jugador. Los puntos de Federación siguen teniendo prioridad.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={loadAdminData}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition-smooth hover:border-[hsl(43_65%_52%_/_0.45)]"
              >
                <RefreshCw size={16} />
                Recargar
              </button>
              <button
                type="button"
                onClick={seedCurrentStats}
                disabled={syncingSeed}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(43_65%_52%)] px-4 py-3 text-sm font-black text-black transition-smooth hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Database size={16} />
                {syncingSeed ? 'Importando...' : 'Importar estadísticas actuales'}
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
                Estoy mostrando las estadísticas locales como referencia. Cuando Supabase esté disponible, se guardarán en la tabla real.
              </div>
            )}
          </div>
        )}

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          {[
            ['Partidos con stats', summary.matchesWithStats],
            ['Registros', summary.totalRows],
            ['Stats avanzadas', summary.advancedRows],
            ['Jugadores', summary.playersWithStats],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-[hsl(43_65%_52%_/_0.22)] bg-[#0d0d0d] p-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">{label}</p>
              <p className="text-3xl font-black">{value}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <section className="rounded-xl border border-[hsl(43_65%_52%_/_0.22)] bg-[#101010] p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-lg border border-[hsl(43_65%_52%_/_0.35)] bg-[hsl(43_65%_52%_/_0.12)] p-2 text-[hsl(43_65%_52%)]">
                <BarChart3 size={18} />
              </div>
              <div>
                <h2 className="text-xl font-black">{form.id ? 'Editar registro' : 'Nueva estadística'}</h2>
                <p className="text-sm text-gray-500">Jugador, minutos, puntos y datos avanzados.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block space-y-2 text-sm font-bold text-gray-300">
                Partido
                <select value={form.match_id || selectedMatchId} onChange={(event) => handleMatchChange(event.target.value)} className="w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-white outline-none focus:border-[hsl(43_65%_52%)]">
                  <option value="">Selecciona partido</option>
                  {sortedMatches.map((match) => (
                    <option key={match.id} value={match.id}>
                      {formatDate(match.match_date)} · CDB vs {match.rival}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2 text-sm font-bold text-gray-300">
                Jugador
                <select value={form.player_id} onChange={(event) => setForm({ ...form, player_id: event.target.value })} className="w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-white outline-none focus:border-[hsl(43_65%_52%)]">
                  <option value="">Selecciona jugador</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      #{player.number || '-'} · {player.name} · {player.team === 'feminine' ? 'Femenino' : 'Masculino'}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="space-y-2 text-sm font-bold text-gray-300">
                  Min.
                  <input value={form.minutes} onChange={(event) => setForm({ ...form, minutes: event.target.value })} placeholder="25:47" className="w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-white outline-none focus:border-[hsl(43_65%_52%)]" />
                </label>
                <label className="space-y-2 text-sm font-bold text-gray-300">
                  PTS
                  <input type="number" value={form.points} onChange={(event) => setForm({ ...form, points: event.target.value })} className="w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-white outline-none focus:border-[hsl(43_65%_52%)]" />
                </label>
                <label className="space-y-2 text-sm font-bold text-gray-300">
                  VAL
                  <input type="number" step="0.1" value={form.valuation} onChange={(event) => setForm({ ...form, valuation: event.target.value })} placeholder="Auto" className="w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-white outline-none focus:border-[hsl(43_65%_52%)]" />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="space-y-2 text-sm font-bold text-gray-300">
                  TC
                  <input value={form.field_goals} onChange={(event) => setForm({ ...form, field_goals: event.target.value })} placeholder="6-11" className="w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-white outline-none focus:border-[hsl(43_65%_52%)]" />
                </label>
                <label className="space-y-2 text-sm font-bold text-gray-300">
                  T3
                  <input value={form.three_pointers} onChange={(event) => setForm({ ...form, three_pointers: event.target.value })} placeholder="2-5" className="w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-white outline-none focus:border-[hsl(43_65%_52%)]" />
                </label>
                <label className="space-y-2 text-sm font-bold text-gray-300">
                  TL
                  <input value={form.free_throws} onChange={(event) => setForm({ ...form, free_throws: event.target.value })} placeholder="3-4" className="w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-white outline-none focus:border-[hsl(43_65%_52%)]" />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                {[
                  ['offensive_rebounds', 'REB. OF.'],
                  ['defensive_rebounds', 'REB. DEF.'],
                  ['assists', 'AST'],
                  ['fouls', 'FAL'],
                  ['steals', 'ROB'],
                  ['turnovers', 'PER'],
                  ['blocks', 'TAP'],
                ].map(([key, label]) => (
                  <label key={key} className="space-y-2 text-sm font-bold text-gray-300">
                    {label}
                    <input type="number" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-white outline-none focus:border-[hsl(43_65%_52%)]" />
                  </label>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button type="submit" disabled={savingStat} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(43_65%_52%)] px-5 py-3 text-sm font-black text-black transition-smooth hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
                  <Save size={16} />
                  {savingStat ? 'Guardando...' : 'Guardar estadística'}
                </button>
                <button type="button" onClick={resetForm} className="rounded-lg border border-white/10 px-5 py-3 text-sm font-bold text-gray-300 transition-smooth hover:border-white/25">
                  Limpiar
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-xl border border-[hsl(43_65%_52%_/_0.22)] bg-[#101010] p-5">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wide text-[hsl(43_65%_52%)]">Partido seleccionado</p>
              <h2 className="text-xl font-black">
                {selectedMatch ? `${formatDate(selectedMatch.match_date)} · CDB vs ${selectedMatch.rival}` : 'Selecciona un partido'}
              </h2>
              {selectedMatch && (
                <p className="mt-1 text-sm text-gray-500">
                  {selectedMatch.phase || 'Sin fase'} · {selectedMatch.court || selectedMatch.venue || 'Sin pista'} · Resultado {selectedMatch.our_score ?? '-'} - {selectedMatch.rival_score ?? '-'}
                </p>
              )}
            </div>

            {isLoadingData ? (
              <div className="rounded-lg border border-white/10 bg-black/30 p-6 text-gray-400">Cargando estadísticas...</div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-white/10">
                <div className="max-h-[680px] overflow-auto">
                  <table className="w-full min-w-[940px] text-left text-xs">
                    <thead className="sticky top-0 bg-[#141414] uppercase tracking-wide text-gray-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Jugador</th>
                        <th className="px-3 py-3 text-right font-semibold">Min.</th>
                        <th className="px-3 py-3 text-right font-semibold">PTS</th>
                        <th className="px-3 py-3 text-right font-semibold">TC</th>
                        <th className="px-3 py-3 text-right font-semibold">T3</th>
                        <th className="px-3 py-3 text-right font-semibold">TL</th>
                        <th className="px-3 py-3 text-right font-semibold">REB</th>
                        <th className="px-3 py-3 text-right font-semibold">AST</th>
                        <th className="px-3 py-3 text-right font-semibold">FAL</th>
                        <th className="px-3 py-3 text-right font-semibold">ROB</th>
                        <th className="px-3 py-3 text-right font-semibold">PER</th>
                        <th className="px-3 py-3 text-right font-semibold">VAL</th>
                        <th className="px-4 py-3 text-right font-semibold">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStats.map((stat) => {
                        const player = playersById.get(Number(stat.player_id));
                        const rebounds = (stat.offensive_rebounds ?? 0) + (stat.defensive_rebounds ?? 0);

                        return (
                          <tr key={`${stat.match_id}-${stat.player_id}`} className="border-t border-white/5 text-gray-200">
                            <td className="px-4 py-3 font-bold">{player?.name || `Jugador ${stat.player_id}`}</td>
                            <td className="px-3 py-3 text-right font-mono text-[12px] tabular-nums">{stat.minutes || '-'}</td>
                            <td className="px-3 py-3 text-right font-bold text-white">{stat.points ?? 0}</td>
                            <td className="px-3 py-3 text-right">{stat.field_goals || '-'}</td>
                            <td className="px-3 py-3 text-right">{stat.three_pointers || '-'}</td>
                            <td className="px-3 py-3 text-right">{stat.free_throws || '-'}</td>
                            <td className="px-3 py-3 text-right">{rebounds || '-'}</td>
                            <td className="px-3 py-3 text-right">{stat.assists ?? '-'}</td>
                            <td className="px-3 py-3 text-right">{stat.fouls ?? '-'}</td>
                            <td className="px-3 py-3 text-right">{stat.steals ?? '-'}</td>
                            <td className="px-3 py-3 text-right">{stat.turnovers ?? '-'}</td>
                            <td className="px-3 py-3 text-right font-bold text-[hsl(43_65%_52%)]">{stat.valuation ?? '-'}</td>
                            <td className="px-4 py-3 text-right">
                              <button type="button" onClick={() => handleEdit(stat)} className="rounded-md border border-[hsl(43_65%_52%_/_0.35)] px-3 py-2 text-xs font-bold text-[hsl(43_65%_52%)] transition-smooth hover:bg-[hsl(43_65%_52%)] hover:text-black">
                                Editar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {!selectedStats.length && <div className="border-t border-white/10 bg-black/30 p-6 text-gray-400">Este partido todavía no tiene estadísticas guardadas.</div>}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StatsAdminPage;
