import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ShieldCheck, UserCog, UsersRound } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';

const roles = [
  { value: 'admin', label: 'Administrador', description: 'Acceso completo al panel.' },
  { value: 'editor', label: 'Editor', description: 'Podrá gestionar contenido cuando activemos módulos.' },
  { value: 'member', label: 'Usuario', description: 'Cuenta normal de la web.' },
];

const getRoleLabel = (role) => roles.find((item) => item.value === role)?.label || role;

const UserManagementPage = () => {
  const { authMode, loading, isAuthenticated, isAdmin, user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [savingUserId, setSavingUserId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const loadProfiles = useCallback(async () => {
    setIsLoadingProfiles(true);
    setErrorMessage('');

    if (!isSupabaseConfigured) {
      setProfiles([
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          created_at: user.createdAt,
        },
      ]);
      setIsLoadingProfiles(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,name,role,created_at')
      .order('created_at', { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setProfiles([]);
    } else {
      setProfiles(data || []);
    }

    setIsLoadingProfiles(false);
  }, [user]);

  const roleCounts = useMemo(
    () =>
      profiles.reduce(
        (counts, profile) => ({
          ...counts,
          [profile.role]: (counts[profile.role] || 0) + 1,
        }),
        {},
      ),
    [profiles],
  );

  useEffect(() => {
    if (loading || !isAuthenticated || !isAdmin) return;

    loadProfiles();
  }, [isAdmin, isAuthenticated, loadProfiles, loading]);

  const handleRoleChange = async (profileId, nextRole) => {
    if (profileId === user.id) {
      setErrorMessage('Para evitar bloquearte el acceso, tu propio rol de administrador no se cambia desde aquí.');
      return;
    }

    setSavingUserId(profileId);
    setErrorMessage('');
    setSuccessMessage('');

    if (!isSupabaseConfigured) {
      setProfiles((currentProfiles) =>
        currentProfiles.map((profile) => (profile.id === profileId ? { ...profile, role: nextRole } : profile)),
      );
      setSuccessMessage('Rol actualizado en modo local.');
      setSavingUserId(null);
      return;
    }

    const { error } = await supabase.from('profiles').update({ role: nextRole }).eq('id', profileId);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setProfiles((currentProfiles) =>
        currentProfiles.map((profile) => (profile.id === profileId ? { ...profile, role: nextRole } : profile)),
      );
      setSuccessMessage('Rol actualizado correctamente.');
    }

    setSavingUserId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4">
          <p className="text-sm font-black uppercase text-[hsl(43_65%_52%)]">Cargando usuarios...</p>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/mi-cuenta" replace />;

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Helmet>
        <title>Usuarios - Panel de control</title>
        <meta name="description" content="Gestión de usuarios de La Comunidad del Banquillo." />
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

          <section className="mb-6 flex flex-col gap-4 rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="text-sm font-bold uppercase text-[hsl(43_65%_52%)]">Panel de control</span>
              <h1 className="mt-2 text-white">Usuarios</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400">
                Cuentas registradas en la web y permisos asociados. Por ahora los roles sirven para controlar el acceso
                al panel; después los usaremos para decidir quién puede editar calendario, estadísticas o contenido.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-[hsl(43_65%_52%_/_0.25)] bg-[hsl(43_65%_52%_/_0.08)] p-4">
              <div className="flex flex-1 items-center gap-3">
                <ShieldCheck size={22} className="text-[hsl(43_65%_52%)]" />
                <div>
                  <p className="text-xs font-bold uppercase text-gray-500">
                    Backend · {authMode === 'supabase' ? 'Supabase' : 'Local'}
                  </p>
                  <p className="text-sm font-black text-white">{profiles.length} usuarios</p>
                </div>
              </div>
              <button
                type="button"
                onClick={loadProfiles}
                disabled={isLoadingProfiles}
                className="rounded-lg border border-white/10 bg-black/20 p-2 text-[hsl(43_65%_52%)] transition hover:border-[hsl(43_65%_52%_/_0.65)] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Actualizar usuarios"
                title="Actualizar usuarios"
              >
                <RefreshCw size={18} className={isLoadingProfiles ? 'animate-spin' : ''} />
              </button>
            </div>
          </section>

          <section className="mb-6 grid gap-3 sm:grid-cols-3">
            {roles.map((role) => (
              <article key={role.value} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-black uppercase text-gray-500">{role.label}</p>
                <p className="mt-2 text-3xl font-black text-white">{roleCounts[role.value] || 0}</p>
                <p className="mt-2 text-xs leading-relaxed text-gray-400">{role.description}</p>
              </article>
            ))}
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

          <section className="rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90">
            <div className="flex items-center gap-3 border-b border-white/10 p-4">
              <UsersRound size={21} className="text-[hsl(43_65%_52%)]" />
              <div>
                <p className="text-xs font-bold uppercase text-[hsl(43_65%_52%)]">Perfiles</p>
                <h2 className="text-xl font-black text-white">Cuentas registradas</h2>
              </div>
            </div>

            {isLoadingProfiles ? (
              <div className="p-8 text-center">
                <p className="text-sm font-black uppercase text-gray-400">Cargando perfiles...</p>
              </div>
            ) : profiles.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-black uppercase text-gray-400">Todavía no hay usuarios registrados.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {profiles.map((profile) => (
                  <article
                    key={profile.id}
                    className="grid gap-4 p-4 md:grid-cols-[minmax(0,1.4fr)_minmax(160px,0.55fr)_minmax(180px,0.6fr)] md:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[hsl(43_65%_52%_/_0.25)] bg-[hsl(43_65%_52%_/_0.08)]">
                        <UserCog size={20} className="text-[hsl(43_65%_52%)]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-black text-white">{profile.name}</h3>
                        <p className="truncate text-sm text-gray-400">{profile.email}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase text-gray-500">Rol actual</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="text-sm font-black text-[hsl(43_65%_52%)]">{getRoleLabel(profile.role)}</p>
                        {profile.id === user.id && (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black uppercase text-gray-300">
                            Tu cuenta
                          </span>
                        )}
                      </div>
                    </div>

                    <label className="block">
                      <span className="mb-2 block text-xs font-black uppercase text-gray-500">Cambiar rol</span>
                      <select
                        value={profile.role}
                        disabled={savingUserId === profile.id || profile.id === user.id}
                        onChange={(event) => handleRoleChange(profile.id, event.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm font-bold text-white outline-none transition focus:border-[hsl(43_65%_52%)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {roles.map((role) => (
                          <option key={role.value} value={role.value} className="bg-[#111] text-white">
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default UserManagementPage;
