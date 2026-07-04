import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, ImageUp, Newspaper, Plus, RotateCcw, Save, Star, Trash2 } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';
import { createNewsSlug, defaultNewsPosts, normalizeNewsPost, sortNewsPosts } from '@/data/newsPosts.js';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';

const createEmptyPost = () => ({
  id: '',
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  cover_url: '',
  category: 'Club',
  author: '',
  published: false,
  featured: false,
  published_at: new Date().toISOString().slice(0, 16),
});

const toDatetimeLocal = (value) => {
  if (!value) return new Date().toISOString().slice(0, 16);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 16);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const NEWS_IMAGES_BUCKET = 'news-images';
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const NewsAdminPage = () => {
  const { authMode, loading, isAuthenticated, isAdmin, user } = useAuth();
  const [posts, setPosts] = useState(defaultNewsPosts);
  const [form, setForm] = useState(() => ({ ...normalizeNewsPost(defaultNewsPosts[0]), published_at: toDatetimeLocal(defaultNewsPosts[0].published_at) }));
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [notice, setNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [usingLocalFallback, setUsingLocalFallback] = useState(false);

  const stats = useMemo(() => ({
    total: posts.length,
    published: posts.filter((post) => post.published).length,
    hidden: posts.filter((post) => !post.published).length,
  }), [posts]);

  const loadPosts = async () => {
    setIsLoadingPosts(true);
    setNotice('');
    setErrorMessage('');
    setUsingLocalFallback(false);

    if (!isSupabaseConfigured) {
      setPosts(sortNewsPosts(defaultNewsPosts));
      setUsingLocalFallback(true);
      setIsLoadingPosts(false);
      return;
    }

    const { data, error } = await supabase
      .from('news_posts')
      .select('id,title,slug,excerpt,body,cover_url,category,author,published,featured,published_at,created_at')
      .order('published_at', { ascending: false });

    if (error) {
      setErrorMessage(`No he podido leer news_posts: ${error.message}`);
      setPosts(sortNewsPosts(defaultNewsPosts));
      setUsingLocalFallback(true);
    } else {
      const nextPosts = sortNewsPosts(data || []);
      setPosts(nextPosts);
      setForm(nextPosts[0]
        ? { ...normalizeNewsPost(nextPosts[0]), published_at: toDatetimeLocal(nextPosts[0].published_at) }
        : createEmptyPost());
    }

    setIsLoadingPosts(false);
  };

  useEffect(() => {
    if (loading || !isAuthenticated || !isAdmin) return;
    loadPosts();
  }, [isAdmin, isAuthenticated, loading]);

  const handleEdit = (post) => {
    const normalized = normalizeNewsPost(post);
    setForm({ ...normalized, published_at: toDatetimeLocal(normalized.published_at) });
    setNotice('');
    setErrorMessage('');
  };

  const handleNew = () => {
    setForm(createEmptyPost());
    setNotice('');
    setErrorMessage('');
  };

  const saveLocalPost = (payload) => {
    setPosts((current) => {
      const exists = current.some((post) => post.id === payload.id);
      return sortNewsPosts(exists ? current.map((post) => (post.id === payload.id ? payload : post)) : [payload, ...current]);
    });
    setForm({ ...payload, published_at: toDatetimeLocal(payload.published_at) });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setNotice('');
    setErrorMessage('');

    const title = form.title.trim();
    const slug = (form.slug.trim() || createNewsSlug(title));
    const payload = {
      id: form.id && !String(form.id).startsWith('demo-') && !String(form.id).startsWith('local-')
        ? form.id
        : crypto.randomUUID(),
      title,
      slug,
      excerpt: form.excerpt.trim(),
      body: form.body.trim(),
      cover_url: form.cover_url.trim(),
      category: form.category.trim() || 'Club',
      author: form.author?.trim() || '',
      published: Boolean(form.published),
      featured: Boolean(form.featured),
      published_at: new Date(form.published_at || Date.now()).toISOString(),
    };

    if (!payload.title || !payload.excerpt || !payload.body) {
      setErrorMessage('Título, entradilla y cuerpo de la noticia son obligatorios.');
      setIsSaving(false);
      return;
    }

    if (!isSupabaseConfigured || usingLocalFallback) {
      saveLocalPost(payload);
      setNotice('Noticia guardada en vista local. Para guardarla definitivamente necesitas Supabase activo.');
      setIsSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from('news_posts')
      .upsert(payload, { onConflict: 'id' })
      .select('id,title,slug,excerpt,body,cover_url,category,author,published,featured,published_at,created_at')
      .single();

    if (error) {
      setErrorMessage(error.message);
    } else {
      saveLocalPost(data);
      setNotice('Noticia guardada correctamente.');
    }

    setIsSaving(false);
  };

  const deletePost = async () => {
    if (!form.id) return;
    setIsSaving(true);
    setNotice('');
    setErrorMessage('');

    if (!isSupabaseConfigured || usingLocalFallback) {
      const nextPosts = posts.filter((post) => post.id !== form.id);
      setPosts(nextPosts);
      setForm(nextPosts[0] ? { ...normalizeNewsPost(nextPosts[0]), published_at: toDatetimeLocal(nextPosts[0].published_at) } : createEmptyPost());
      setNotice('Noticia eliminada en vista local.');
      setIsSaving(false);
      return;
    }

    const { error } = await supabase.from('news_posts').delete().eq('id', form.id);
    if (error) {
      setErrorMessage(error.message);
    } else {
      const nextPosts = posts.filter((post) => post.id !== form.id);
      setPosts(nextPosts);
      setForm(nextPosts[0] ? { ...normalizeNewsPost(nextPosts[0]), published_at: toDatetimeLocal(nextPosts[0].published_at) } : createEmptyPost());
      setNotice('Noticia eliminada.');
    }
    setIsSaving(false);
  };

  const uploadCoverImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setNotice('');
    setErrorMessage('');

    if (!isSupabaseConfigured || usingLocalFallback) {
      setErrorMessage('Para subir imágenes necesitas Supabase Storage activo.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage('El archivo debe ser una imagen.');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setErrorMessage('La imagen no puede pesar más de 8 MB.');
      return;
    }

    setIsUploadingImage(true);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const baseSlug = createNewsSlug(form.slug || form.title || 'noticia');
    const filePath = `${baseSlug}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(NEWS_IMAGES_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      setErrorMessage(uploadError.message);
      setIsUploadingImage(false);
      return;
    }

    const { data } = supabase.storage.from(NEWS_IMAGES_BUCKET).getPublicUrl(filePath);
    setForm((current) => ({ ...current, cover_url: data.publicUrl }));
    setNotice('Imagen subida correctamente. La URL de portada se ha rellenado automáticamente.');
    setIsUploadingImage(false);
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0a0a0a] text-white"><Header /><main className="p-16 text-center text-sm font-black uppercase text-[hsl(43_65%_52%)]">Cargando noticias...</main></div>;
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/mi-cuenta" replace />;

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Helmet>
        <title>Noticias - Panel de control</title>
        <meta name="description" content="Gestión de noticias de La Comunidad del Banquillo." />
      </Helmet>

      <Header />

      <main className="flex-1 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link to="/panel-control" className="mb-5 inline-flex items-center gap-2 text-sm font-black uppercase text-gray-400 transition hover:text-[hsl(43_65%_52%)]">
            <ArrowLeft size={17} />
            Volver al panel
          </Link>

          <section className="mb-6 flex flex-col gap-4 rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="text-sm font-bold uppercase text-[hsl(43_65%_52%)]">Panel de control</span>
              <h1 className="mt-2 text-white">Noticias</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400">
                Publica novedades, crónicas, previas y avisos importantes en la sección pública de noticias.
              </p>
            </div>
            <div className="rounded-xl border border-[hsl(43_65%_52%_/_0.25)] bg-[hsl(43_65%_52%_/_0.08)] p-4">
              <p className="text-xs font-bold uppercase text-gray-500">Admin · {authMode === 'supabase' ? 'Supabase' : 'Local'}</p>
              <p className="text-sm font-black text-white">{user.email}</p>
            </div>
          </section>

          <section className="mb-6 grid gap-3 sm:grid-cols-3">
            <article className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-black uppercase text-gray-500">Noticias</p><p className="mt-2 text-3xl font-black text-white">{stats.total}</p></article>
            <article className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-black uppercase text-gray-500">Publicadas</p><p className="mt-2 text-3xl font-black text-white">{stats.published}</p></article>
            <article className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-black uppercase text-gray-500">Ocultas</p><p className="mt-2 text-3xl font-black text-white">{stats.hidden}</p></article>
          </section>

          {notice && <p className="mb-4 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-100">{notice}</p>}
          {errorMessage && <p className="mb-4 rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{errorMessage}</p>}

          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
                <div className="flex items-center gap-3">
                  <Newspaper size={21} className="text-[hsl(43_65%_52%)]" />
                  <div><p className="text-xs font-bold uppercase text-[hsl(43_65%_52%)]">Archivo</p><h2 className="text-xl font-black text-white">Noticias</h2></div>
                </div>
                <button type="button" onClick={handleNew} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase text-white transition hover:border-[hsl(43_65%_52%_/_0.65)]"><Plus size={15} /> Nueva</button>
              </div>

              {isLoadingPosts ? (
                <div className="p-8 text-center text-sm font-black uppercase text-gray-400">Cargando noticias...</div>
              ) : (
                <div className="divide-y divide-white/10">
                  {sortNewsPosts(posts).map((post) => (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => handleEdit(post)}
                      className={`grid w-full gap-3 p-4 text-left transition sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${form.id === post.id ? 'bg-[hsl(43_65%_52%_/_0.08)]' : 'hover:bg-white/5'}`}
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          {post.featured && <Star size={14} className="text-[hsl(43_65%_52%)]" />}
                          <span className="truncate text-sm font-black text-white">{post.title}</span>
                        </span>
                        <span className="mt-1 block truncate text-xs text-gray-500">{post.category} · /noticias/{post.slug}</span>
                      </span>
                      <span className={`inline-flex items-center gap-2 text-xs font-black uppercase ${post.published ? 'text-emerald-300' : 'text-gray-500'}`}>
                        {post.published ? <Eye size={15} /> : <EyeOff size={15} />}
                        {post.published ? 'Publicada' : 'Oculta'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="rounded-xl border border-[hsl(43_65%_52%_/_0.18)] bg-[#111]/90 p-5">
              <div className="mb-5 flex items-center gap-3">
                <Newspaper size={22} className="text-[hsl(43_65%_52%)]" />
                <div><p className="text-xs font-bold uppercase text-[hsl(43_65%_52%)]">Edición</p><h2 className="text-xl font-black text-white">Datos de la noticia</h2></div>
              </div>

              <div className="grid gap-4">
                <label><span className="mb-2 block text-xs font-black uppercase text-gray-500">Título</span><input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value, slug: current.slug || createNewsSlug(event.target.value) }))} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none focus:border-[hsl(43_65%_52%)]" /></label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label><span className="mb-2 block text-xs font-black uppercase text-gray-500">Slug</span><input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: createNewsSlug(event.target.value) }))} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none focus:border-[hsl(43_65%_52%)]" /></label>
                  <label><span className="mb-2 block text-xs font-black uppercase text-gray-500">Categoría</span><input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none focus:border-[hsl(43_65%_52%)]" /></label>
                </div>
                <label><span className="mb-2 block text-xs font-black uppercase text-gray-500">Autor opcional</span><input value={form.author || ''} onChange={(event) => setForm((current) => ({ ...current, author: event.target.value }))} placeholder="Déjalo vacío si no quieres mostrar autor" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none focus:border-[hsl(43_65%_52%)]" /></label>
                <label><span className="mb-2 block text-xs font-black uppercase text-gray-500">Entradilla</span><textarea rows={3} value={form.excerpt} onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))} className="w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none focus:border-[hsl(43_65%_52%)]" /></label>
                <label><span className="mb-2 block text-xs font-black uppercase text-gray-500">Cuerpo</span><textarea rows={9} value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} className="w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none focus:border-[hsl(43_65%_52%)]" /></label>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                    <label><span className="mb-2 block text-xs font-black uppercase text-gray-500">Imagen de portada URL</span><input value={form.cover_url} onChange={(event) => setForm((current) => ({ ...current, cover_url: event.target.value }))} placeholder="https://..." className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none focus:border-[hsl(43_65%_52%)]" /></label>
                    <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[hsl(43_65%_52%_/_0.35)] bg-[hsl(43_65%_52%_/_0.08)] px-4 py-3 text-xs font-black uppercase text-[hsl(43_65%_62%)] transition hover:border-[hsl(43_65%_52%)] hover:bg-[hsl(43_65%_52%_/_0.14)] ${isUploadingImage ? 'pointer-events-none opacity-60' : ''}`}>
                      <ImageUp size={16} />
                      {isUploadingImage ? 'Subiendo...' : 'Subir imagen'}
                      <input type="file" accept="image/*" onChange={uploadCoverImage} disabled={isUploadingImage} className="sr-only" />
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Puedes pegar una URL externa o subir una imagen desde tu ordenador. Formatos recomendados: JPG, PNG o WebP.
                  </p>
                  {form.cover_url && (
                    <img src={form.cover_url} alt="Vista previa de portada" className="mt-4 max-h-64 w-full rounded-lg border border-white/10 object-cover" />
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label><span className="mb-2 block text-xs font-black uppercase text-gray-500">Fecha</span><input type="datetime-local" value={form.published_at} onChange={(event) => setForm((current) => ({ ...current, published_at: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none focus:border-[hsl(43_65%_52%)]" /></label>
                  <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-3 sm:mt-6"><input type="checkbox" checked={form.published} onChange={(event) => setForm((current) => ({ ...current, published: event.target.checked }))} className="h-5 w-5 accent-[hsl(43_65%_52%)]" /><span className="text-sm font-black uppercase text-white">Publicada</span></label>
                  <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-3 sm:mt-6"><input type="checkbox" checked={form.featured} onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))} className="h-5 w-5 accent-[hsl(43_65%_52%)]" /><span className="text-sm font-black uppercase text-white">Destacada</span></label>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
                <button type="submit" disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(43_65%_52%)] px-4 py-3 text-sm font-black uppercase text-black transition hover:bg-[hsl(43_65%_60%)] disabled:opacity-60"><Save size={17} /> {isSaving ? 'Guardando...' : 'Guardar noticia'}</button>
                <button type="button" onClick={deletePost} disabled={isSaving || !form.id} className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-black uppercase text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"><Trash2 size={17} /> Eliminar</button>
              </div>
              <button type="button" onClick={loadPosts} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-black uppercase text-white transition hover:border-[hsl(43_65%_52%_/_0.65)]"><RotateCcw size={17} /> Recargar noticias</button>
            </form>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NewsAdminPage;
