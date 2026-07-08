import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Navigate } from 'react-router-dom';
import { Activity, BarChart3, Clock, ExternalLink, MonitorSmartphone, RefreshCw, UsersRound } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';
import { loadWebAnalytics } from '@/lib/analyticsRepository.js';

const deviceLabels = {
  desktop: 'Ordenador',
  tablet: 'Tablet',
  mobile: 'Móvil',
  unknown: 'Sin dato',
};

const MetricCard = ({ icon: Icon, label, value, hint }) => (
  <article className="rounded-xl border border-white/10 bg-[#111]/90 p-5">
    <div className="flex items-start justify-between gap-3">
      <span className="rounded-lg border border-[hsl(43_65%_52%_/_0.25)] bg-[hsl(43_65%_52%_/_0.08)] p-2.5">
        <Icon size={20} className="text-[hsl(43_65%_52%)]" />
      </span>
      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase text-gray-400">
        Web
      </span>
    </div>
    <p className="mt-5 text-3xl font-black text-white">{value}</p>
    <h2 className="mt-1 text-sm font-black uppercase text-gray-300">{label}</h2>
    {hint && <p className="mt-2 text-xs font-bold text-gray-500">{hint}</p>}
  </article>
);

const BarList = ({ items, labelAccessor = (item) => item.key, valueAccessor = (item) => item.count, emptyText }) => {
  const max = Math.max(...items.map(valueAccessor), 1);

  if (!items.length) {
    return (
      <div className="rounded-lg border border-dashed border-white/15 bg-black/30 p-5 text-sm font-bold text-gray-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const value = valueAccessor(item);
        return (
          <div key={item.key || item.path} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-bold text-gray-200">{labelAccessor(item)}</span>
              <span className="shrink-0 font-black text-[hsl(43_65%_62%)]">{value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[hsl(43_65%_52%)]"
                style={{ width: `${Math.max(6, (value / max) * 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const formatDateTime = (value) => {
  if (!value) return 'Sin fecha';
  return new Date(value).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
};

const AnalyticsAdminPage = () => {
  const { authMode, loading, isAuthenticated, isAdmin, user } = useAuth();
  const [days, setDays] = useState(30);
  const [analytics, setAnalytics] = useState(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadAnalytics = async () => {
    setIsLoadingAnalytics(true);
    setErrorMessage('');

    try {
      setAnalytics(await loadWebAnalytics({ days }));
    } catch (error) {
      setAnalytics(null);
      setErrorMessage(
        error.message?.includes('web_analytics_events')
          ? 'Falta crear la tabla de analíticas en Supabase. Ejecuta supabase/web-analytics.sql y vuelve a cargar.'
          : error.message || 'No se han podido cargar las analíticas.',
      );
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (loading || !isAuthenticated || !isAdmin) return;
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, loading, isAuthenticated, isAdmin]);

  const summary = analytics?.summary;
  const maxDayVisits = useMemo(
    () => Math.max(...(summary?.visitsByDay || []).map((item) => item.count), 1),
    [summary],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4">
          <p className="text-sm font-black uppercase text-[hsl(43_65%_52%)]">Cargando analíticas...</p>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/mi-cuenta" replace />;

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Helmet>
        <title>Analíticas - Panel de control</title>
        <meta name="description" content="Analíticas privadas de La Comunidad del Banquillo." />
      </Helmet>

      <Header />

      <main className="flex-1 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <section className="mb-6 flex flex-col gap-4 rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="text-sm font-bold uppercase text-[hsl(43_65%_52%)]">Panel privado</span>
              <h1 className="mt-2 text-white">Analíticas de la web</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-400">
                Visitas, páginas más vistas, dispositivos y procedencia. Medición propia con Supabase y sin recoger datos personales.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
                className="rounded-lg border border-white/10 bg-black px-4 py-3 text-sm font-black text-white outline-none focus:border-[hsl(43_65%_52%)]"
              >
                <option value={7}>Últimos 7 días</option>
                <option value={30}>Últimos 30 días</option>
                <option value={90}>Últimos 90 días</option>
              </select>
              <button
                type="button"
                onClick={loadAnalytics}
                disabled={isLoadingAnalytics}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[hsl(43_65%_52%_/_0.35)] bg-[hsl(43_65%_52%_/_0.08)] px-4 py-3 text-xs font-black uppercase text-[hsl(43_65%_62%)] transition hover:border-[hsl(43_65%_52%)] disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw size={15} className={isLoadingAnalytics ? 'animate-spin' : ''} />
                Actualizar
              </button>
            </div>
          </section>

          <div className="mb-6 rounded-xl border border-white/10 bg-black/25 p-4 text-xs font-bold uppercase text-gray-500">
            Sesión admin: {authMode === 'supabase' ? 'Supabase' : 'Local'} · {user?.email}
          </div>

          {errorMessage && (
            <div className="mb-6 rounded-xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm font-bold text-amber-100">
              {errorMessage}
            </div>
          )}

          {isLoadingAnalytics && !summary ? (
            <div className="rounded-xl border border-white/10 bg-[#111]/90 p-8 text-center text-sm font-black uppercase text-[hsl(43_65%_52%)]">
              Cargando datos...
            </div>
          ) : (
            <>
              <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={BarChart3} label="Visitas" value={summary?.totalVisits || 0} hint={`Periodo: ${days} días`} />
                <MetricCard icon={UsersRound} label="Sesiones únicas" value={summary?.uniqueSessions || 0} hint="Sesiones anónimas" />
                <MetricCard icon={Activity} label="Hoy" value={summary?.todayVisits || 0} hint={`Ayer: ${summary?.yesterdayVisits || 0}`} />
                <MetricCard icon={MonitorSmartphone} label="Dispositivos" value={summary?.devices?.length || 0} hint="Móvil, tablet, ordenador" />
              </section>

              <section className="mb-6 rounded-xl border border-white/10 bg-[#111]/90 p-5">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">Evolución</p>
                    <h2 className="mt-1 text-xl font-black text-white">Visitas por día</h2>
                  </div>
                </div>
                <div className="flex h-56 items-end gap-2 overflow-x-auto rounded-xl border border-white/10 bg-black/25 p-4">
                  {(summary?.visitsByDay || []).map((item) => (
                    <div key={item.key} className="flex min-w-[32px] flex-1 flex-col items-center justify-end gap-2">
                      <div className="text-[10px] font-black text-gray-500">{item.count}</div>
                      <div
                        className="w-full rounded-t-lg bg-[hsl(43_65%_52%)]"
                        style={{ height: `${Math.max(item.count ? 10 : 2, (item.count / maxDayVisits) * 160)}px` }}
                      />
                      <div className="whitespace-nowrap text-[10px] font-bold text-gray-600">{item.key.slice(5)}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mb-6 grid gap-6 xl:grid-cols-3">
                <article className="rounded-xl border border-white/10 bg-[#111]/90 p-5 xl:col-span-2">
                  <div className="mb-5">
                    <p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">Contenido</p>
                    <h2 className="mt-1 text-xl font-black text-white">Páginas más vistas</h2>
                  </div>
                  <BarList
                    items={summary?.topPages || []}
                    labelAccessor={(item) => item.path}
                    emptyText="Todavía no hay visitas registradas en este periodo."
                  />
                </article>

                <article className="rounded-xl border border-white/10 bg-[#111]/90 p-5">
                  <div className="mb-5">
                    <p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">Dispositivo</p>
                    <h2 className="mt-1 text-xl font-black text-white">Cómo entran</h2>
                  </div>
                  <BarList
                    items={summary?.devices || []}
                    labelAccessor={(item) => deviceLabels[item.key] || item.key}
                    emptyText="Sin datos de dispositivos todavía."
                  />
                </article>
              </section>

              <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
                <article className="rounded-xl border border-white/10 bg-[#111]/90 p-5">
                  <div className="mb-5">
                    <p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">Procedencia</p>
                    <h2 className="mt-1 text-xl font-black text-white">Referrers</h2>
                  </div>
                  <BarList
                    items={summary?.topReferrers || []}
                    emptyText="Sin procedencia registrada todavía."
                  />
                </article>

                <article className="rounded-xl border border-white/10 bg-[#111]/90 p-5">
                  <div className="mb-5 flex items-center gap-3">
                    <Clock size={20} className="text-[hsl(43_65%_52%)]" />
                    <div>
                      <p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">Últimas visitas</p>
                      <h2 className="mt-1 text-xl font-black text-white">Actividad reciente</h2>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-white/10">
                    {(summary?.recentVisits || []).length ? (
                      <div className="divide-y divide-white/10">
                        {summary.recentVisits.map((visit, index) => (
                          <div key={`${visit.created_at}-${visit.path}-${index}`} className="grid gap-2 bg-black/25 p-3 text-sm sm:grid-cols-[1fr_auto]">
                            <div className="min-w-0">
                              <p className="truncate font-black text-white">{visit.path}</p>
                              <p className="mt-1 truncate text-xs font-bold text-gray-500">
                                {getReferrerForDisplay(visit.referrer)} · {deviceLabels[visit.device] || visit.device || 'Sin dato'}
                              </p>
                            </div>
                            <p className="text-xs font-bold text-gray-500">{formatDateTime(visit.created_at)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-5 text-sm font-bold text-gray-500">Todavía no hay actividad reciente.</div>
                    )}
                  </div>
                </article>
              </section>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

const getReferrerForDisplay = (referrer) => {
  if (!referrer) return 'Directo';
  try {
    return new URL(referrer).hostname.replace(/^www\./, '');
  } catch {
    return 'Otro origen';
  }
};

export default AnalyticsAdminPage;
