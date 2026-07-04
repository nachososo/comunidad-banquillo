import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Inbox, MailOpen, Trash2 } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import { getStoredContactMessages, saveStoredContactMessages } from '@/utils/contactStorage.js';

const ContactAdminPage = () => {
  const { loading, isAuthenticated, isAdmin } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (loading || !isAuthenticated || !isAdmin) return;
    const load = async () => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('contact_messages').select('*').neq('status', 'archived').order('created_at', { ascending: false });
        if (!error) setMessages(data || []);
        else setNotice(error.message);
      } else setMessages(getStoredContactMessages());
      setLoadingMessages(false);
    };
    load();
  }, [loading, isAuthenticated, isAdmin]);

  const unread = useMemo(() => messages.filter((message) => message.status === 'new').length, [messages]);

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] text-white"><Header /><main className="p-16 text-center">Cargando...</main></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/mi-cuenta" replace />;

  const updateStatus = async (id, status) => {
    if (isSupabaseConfigured) await supabase.from('contact_messages').update({ status }).eq('id', id);
    const next = messages.map((message) => message.id === id ? { ...message, status } : message);
    setMessages(next);
    if (!isSupabaseConfigured) saveStoredContactMessages(next);
  };

  const deleteMessage = async (id) => {
    if (isSupabaseConfigured) await supabase.from('contact_messages').update({ status: 'archived' }).eq('id', id);
    const next = messages.filter((message) => message.id !== id);
    setMessages(next);
    if (!isSupabaseConfigured) saveStoredContactMessages(next);
  };

  return <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-white">
    <Helmet><title>Mensajes - Panel de control</title></Helmet><Header />
    <main className="flex-1 py-10"><div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <Link to="/panel-control" className="mb-5 inline-flex items-center gap-2 text-sm font-black uppercase text-gray-400 hover:text-[hsl(43_65%_52%)]"><ArrowLeft size={17} /> Volver al panel</Link>
      <section className="mb-6 flex flex-col gap-4 rounded-xl border border-white/10 bg-[#111]/90 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">Administración</p><h1 className="mt-1">Mensajes de contacto</h1><p className="mt-2 text-sm text-gray-400">Bandeja de solicitudes recibidas desde la web.</p></div><div className="rounded-xl bg-[hsl(43_65%_52%_/_0.1)] px-5 py-4 text-center"><p className="text-3xl font-black text-[hsl(43_65%_62%)]">{unread}</p><p className="text-xs font-black uppercase text-gray-500">Sin leer</p></div></section>
      {notice && <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-200">{notice}</p>}
      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#111]/90">
        <div className="flex items-center gap-3 border-b border-white/10 p-4"><Inbox className="text-[hsl(43_65%_52%)]" /><h2 className="text-xl font-black">Bandeja de entrada</h2></div>
        {loadingMessages ? <p className="p-8 text-center text-gray-500">Cargando mensajes...</p> : messages.length === 0 ? <p className="p-8 text-center text-gray-500">No hay mensajes todavía.</p> : <div className="divide-y divide-white/10">{messages.map((message) => <article key={message.id} className={`p-5 ${message.status === 'new' ? 'bg-[hsl(43_65%_52%_/_0.04)]' : ''}`}><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{message.name}</h3>{message.status === 'new' && <span className="rounded-full bg-[hsl(43_65%_52%)] px-2 py-1 text-[9px] font-black uppercase text-black">Nuevo</span>}</div><a href={`mailto:${message.email}`} className="mt-1 block text-sm text-[hsl(43_65%_62%)]">{message.email}</a><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-300">{message.reason || message.message}</p><p className="mt-3 text-xs text-gray-600">{message.created_at ? new Date(message.created_at).toLocaleString('es-ES') : ''}</p></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => updateStatus(message.id, message.status === 'new' ? 'read' : 'new')} className="rounded-lg border border-white/10 p-2 text-gray-400 hover:text-white" aria-label="Cambiar estado"><MailOpen size={17} /></button><button type="button" onClick={() => deleteMessage(message.id)} className="rounded-lg border border-red-400/20 p-2 text-red-300 hover:bg-red-500/10" aria-label="Archivar mensaje"><Trash2 size={17} /></button></div></div></article>)}</div>}
      </section>
    </div></main><Footer />
  </div>;
};

export default ContactAdminPage;
