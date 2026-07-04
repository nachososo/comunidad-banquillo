import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, Send, UserRound } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import { saveLocalContactMessage } from '@/utils/contactStorage.js';

const ContactPage = () => {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSending(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const message = { name: form.get('name'), email: form.get('email'), reason: form.get('message') };
    if (isSupabaseConfigured) {
      const { error: submitError } = await supabase.from('contact_messages').insert(message);
      if (submitError) {
        setError('No se pudo enviar el mensaje. Inténtalo de nuevo en unos minutos.');
        setSending(false);
        return;
      }
    } else {
      saveLocalContactMessage(message);
    }
    setSubmitted(true);
    event.currentTarget.reset();
    setSending(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Helmet>
        <title>Ponte en contacto con nosotros - La Comunidad del Banquillo</title>
        <meta
          name="description"
          content="Contacta con La Comunidad del Banquillo. Escríbenos tu nombre, correo electrónico y motivo de contacto."
        />
      </Helmet>

      <Header />

      <main className="flex-1 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-white mb-4">Ponte en contacto con nosotros</h1>
            <p className="text-gray-400 text-lg mx-auto">
              Cuéntanos quién eres y el motivo de tu mensaje. Te leeremos con calma.
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            onSubmit={handleSubmit}
            className="bg-[#111]/90 backdrop-blur-sm rounded-2xl border border-[hsl(43_65%_52%_/_0.28)] p-6 sm:p-8 gold-glow"
          >
            <div className="grid grid-cols-1 gap-6">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[hsl(43_65%_52%)]">
                  <UserRound size={18} />
                  Nombre y apellidos
                </span>
                <input
                  type="text"
                  name="name"
                  required
                  autoComplete="name"
                  className="w-full rounded-lg border border-[hsl(43_65%_52%_/_0.28)] bg-[#181818] px-4 py-3 text-white outline-none transition-smooth placeholder:text-gray-500 focus:border-[hsl(43_65%_52%)] focus:ring-2 focus:ring-[hsl(43_65%_52%_/_0.18)]"
                  placeholder="Tu nombre completo"
                />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[hsl(43_65%_52%)]">
                  <Mail size={18} />
                  Correo electrónico
                </span>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-[hsl(43_65%_52%_/_0.28)] bg-[#181818] px-4 py-3 text-white outline-none transition-smooth placeholder:text-gray-500 focus:border-[hsl(43_65%_52%)] focus:ring-2 focus:ring-[hsl(43_65%_52%_/_0.18)]"
                  placeholder="tu@email.com"
                />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[hsl(43_65%_52%)]">
                  <MessageSquare size={18} />
                  Motivo de contacto
                </span>
                <textarea
                  name="message"
                  required
                  rows={7}
                  className="w-full resize-y rounded-lg border border-[hsl(43_65%_52%_/_0.28)] bg-[#181818] px-4 py-3 text-white outline-none transition-smooth placeholder:text-gray-500 focus:border-[hsl(43_65%_52%)] focus:ring-2 focus:ring-[hsl(43_65%_52%_/_0.18)]"
                  placeholder="Escribe aquí el motivo por el que quieres contactar con nosotros"
                />
              </label>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(43_65%_52%)] px-6 py-3 text-sm font-bold text-black transition-smooth hover:bg-[hsl(43_75%_58%)]"
              >
                <Send size={18} />
                {sending ? 'Enviando...' : 'Enviar mensaje'}
              </button>

              {submitted && (
                <p className="text-sm font-medium text-[hsl(43_65%_52%)]">
                  Mensaje preparado. Gracias por contactar con nosotros.
                </p>
              )}
              {error && <p className="text-sm font-medium text-red-300">{error}</p>}
            </div>
          </motion.form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ContactPage;
