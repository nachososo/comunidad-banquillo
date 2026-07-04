import React from 'react';
import { Helmet } from 'react-helmet';
import { Link, Navigate } from 'react-router-dom';
import { Activity, LogOut, Settings, Shirt, UserRound } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';

const AccountPage = () => {
  const { user, loading, isAuthenticated, isAdmin, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4">
          <p className="text-sm font-black uppercase text-[hsl(43_65%_52%)]">Cargando sesión...</p>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Helmet>
        <title>Mi cuenta - La Comunidad del Banquillo</title>
      </Helmet>

      <Header />

      <main className="flex-1 py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <span className="text-sm font-bold uppercase text-[hsl(43_65%_52%)]">Área privada</span>
            <h1 className="mt-2 text-white">Mi cuenta</h1>
          </div>

          <section className="grid gap-4 md:grid-cols-[0.85fr_1.15fr]">
            <article className="rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-5">
              <div className="mb-4 inline-flex rounded-lg border border-[hsl(43_65%_52%_/_0.25)] bg-[hsl(43_65%_52%_/_0.08)] p-3">
                <UserRound size={24} className="text-[hsl(43_65%_52%)]" />
              </div>
              <h2 className="text-2xl font-black text-white">{user.name}</h2>
              <p className="mt-1 text-sm text-gray-400">{user.email}</p>
              <p className="mt-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black uppercase text-gray-300">
                {isAdmin ? 'Administrador' : 'Usuario'}
              </p>

              <button
                type="button"
                onClick={signOut}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-black uppercase text-red-200 transition hover:bg-red-500/15"
              >
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </article>

            <div className="grid gap-4">
              <Link
                to="/banquiger/panel"
                className="rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-5 transition hover:border-[hsl(43_65%_52%_/_0.6)]"
              >
                <Shirt size={22} className="mb-3 text-[hsl(43_65%_52%)]" />
                <h2 className="text-xl font-black text-white">Banquiger</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  Entrar a tu equipo fantasy, mercado y clasificación general.
                </p>
              </Link>

              <Link
                to="/app-estadisticas"
                className="rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-5 transition hover:border-[hsl(43_65%_52%_/_0.6)]"
              >
                <Activity size={22} className="mb-3 text-[hsl(43_65%_52%)]" />
                <h2 className="text-xl font-black text-white">App de estadísticas</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  Acceso privado para registrar estadísticas de partido si tienes permiso de anotador.
                </p>
              </Link>

              {isAdmin && (
                <Link
                  to="/panel-control"
                  className="rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-5 transition hover:border-[hsl(43_65%_52%_/_0.6)]"
                >
                  <Settings size={22} className="mb-3 text-[hsl(43_65%_52%)]" />
                  <h2 className="text-xl font-black text-white">Panel de control</h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">
                    Gestionar usuarios, calendario, plantillas, estadísticas, mensajes y Banquiger.
                  </p>
                </Link>
              )}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AccountPage;
