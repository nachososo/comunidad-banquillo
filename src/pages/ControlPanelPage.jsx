import React from 'react';
import { Helmet } from 'react-helmet';
import { Link, Navigate } from 'react-router-dom';
import {
  CalendarDays,
  ArrowUpRight,
  Cloud,
  LayoutDashboard,
  MessageSquareText,
  Newspaper,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';
import { controlPanelModules } from '@/data/controlPanelSchema.js';

const storageGroups = [
  {
    title: 'Datos compartidos',
    description: 'Cambios visibles para todos los usuarios y dispositivos.',
    label: 'Supabase',
    icon: Cloud,
    modules: ['Usuarios', 'Contenido', 'Noticias', 'Plantillas', 'Calendario', 'Estadísticas', 'App de estadísticas', 'Banquiger', '18-0', 'Mensajes'],
  },
];

const publicLinks = [
  { label: 'Ver la web', to: '/', icon: LayoutDashboard },
  { label: 'Calendario público', to: '/calendario', icon: CalendarDays },
  { label: 'Noticias públicas', to: '/noticias', icon: Newspaper },
  { label: 'Formulario de contacto', to: '/contacto', icon: MessageSquareText },
  { label: 'Mi cuenta', to: '/mi-cuenta', icon: UsersRound },
];

const ControlPanelPage = () => {
  const { authMode, loading, isAuthenticated, isAdmin, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4">
          <p className="text-sm font-black uppercase text-[hsl(43_65%_52%)]">Cargando panel...</p>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/mi-cuenta" replace />;

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Helmet>
        <title>Panel de control - La Comunidad del Banquillo</title>
        <meta name="description" content="Panel de control de La Comunidad del Banquillo." />
      </Helmet>

      <Header />

      <main className="flex-1 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <section className="mb-6 flex flex-col gap-4 rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="text-sm font-bold uppercase text-[hsl(43_65%_52%)]">Administración</span>
              <h1 className="mt-2 text-white">Panel de control</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400">
                Centro privado para gestionar el contenido, la competición y los juegos de la comunidad desde un único lugar.
              </p>
            </div>
            <div className="rounded-xl border border-[hsl(43_65%_52%_/_0.25)] bg-[hsl(43_65%_52%_/_0.08)] p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck size={22} className="text-[hsl(43_65%_52%)]" />
                <div>
                  <p className="text-xs font-bold uppercase text-gray-500">
                    Sesión admin · {authMode === 'supabase' ? 'Supabase' : 'Local'}
                  </p>
                  <p className="text-sm font-black text-white">{user.email}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {controlPanelModules.map((module) => {
              const CardTag = module.href ? Link : 'article';
              const cardProps = module.href ? { to: module.href } : {};

              return (
                <CardTag
                  key={module.title}
                  {...cardProps}
                  className="rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-4 transition hover:border-[hsl(43_65%_52%_/_0.6)]"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="rounded-lg border border-[hsl(43_65%_52%_/_0.25)] bg-[hsl(43_65%_52%_/_0.08)] p-2">
                      <LayoutDashboard size={19} className="text-[hsl(43_65%_52%)]" />
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase text-gray-300">
                      {module.status}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-white">{module.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{module.description}</p>
                </CardTag>
              );
            })}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-xl border border-white/10 bg-[#111]/90 p-5">
              <div className="mb-5"><p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">Almacenamiento</p><h2 className="mt-1 text-xl font-black text-white">Dónde se guardan los cambios</h2><p className="mt-2 text-sm text-gray-500">Una vista sencilla del estado real de cada módulo.</p></div>
              <div className="grid gap-4">
                {storageGroups.map(({ title, description, label, icon: Icon, modules }) => (
                  <article key={title} className="rounded-xl border border-white/10 bg-black/25 p-5">
                    <div className="flex items-start justify-between gap-3"><span className="rounded-lg bg-[hsl(43_65%_52%_/_0.1)] p-2.5"><Icon size={20} className="text-[hsl(43_65%_52%)]" /></span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase text-gray-300">{label}</span></div>
                    <h3 className="mt-4 text-lg font-black text-white">{title}</h3><p className="mt-1 min-h-10 text-sm leading-relaxed text-gray-500">{description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">{modules.map((module) => <span key={module} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-gray-300">{module}</span>)}</div>
                  </article>
                ))}
              </div>
            </div>

            <aside className="rounded-xl border border-white/10 bg-[#111]/90 p-5">
              <div className="mb-5"><p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">Accesos rápidos</p><h2 className="mt-1 text-xl font-black text-white">Comprobar la web</h2></div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {publicLinks.map(({ label, to, icon: Icon }) => <Link key={to} to={to} className="group flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 p-4 transition hover:border-[hsl(43_65%_52%_/_0.55)] hover:bg-[hsl(43_65%_52%_/_0.05)]"><span className="rounded-lg bg-white/5 p-2"><Icon size={18} className="text-[hsl(43_65%_52%)]" /></span><span className="flex-1 text-sm font-black text-white">{label}</span><ArrowUpRight size={16} className="text-gray-600 transition group-hover:text-[hsl(43_65%_52%)]" /></Link>)}
              </div>
            </aside>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ControlPanelPage;
