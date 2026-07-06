import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';

const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading: authLoading, signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatusMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const result = await signUp({ name, email, password });

      if (result.needsConfirmation) {
        setSuccessMessage('Cuenta creada. Revisa tu correo para confirmar el acceso antes de iniciar sesión.');
        return;
      }

      navigate(location.state?.from || (result.user.role === 'admin' ? '/panel-control' : '/mi-cuenta'));
    } catch (error) {
      setStatusMessage(error.message || 'No se ha podido crear la cuenta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Helmet>
        <title>Crear cuenta - La Comunidad del Banquillo</title>
        <meta name="description" content="Crear cuenta de usuario para La Comunidad del Banquillo." />
      </Helmet>

      <Header />

      <main className="flex-1 py-12">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <section>
            <span className="text-sm font-bold uppercase text-[hsl(43_65%_52%)]">Registro</span>
            <h1 className="mt-2 text-white">Crear cuenta</h1>
            <p className="mt-4 text-base leading-relaxed text-gray-300">
              Crea tu cuenta con nombre, correo y contraseña. Ese nombre se guardará como tu perfil público dentro del
              sistema privado de la web.
            </p>
            <div className="mt-5 rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-4">
              <p className="text-sm leading-relaxed text-gray-400">
                Al registrarte podrás guardar tus equipos y acceder a las funciones exclusivas de la comunidad. Si se
                solicita confirmar el correo, revisa tu bandeja de entrada antes de iniciar sesión.
              </p>
            </div>
          </section>

          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-5 shadow-xl"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-lg border border-[hsl(43_65%_52%_/_0.25)] bg-[hsl(43_65%_52%_/_0.08)] p-2">
                <UserPlus size={20} className="text-[hsl(43_65%_52%)]" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-[hsl(43_65%_52%)]">Alta de usuario</p>
                <h2 className="text-xl font-black text-white">Nueva cuenta</h2>
              </div>
            </div>

            <label className="mb-4 block">
              <span className="mb-2 block text-xs font-bold uppercase text-gray-500">Nombre</span>
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Tu nombre"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-[hsl(43_65%_52%)]"
              />
            </label>

            <label className="mb-5 block">
              <span className="mb-2 block text-xs font-bold uppercase text-gray-500">Correo electrónico</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-[hsl(43_65%_52%)]"
              />
            </label>

            <label className="mb-5 block">
              <span className="mb-2 block text-xs font-bold uppercase text-gray-500">Contraseña</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-[hsl(43_65%_52%)]"
              />
            </label>

            {statusMessage && (
              <p className="mb-4 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-100">
                {statusMessage}
              </p>
            )}

            {successMessage && (
              <p className="mb-4 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-100">
                {successMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading || isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[hsl(43_65%_52%)] px-4 py-3 text-sm font-black uppercase text-black transition hover:bg-[hsl(43_65%_60%)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UserPlus size={17} />
              {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>

            <p className="mt-5 text-center text-sm font-bold text-gray-400">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" state={location.state} className="text-[hsl(43_65%_52%)] transition hover:text-[hsl(43_65%_60%)]">
                Inicia sesión
              </Link>
            </p>

            <Link
              to="/login"
              state={location.state}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-black uppercase text-white transition hover:border-[hsl(43_65%_52%_/_0.65)]"
            >
              <LogIn size={17} />
              Volver al login
            </Link>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default RegisterPage;
