import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Database,
  FilePenLine,
  ListChecks,
  Save,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';
import { controlPanelModules, controlPanelSchema } from '@/data/controlPanelSchema.js';

const moduleIcons = {
  contenido: FilePenLine,
  plantillas: UsersRound,
  calendario: CalendarDays,
  estadisticas: Sparkles,
  banquiger: Sparkles,
};

const moduleCopy = {
  contenido: {
    note: 'Aquí iremos colocando todo lo que quieras poder cambiar sin tocar código: portada, redes, patrocinadores y textos rápidos.',
    primaryAction: { label: 'Ver portada', href: '/' },
  },
  plantillas: {
    note: 'Este módulo será el sitio para mantener jugadores, staff, fotos, dorsales e Instagram actualizados cada temporada.',
    primaryAction: { label: 'Ver plantilla masculina', href: '/plantilla-masculina' },
  },
  calendario: {
    note: 'La prioridad será que puedas crear partidos y que la web pinte calendario, resultados y archivos ICS automáticamente.',
    primaryAction: { label: 'Ver calendario', href: '/calendario' },
  },
  estadisticas: {
    note: 'Este módulo conectará los partidos con los datos de cada jugador para alimentar fichas, medias y ventanas de estadísticas.',
    primaryAction: { label: 'Ver calendario 25/26', href: '/calendario/masculino/2025-2026' },
  },
  banquiger: {
    note: 'Aquí vivirá la parte administrativa del juego: jornadas, mercado, precios, equipos creados y clasificación.',
    primaryAction: { label: 'Ver Banquiger', href: '/banquiger/panel' },
  },
};

const moduleWorkspaces = {
  contenido: {
    title: 'Contenido editable',
    description: 'Primeros bloques que pasaremos a datos para que puedas actualizarlos desde aquí.',
    fields: ['Bloque', 'Título visible', 'Enlace', 'Estado'],
    rows: [
      ['Redes', 'Instagram, YouTube y Twitch', 'Footer', 'Visible'],
      ['Patrocinador', 'Matrice', 'Footer', 'Visible'],
      ['Contacto', 'Ponte en contacto con nosotros', '/contacto', 'Visible'],
    ],
    formTitle: 'Nuevo bloque rápido',
    formFields: ['Nombre del bloque', 'Texto visible', 'URL o ruta interna'],
  },
  plantillas: {
    title: 'Gestión de plantilla',
    description: 'Alta rápida para jugadores, staff o futuras incorporaciones del femenino.',
    fields: ['Nombre', 'Equipo', 'Dorsal', 'Estado'],
    rows: [
      ['Jugador masculino', 'Masculino', 'Dorsal', 'Activo'],
      ['Jugadora femenina', 'Femenino', 'Dorsal', 'Pendiente'],
      ['Staff', 'Staff', '-', 'Activo'],
    ],
    formTitle: 'Nuevo perfil',
    formFields: ['Nombre y apellidos', 'Equipo', 'Posición / rol', 'Instagram'],
  },
  calendario: {
    title: 'Partidos y temporadas',
    description: 'Base para crear partidos sin tener que editar el archivo de datos a mano.',
    fields: ['Temporada', 'Equipo', 'Fase', 'Estado'],
    rows: [
      ['2025/2026', 'Masculino', 'Fase 1 y fase 2', 'Cargado'],
      ['2026/2027', 'Masculino', 'Pendiente', 'Preparado'],
      ['2026/2027', 'Femenino', 'Pendiente', 'Preparado'],
    ],
    formTitle: 'Nuevo partido',
    formFields: ['Temporada', 'Rival', 'Fecha y hora', 'Pista'],
  },
  estadisticas: {
    title: 'Carga de estadísticas',
    description: 'Zona pensada para cruzar puntos oficiales con estadísticas avanzadas propias.',
    fields: ['Origen', 'Datos', 'Prioridad', 'Estado'],
    rows: [
      ['Federación', 'Minutos y puntos', 'Alta', 'Cargado'],
      ['Equipo', 'Rebotes, asistencias, faltas y valoración', 'Complementaria', 'Parcial'],
      ['Ficha jugador', 'Medias por temporada', 'Automática', 'Activa'],
    ],
    formTitle: 'Nueva línea estadística',
    formFields: ['Partido', 'Jugador', 'Minutos', 'Puntos / valoración'],
  },
  banquiger: {
    title: 'Control Banquiger',
    description: 'Administración futura del mercado, precios, jornadas y equipos de usuarios.',
    fields: ['Bloque', 'Regla', 'Datos', 'Estado'],
    rows: [
      ['Mercado', '7 jugadores por equipo', 'Presupuesto y precios', 'Jugable local'],
      ['Quinteto', 'Una posición por titular', 'x2 no puntos', 'Activo'],
      ['Clasificación', 'Equipos de usuarios', 'Puntos totales', 'Preparado'],
    ],
    formTitle: 'Nueva jornada fantasy',
    formFields: ['Temporada', 'Jornada', 'Cierre de mercado', 'Partido asociado'],
  },
};

const ControlPanelModulePage = () => {
  const { moduleId } = useParams();
  const { authMode, loading, isAuthenticated, isAdmin, user } = useAuth();

  const module = useMemo(
    () => controlPanelModules.find((item) => item.id === moduleId && item.id !== 'usuarios'),
    [moduleId],
  );

  const relatedTables = useMemo(() => {
    if (!module) return [];
    return controlPanelSchema.filter((table) => module.tables?.includes(table.name));
  }, [module]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4">
          <p className="text-sm font-black uppercase text-[hsl(43_65%_52%)]">Cargando módulo...</p>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/mi-cuenta" replace />;
  if (!module) return <Navigate to="/panel-control" replace />;

  const Icon = moduleIcons[module.id] || Database;
  const copy = moduleCopy[module.id];
  const workspace = moduleWorkspaces[module.id];

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Helmet>
        <title>{module.title} - Panel de control</title>
        <meta name="description" content={`${module.title} dentro del panel de control.`} />
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
            <div className="flex min-w-0 gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[hsl(43_65%_52%_/_0.25)] bg-[hsl(43_65%_52%_/_0.08)]">
                <Icon size={23} className="text-[hsl(43_65%_52%)]" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold uppercase text-[hsl(43_65%_52%)]">Panel de control</span>
                <h1 className="mt-1 text-white">{module.title}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-400">{module.description}</p>
              </div>
            </div>

            <div className="rounded-xl border border-[hsl(43_65%_52%_/_0.25)] bg-[hsl(43_65%_52%_/_0.08)] p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck size={22} className="text-[hsl(43_65%_52%)]" />
                <div>
                  <p className="text-xs font-bold uppercase text-gray-500">
                    Admin · {authMode === 'supabase' ? 'Supabase' : 'Local'}
                  </p>
                  <p className="text-sm font-black text-white">{user.email}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-5">
              <div className="mb-4 flex items-center gap-3">
                <CheckCircle2 size={22} className="text-[hsl(43_65%_52%)]" />
                <div>
                  <p className="text-xs font-bold uppercase text-[hsl(43_65%_52%)]">Estado</p>
                  <h2 className="text-xl font-black text-white">{module.status}</h2>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-gray-400">{copy?.note}</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {copy?.primaryAction && (
                  <Link
                    to={copy.primaryAction.href}
                    className="rounded-lg bg-[hsl(43_65%_52%)] px-4 py-3 text-center text-sm font-black uppercase text-black transition hover:bg-[hsl(43_65%_60%)]"
                  >
                    {copy.primaryAction.label}
                  </Link>
                )}
                <Link
                  to="/panel-control/usuarios"
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-black uppercase text-white transition hover:border-[hsl(43_65%_52%_/_0.65)]"
                >
                  Gestionar usuarios
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-5">
              <div className="mb-4 flex items-center gap-3">
                <Database size={22} className="text-[hsl(43_65%_52%)]" />
                <div>
                  <p className="text-xs font-bold uppercase text-[hsl(43_65%_52%)]">Construcción</p>
                  <h2 className="text-xl font-black text-white">Lo que activaremos aquí</h2>
                </div>
              </div>

              <ol className="space-y-3">
                {module.tasks?.map((task, index) => (
                  <li key={task} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(43_65%_52%)] text-xs font-black text-black">
                      {index + 1}
                    </span>
                    <p className="pt-1 text-sm leading-relaxed text-gray-400">{task}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {workspace && (
            <section className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <div className="rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <Save size={22} className="text-[hsl(43_65%_52%)]" />
                  <div>
                    <p className="text-xs font-bold uppercase text-[hsl(43_65%_52%)]">Formulario base</p>
                    <h2 className="text-xl font-black text-white">{workspace.formTitle}</h2>
                  </div>
                </div>

                <div className="grid gap-3">
                  {workspace.formFields.map((field) => (
                    <label key={field} className="block">
                      <span className="mb-2 block text-xs font-black uppercase text-gray-500">{field}</span>
                      <input
                        type="text"
                        disabled
                        placeholder="Pendiente de conectar a Supabase"
                        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm font-bold text-gray-500 outline-none"
                      />
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  disabled
                  className="mt-4 w-full rounded-lg bg-[hsl(43_65%_52%_/_0.35)] px-4 py-3 text-sm font-black uppercase text-black/60"
                >
                  Guardar cuando conectemos datos
                </button>
              </div>

              <div className="rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <ListChecks size={22} className="text-[hsl(43_65%_52%)]" />
                  <div>
                    <p className="text-xs font-bold uppercase text-[hsl(43_65%_52%)]">Vista de trabajo</p>
                    <h2 className="text-xl font-black text-white">{workspace.title}</h2>
                  </div>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-gray-400">{workspace.description}</p>

                <div className="overflow-hidden rounded-lg border border-white/10">
                  <div className="grid bg-black/50 text-[10px] font-black uppercase text-gray-500 sm:grid-cols-4">
                    {workspace.fields.map((field) => (
                      <span key={field} className="border-b border-white/10 px-3 py-2">
                        {field}
                      </span>
                    ))}
                  </div>
                  <div className="divide-y divide-white/10">
                    {workspace.rows.map((row) => (
                      <div key={row.join('-')} className="grid gap-1 px-3 py-3 text-sm sm:grid-cols-4 sm:gap-0 sm:px-0">
                        {row.map((cell, index) => (
                          <span
                            key={`${cell}-${index}`}
                            className={`min-w-0 px-0 font-bold sm:px-3 ${
                              index === row.length - 1 ? 'text-[hsl(43_65%_52%)]' : 'text-gray-300'
                            }`}
                          >
                            {cell}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="mt-6 rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-5">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase text-[hsl(43_65%_52%)]">Datos relacionados</p>
              <h2 className="text-xl font-black text-white">Tablas que usará este módulo</h2>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {relatedTables.map((table) => (
                <article key={table.name} className="rounded-lg border border-white/5 bg-black/30 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black text-white">{table.title}</h3>
                    <code className="text-xs font-bold text-[hsl(43_65%_52%)]">{table.name}</code>
                  </div>
                  <p className="text-xs leading-relaxed text-gray-400">{table.purpose}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {table.fields.map((field) => (
                      <span
                        key={field}
                        className="rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-gray-300"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ControlPanelModulePage;
