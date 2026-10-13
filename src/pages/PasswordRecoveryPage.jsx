import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation } from 'react-router-dom';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';

const fieldClass = 'w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-[hsl(43_65%_52%)]';

export default function PasswordRecoveryPage({ reset = false }) {
  const { user, loading, recoveryFailed, requestPasswordReset, updatePassword } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const validSession = Boolean(user) && !recoveryFailed;
  const title = reset ? 'Nueva contraseña' : 'Recuperar contraseña';

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (reset && password !== confirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    try {
      if (reset) await updatePassword(password, confirmation);
      else await requestPasswordReset(email);
      setPassword('');
      setConfirmation('');
      setSuccess(true);
    } catch (err) {
      const code = err.code || '';
      setError(code === 'over_email_send_rate_limit' || err.status === 429
        ? 'Espera unos minutos antes de solicitar otro correo.'
        : code === 'same_password'
          ? 'Elige una contraseña distinta de la anterior.'
          : reset ? 'No se ha podido guardar la contraseña. Comprueba los requisitos o solicita un nuevo enlace.'
            : 'No se ha podido enviar el correo. Inténtalo de nuevo en unos minutos.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Helmet><title>{title} - La Comunidad del Banquillo</title><meta name="robots" content="noindex, nofollow" /><meta name="referrer" content="no-referrer" /></Helmet>
      <Header />
      <main className="flex-1 px-4 py-12">
        <section className="mx-auto max-w-lg rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-6">
          <h1 className="text-2xl font-black text-white">{title}</h1>
          {success ? (
            <div role="status" className="mt-5 space-y-4 text-gray-300">
              <p>{reset ? 'Tu contraseña se ha actualizado. Ya puedes acceder con la nueva contraseña.' : 'Si existe una cuenta con ese correo, recibirás un enlace para cambiar la contraseña. Revisa también la carpeta de spam.'}</p>
              <Link className="inline-block font-bold text-[hsl(43_65%_52%)]" to={reset ? '/mi-cuenta' : '/login'}>{reset ? 'Ir a mi cuenta' : 'Volver a iniciar sesión'}</Link>
            </div>
          ) : reset && loading ? (
            <p role="status" className="mt-5 text-gray-300">Comprobando el enlace…</p>
          ) : reset && !validSession ? (
            <div className="mt-5 space-y-4 text-gray-300">
              <p role="alert">El enlace no es válido o ha caducado. Solicita otro correo para recuperar tu contraseña.</p>
              <Link to="/recuperar-contrasena" className="inline-block font-bold text-[hsl(43_65%_52%)]">Solicitar un nuevo enlace</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-5">
              <p className="text-sm leading-relaxed text-gray-400">{reset ? 'Introduce tu nueva contraseña y repítela para confirmarla.' : 'Introduce el correo de tu cuenta y te enviaremos un enlace para elegir una nueva contraseña.'}</p>
              {reset ? (<>
                <label className="block"><span className="mb-2 block text-sm text-gray-300">Nueva contraseña</span><input type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={fieldClass} /><span className="mt-1 block text-xs text-gray-400">Mínimo 6 caracteres.</span></label>
                <label className="block"><span className="mb-2 block text-sm text-gray-300">Repetir contraseña</span><input type="password" autoComplete="new-password" required minLength={6} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className={fieldClass} /></label>
              </>) : (
                <label className="block"><span className="mb-2 block text-sm text-gray-300">Correo electrónico</span><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} /></label>
              )}
              {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
              <button type="submit" disabled={busy || (reset && loading)} className="w-full rounded-lg bg-[hsl(43_65%_52%)] px-4 py-3 text-sm font-black text-black transition hover:bg-[hsl(43_65%_60%)] disabled:opacity-60">{busy ? (reset ? 'Guardando…' : 'Enviando…') : reset ? 'Guardar contraseña' : 'Enviar enlace de recuperación'}</button>
              <Link to="/login" className="block text-center text-sm font-bold text-[hsl(43_65%_52%)]">Volver a iniciar sesión</Link>
            </form>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
