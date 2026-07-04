import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, FilePenLine, RotateCcw, Save, ShieldCheck, Sparkles } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';
import { defaultSiteContent, mergeSiteContent, siteContentGroups } from '@/data/siteContent.js';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';

const typeOptions = [
  { value: 'text', label: 'Texto editable' },
  { value: 'internal', label: 'Ruta interna' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'website', label: 'Web externa' },
];

const emptyForm = {
  key: '',
  section: 'home_highlights',
  label: '',
  href: '',
  type: 'text',
  visible: true,
  sort_order: 10,
};

const ContentAdminPage = () => {
  const { authMode, loading, isAuthenticated, isAdmin, user } = useAuth();
  const [items, setItems] = useState(defaultSiteContent);
  const [form, setForm] = useState(defaultSiteContent[0] || emptyForm);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [savingContent, setSavingContent] = useState(false);
  const [seedingContent, setSeedingContent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [usingLocalReference, setUsingLocalReference] = useState(false);
  const isTextBlock = form.type === 'text';

  const groupedItems = useMemo(
    () =>
      items.reduce((groups, item) => {
        const sectionItems = groups[item.section] || [];
        return {
          ...groups,
          [item.section]: [...sectionItems, item].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
        };
      }, {}),
    [items],
  );

  const stats = useMemo(
    () => ({
      total: items.length,
      visible: items.filter((item) => item.visible !== false).length,
      hidden: items.filter((item) => item.visible === false).length,
    }),
    [items],
  );

  const loadContent = async () => {
    setIsLoadingContent(true);
    setErrorMessage('');
    setSuccessMessage('');
    setUsingLocalReference(false);

    if (!isSupabaseConfigured) {
      setItems(defaultSiteContent);
      setForm(defaultSiteContent[0] || emptyForm);
      setUsingLocalReference(true);
      setIsLoadingContent(false);
      return;
    }

    const { data, error } = await supabase
      .from('site_content')
      .select('key,section,label,href,type,visible,sort_order')
      .order('section', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) {
      setErrorMessage(`No he podido leer site_content: ${error.message}`);
      setItems(defaultSiteContent);
      setForm(defaultSiteContent[0] || emptyForm);
      setUsingLocalReference(true);
    } else {
      const mergedContent = mergeSiteContent(data || []);
      setItems(mergedContent);
      setForm(mergedContent[0] || emptyForm);
    }

    setIsLoadingContent(false);
  };

  useEffect(() => {
    if (loading || !isAuthenticated || !isAdmin) return;
    loadContent();
  }, [isAdmin, isAuthenticated, loading]);

  const handleEdit = (item) => {
    setForm({
      key: item.key,
      section: item.section || 'quick_links',
      label: item.label || '',
      href: item.href || '',
      type: item.type || 'internal',
      visible: item.visible !== false,
      sort_order: item.sort_order || 0,
    });
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleNew = () => {
    setForm({
      ...emptyForm,
      key: `custom_${Date.now()}`,
      sort_order: items.length * 10 + 10,
    });
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSavingContent(true);
    setErrorMessage('');
    setSuccessMessage('');

    const payload = {
      key: form.key.trim(),
      section: form.section,
      label: form.label.trim(),
      href: form.href.trim(),
      type: form.type,
      visible: form.visible,
      sort_order: Number(form.sort_order) || 0,
    };

    if (payload.type === 'text' && !payload.href) {
      payload.href = 'Bloque de texto editable desde el panel de control.';
    }

    if (!payload.key || !payload.label || !payload.href) {
      setErrorMessage(payload.type === 'text'
        ? 'La clave y el texto publicado son obligatorios.'
        : 'La clave, el texto visible y el enlace son obligatorios.');
      setSavingContent(false);
      return;
    }

    if (!isSupabaseConfigured || usingLocalReference) {
      setItems((currentItems) => {
        const exists = currentItems.some((item) => item.key === payload.key);
        return exists
          ? currentItems.map((item) => (item.key === payload.key ? payload : item))
          : mergeSiteContent([...currentItems, payload]);
      });
      setSuccessMessage('Contenido actualizado en vista local. Para guardarlo definitivo necesitamos la tabla de Supabase.');
      setSavingContent(false);
      return;
    }

    const { data, error } = await supabase
      .from('site_content')
      .upsert(payload, { onConflict: 'key' })
      .select('key,section,label,href,type,visible,sort_order')
      .single();

    if (error) {
      setErrorMessage(error.message);
    } else {
      setItems((currentItems) => {
        const exists = currentItems.some((item) => item.key === data.key);
        return exists ? currentItems.map((item) => (item.key === data.key ? data : item)) : mergeSiteContent([...currentItems, data]);
      });
      setForm(data);
      setSuccessMessage('Contenido guardado correctamente.');
    }

    setSavingContent(false);
  };

  const seedDefaultContent = async () => {
    setSeedingContent(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!isSupabaseConfigured || usingLocalReference) {
      setItems(defaultSiteContent);
      setForm(defaultSiteContent[0] || emptyForm);
      setSuccessMessage('He restaurado los valores base en vista local.');
      setSeedingContent(false);
      return;
    }

    const { data, error } = await supabase
      .from('site_content')
      .upsert(defaultSiteContent, { onConflict: 'key' })
      .select('key,section,label,href,type,visible,sort_order');

    if (error) {
      setErrorMessage(error.message);
    } else {
      const mergedContent = mergeSiteContent(data || []);
      setItems(mergedContent);
      setForm(mergedContent[0] || emptyForm);
      setSuccessMessage('Valores base sincronizados con Supabase.');
    }

    setSeedingContent(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4">
          <p className="text-sm font-black uppercase text-[hsl(43_65%_52%)]">Cargando contenido...</p>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/mi-cuenta" replace />;

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Helmet>
        <title>Contenido web - Panel de control</title>
        <meta name="description" content="Gestión de enlaces, redes y patrocinadores de La Comunidad del Banquillo." />
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
              <h1 className="mt-2 text-white">Contenido web</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400">
                Edita enlaces rápidos, redes, patrocinador, textos de la portada, tarjetas principales, avisos
                temporales y la frase inferior del pie de página.
              </p>
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

          <section className="mb-6 grid gap-3 sm:grid-cols-3">
            <article className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-black uppercase text-gray-500">Bloques</p>
              <p className="mt-2 text-3xl font-black text-white">{stats.total}</p>
            </article>
            <article className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-black uppercase text-gray-500">Visibles</p>
              <p className="mt-2 text-3xl font-black text-white">{stats.visible}</p>
            </article>
            <article className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-black uppercase text-gray-500">Ocultos</p>
              <p className="mt-2 text-3xl font-black text-white">{stats.hidden}</p>
            </article>
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

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
                <div className="flex items-center gap-3">
                  <FilePenLine size={21} className="text-[hsl(43_65%_52%)]" />
                  <div>
                    <p className="text-xs font-bold uppercase text-[hsl(43_65%_52%)]">Web pública</p>
                    <h2 className="text-xl font-black text-white">Bloques editables</h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleNew}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase text-white transition hover:border-[hsl(43_65%_52%_/_0.65)]"
                >
                  Nuevo bloque
                </button>
              </div>

              {isLoadingContent ? (
                <div className="p-8 text-center">
                  <p className="text-sm font-black uppercase text-gray-400">Cargando contenido...</p>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {Object.entries(siteContentGroups).map(([section, title]) => (
                    <div key={section} className="p-4">
                      <h3 className="mb-3 text-sm font-black uppercase text-[hsl(43_65%_52%)]">{title}</h3>
                      <div className="space-y-2">
                        {(groupedItems[section] || []).map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => handleEdit(item)}
                            className={`grid w-full gap-3 rounded-lg border p-3 text-left transition sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${
                              form.key === item.key
                                ? 'border-[hsl(43_65%_52%)] bg-[hsl(43_65%_52%_/_0.08)]'
                                : 'border-white/10 bg-black/25 hover:border-[hsl(43_65%_52%_/_0.55)]'
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-black text-white">{item.label}</span>
                              <span className="mt-1 block truncate text-xs text-gray-500">{item.href}</span>
                            </span>
                            <span className="inline-flex items-center gap-2 text-xs font-black uppercase text-gray-400">
                              {item.visible === false ? <EyeOff size={16} /> : <Eye size={16} />}
                              {item.visible === false ? 'Oculto' : 'Visible'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-5">
              <div className="mb-5 flex items-center gap-3">
                <Sparkles size={22} className="text-[hsl(43_65%_52%)]" />
                <div>
                  <p className="text-xs font-bold uppercase text-[hsl(43_65%_52%)]">Edición</p>
                  <h2 className="text-xl font-black text-white">Datos del bloque</h2>
                </div>
              </div>

              <div className="grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase text-gray-500">Clave interna</span>
                  <input
                    type="text"
                    value={form.key}
                    onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-[hsl(43_65%_52%)]"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase text-gray-500">Zona</span>
                    <select
                      value={form.section}
                      onChange={(event) => setForm((current) => ({ ...current, section: event.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-[hsl(43_65%_52%)]"
                    >
                      {Object.entries(siteContentGroups).map(([value, label]) => (
                        <option key={value} value={value} className="bg-[#111] text-white">
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase text-gray-500">Tipo</span>
                    <select
                      value={form.type}
                      onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-[hsl(43_65%_52%)]"
                    >
                      {typeOptions.map((type) => (
                        <option key={type.value} value={type.value} className="bg-[#111] text-white">
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase text-gray-500">
                    {isTextBlock ? 'Texto publicado' : 'Texto visible'}
                  </span>
                  {isTextBlock ? (
                    <textarea
                      rows={4}
                      value={form.label}
                      onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                      className="w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-[hsl(43_65%_52%)]"
                    />
                  ) : (
                    <input
                      type="text"
                      value={form.label}
                      onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-[hsl(43_65%_52%)]"
                    />
                  )}
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase text-gray-500">
                    {isTextBlock ? 'Nota interna / ayuda' : 'Enlace'}
                  </span>
                  <input
                    type="text"
                    value={form.href}
                    onChange={(event) => setForm((current) => ({ ...current, href: event.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-[hsl(43_65%_52%)]"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase text-gray-500">Orden</span>
                    <input
                      type="number"
                      value={form.sort_order}
                      onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-[hsl(43_65%_52%)]"
                    />
                  </label>

                  <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={form.visible}
                      onChange={(event) => setForm((current) => ({ ...current, visible: event.target.checked }))}
                      className="h-5 w-5 accent-[hsl(43_65%_52%)]"
                    />
                    <span className="text-sm font-black uppercase text-white">Visible en la web</span>
                  </label>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="submit"
                  disabled={savingContent}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(43_65%_52%)] px-4 py-3 text-sm font-black uppercase text-black transition hover:bg-[hsl(43_65%_60%)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={17} />
                  {savingContent ? 'Guardando...' : 'Guardar bloque'}
                </button>
                <button
                  type="button"
                  onClick={seedDefaultContent}
                  disabled={seedingContent}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-black uppercase text-white transition hover:border-[hsl(43_65%_52%_/_0.65)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RotateCcw size={17} />
                  {seedingContent ? 'Restaurando...' : 'Restaurar base'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ContentAdminPage;
