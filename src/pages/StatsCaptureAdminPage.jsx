import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, CalendarDays, CheckCircle2, Save, ShieldCheck, UserCheck } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';
import { matches } from '@/data/data.js';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import {
  DEFAULT_STATS_SEASON,
  loadStatsCaptureSettings,
  loadStatsPermissions,
  loadStatsSessions,
  saveStatsCaptureSettings,
  saveStatsPermission,
} from '@/lib/statsCaptureRepository.js';

const getSeasonOptions = () => {
  const currentYear = new Date().getFullYear();
  const seasons = new Set(matches.map((match) => match.season).filter(Boolean));
  [currentYear - 1, currentYear, currentYear + 1].forEach((year) => seasons.add(`${year}-${year + 1}`));
  return Array.from(seasons).sort();
};

const StatsCaptureAdminPage = () => {
  const { authMode, loading, isAuthenticated, isAdmin, user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState(null);
  const [activeSeason, setActiveSeason] = useState(DEFAULT_STATS_SEASON);
  const [savedSeason, setSavedSeason] = useState(DEFAULT_STATS_SEASON);
  const [savingSeason, setSavingSeason] = useState(false);
  const [notice, setNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const permissionByUser = useMemo(
    () => new Map(permissions.map((permission) => [permission.user_id, permission])),
    [permissions],
  );

  const stats = useMemo(() => ({
    keepers: permissions.filter((permission) => permission.can_capture).length,
    sessions: sessions.length,
    captured: sessions.filter((session) => session.status === 'captured').length,
  }), [permissions, sessions]);

  const loadData = async () => {
    setIsLoading(true);
    setNotice('');
    setErrorMessage('');

    const settingsData = await loadStatsCaptureSettings();
    setActiveSeason(settingsData.activeSeason);
    setSavedSeason(settingsData.activeSeason);

    if (!isSupabaseConfigured) {
      setProfiles([user]);
      setPermissions([{ user_id: user.id, can_capture: true, notes: 'Modo local' }]);
      setSessions([]);
      setIsLoading(false);
      return;
    }

    try {
      const [{ data: profileData, error: profileError }, permissionData, sessionData] = await Promise.all([
        supabase.from('profiles').select('id,email,name,role,created_at').order('created_at', { ascending: false }),
        loadStatsPermissions(),
        loadStatsSessions(),
      ]);
      if (profileError) throw new Error(profileError.message);
      setProfiles(profileData || []);
      setPermissions(permissionData);
      setSessions(sessionData);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (loading || !isAuthenticated || !isAdmin) return;
    loadData();
  }, [isAdmin, isAuthenticated, loading]);

  const togglePermission = async (profile, nextValue) => {
    setSavingUserId(profile.id);
    setNotice('');
    setErrorMessage('');

    try {
      if (!isSupabaseConfigured) {
        setPermissions((current) => {
          const exists = current.some((permission) => permission.user_id === profile.id);
          return exists
            ? current.map((permission) => (permission.user_id === profile.id ? { ...permission, can_capture: nextValue } : permission))
            : [...current, { user_id: profile.id, can_capture: nextValue, notes: '' }];
        });
        setNotice('Permiso actualizado en modo local.');
      } else {
        const saved = await saveStatsPermission({ userId: profile.id, canCapture: nextValue, notes: '' });
        setPermissions((current) => {
          const exists = current.some((permission) => permission.user_id === profile.id);
          return exists
            ? current.map((permission) => (permission.user_id === profile.id ? saved : permission))
            : [...current, saved];
        });
        setNotice(`Permiso de ${profile.name} actualizado.`);
      }
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSavingUserId(null);
    }
  };

  const saveActiveSeason = async () => {
    setSavingSeason(true);
    setNotice('');
    setErrorMessage('');
    try {
      const saved = await saveStatsCaptureSettings({ activeSeason, userId: user.id });
      setActiveSeason(saved.activeSeason);
      setSavedSeason(saved.activeSeason);
      setNotice(`Temporada ${saved.activeSeason.replace('-', '/')} activada para los partidos oficiales.`);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSavingSeason(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0a0a0a] text-white"><Header /><main className="p-16 text-center text-sm font-black uppercase text-[hsl(43_65%_52%)]">Cargando módulo...</main></div>;
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/mi-cuenta" replace />;

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Helmet>
        <title>App de estadísticas - Panel de control</title>
        <meta name="description" content="Permisos y sesiones de la app de estadísticas." />
      </Helmet>
      <Header />
      <main className="flex-1 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link to="/panel-control" className="mb-5 inline-flex items-center gap-2 text-sm font-black uppercase text-gray-400 transition hover:text-[hsl(43_65%_52%)]">
            <ArrowLeft size={17} />
            Volver al panel
          </Link>

          <section className="mb-6 flex flex-col gap-4 rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="text-sm font-bold uppercase text-[hsl(43_65%_52%)]">Panel de control</span>
              <h1 className="mt-2 text-white">App de estadísticas</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400">
                Gestiona quién puede usar la app privada de anotación y revisa las sesiones guardadas en Supabase.
              </p>
            </div>
            <div className="rounded-xl border border-[hsl(43_65%_52%_/_0.25)] bg-[hsl(43_65%_52%_/_0.08)] p-4">
              <p className="text-xs font-bold uppercase text-gray-500">Admin · {authMode === 'supabase' ? 'Supabase' : 'Local'}</p>
              <p className="text-sm font-black text-white">{user.email}</p>
            </div>
          </section>

          <section className="mb-6 rounded-xl border border-[hsl(43_65%_52%_/_0.25)] bg-[#111]/90 p-5">
            <div className="grid gap-5 lg:grid-cols-[1fr_minmax(280px,420px)] lg:items-end">
              <div className="flex items-start gap-3">
                <CalendarDays size={23} className="mt-1 shrink-0 text-[hsl(43_65%_52%)]" />
                <div>
                  <p className="text-xs font-bold uppercase text-[hsl(43_65%_52%)]">Configuración oficial</p>
                  <h2 className="mt-1 text-xl font-black text-white">Temporada activa</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">
                    Los anotadores solo podrán elegir partidos oficiales del calendario pertenecientes a esta temporada. Los amistosos seguirán disponibles siempre.
                  </p>
                  <p className="mt-3 text-xs font-black uppercase text-emerald-300">Activa ahora: {savedSeason.replace('-', '/')}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <select
                  value={activeSeason}
                  onChange={(event) => setActiveSeason(event.target.value)}
                  className="min-h-12 rounded-lg border border-white/15 bg-black/40 px-4 text-sm font-black text-white outline-none focus:border-[hsl(43_65%_52%)]"
                >
                  {getSeasonOptions().map((season) => <option key={season} value={season}>Temporada {season.replace('-', '/')}</option>)}
                </select>
                <button
                  type="button"
                  disabled={savingSeason || activeSeason === savedSeason}
                  onClick={saveActiveSeason}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[hsl(43_65%_52%)] px-5 text-sm font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Save size={17} />
                  {savingSeason ? 'Guardando...' : 'Activar'}
                </button>
              </div>
            </div>
          </section>

          <section className="mb-6 grid gap-3 sm:grid-cols-3">
            <article className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-black uppercase text-gray-500">Anotadores</p><p className="mt-2 text-3xl font-black text-white">{stats.keepers}</p></article>
            <article className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-black uppercase text-gray-500">Sesiones</p><p className="mt-2 text-3xl font-black text-white">{stats.sessions}</p></article>
            <article className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-black uppercase text-gray-500">Capturadas</p><p className="mt-2 text-3xl font-black text-white">{stats.captured}</p></article>
          </section>

          {notice && <p className="mb-4 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-100">{notice}</p>}
          {errorMessage && <p className="mb-4 rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{errorMessage}</p>}

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90">
              <div className="flex items-center gap-3 border-b border-white/10 p-4">
                <UserCheck size={21} className="text-[hsl(43_65%_52%)]" />
                <div><p className="text-xs font-bold uppercase text-[hsl(43_65%_52%)]">Permisos</p><h2 className="text-xl font-black text-white">Anotadores autorizados</h2></div>
              </div>
              {isLoading ? <p className="p-8 text-center text-sm font-black uppercase text-gray-400">Cargando usuarios...</p> : (
                <div className="divide-y divide-white/10">
                  {profiles.map((profile) => {
                    const permission = permissionByUser.get(profile.id);
                    const allowed = profile.role === 'admin' || permission?.can_capture === true;
                    return (
                      <article key={profile.id} className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">{profile.name}</p>
                          <p className="truncate text-xs text-gray-500">{profile.email} · {profile.role}</p>
                        </div>
                        <button
                          type="button"
                          disabled={savingUserId === profile.id || profile.role === 'admin'}
                          onClick={() => togglePermission(profile, !allowed)}
                          className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-black uppercase transition disabled:cursor-not-allowed disabled:opacity-60 ${allowed ? 'border border-emerald-400/25 bg-emerald-500/10 text-emerald-200' : 'border border-white/10 bg-white/5 text-gray-300 hover:border-[hsl(43_65%_52%_/_0.55)]'}`}
                        >
                          {allowed ? <CheckCircle2 size={15} /> : <ShieldCheck size={15} />}
                          {profile.role === 'admin' ? 'Admin' : allowed ? 'Permitido' : 'Dar permiso'}
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90">
              <div className="flex items-center gap-3 border-b border-white/10 p-4">
                <BarChart3 size={21} className="text-[hsl(43_65%_52%)]" />
                <div><p className="text-xs font-bold uppercase text-[hsl(43_65%_52%)]">Sesiones</p><h2 className="text-xl font-black text-white">Últimas capturas</h2></div>
              </div>
              {isLoading ? <p className="p-8 text-center text-sm font-black uppercase text-gray-400">Cargando sesiones...</p> : sessions.length ? (
                <div className="divide-y divide-white/10">
                  {sessions.map((session) => (
                    <article key={session.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-white">{session.team === 'feminine' ? 'Femenino' : 'Masculino'} vs {session.opponent}</p>
                          <p className="mt-1 text-xs text-gray-500">{session.mode} · {session.status} · {new Date(session.created_at).toLocaleString('es-ES')}</p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-[hsl(43_65%_52%)]">{session.summary?.points || 0} pts</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <p className="p-8 text-center text-sm font-bold text-gray-500">Todavía no hay sesiones guardadas.</p>}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StatsCaptureAdminPage;
