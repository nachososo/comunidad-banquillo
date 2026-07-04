import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, Newspaper, Star } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { defaultNewsPosts, sortNewsPosts } from '@/data/newsPosts.js';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';

const formatDate = (value) =>
  new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value));

const NewsPage = () => {
  const [searchParams] = useSearchParams();
  const activeCategory = searchParams.get('categoria')?.trim() || '';
  const [posts, setPosts] = useState(defaultNewsPosts);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    let active = true;

    const loadNews = async () => {
      const { data, error } = await supabase
        .from('news_posts')
        .select('id,title,slug,excerpt,body,cover_url,category,author,published,featured,published_at,created_at')
        .eq('published', true)
        .order('featured', { ascending: false })
        .order('published_at', { ascending: false });

      if (!active) return;
      if (!error) setPosts(sortNewsPosts(data || []));
      setIsLoading(false);
    };

    loadNews();

    return () => {
      active = false;
    };
  }, []);

  const publishedPosts = useMemo(() => sortNewsPosts(posts).filter((post) => post.published !== false), [posts]);
  const sortedPosts = useMemo(() => {
    if (!activeCategory) return publishedPosts;
    return publishedPosts
      .filter((post) => post.category.toLocaleLowerCase('es') === activeCategory.toLocaleLowerCase('es'))
      .sort((first, second) => new Date(second.published_at || second.created_at) - new Date(first.published_at || first.created_at));
  }, [activeCategory, publishedPosts]);
  const featuredPost = activeCategory ? null : sortedPosts.find((post) => post.featured) || sortedPosts[0];
  const secondaryPosts = activeCategory ? sortedPosts : sortedPosts.filter((post) => post.id !== featuredPost?.id);

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Helmet>
        <title>{activeCategory ? `${activeCategory} - Noticias` : 'Noticias'} - La Comunidad del Banquillo</title>
        <meta name="description" content={activeCategory ? `Noticias de la categoría ${activeCategory}, ordenadas por fecha de publicación.` : 'Noticias, crónicas y novedades de La Comunidad del Banquillo.'} />
      </Helmet>

      <Header />

      <main className="flex-1 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <section className="mb-8">
            <span className="inline-flex items-center gap-2 text-sm font-black uppercase text-[hsl(43_65%_52%)]">
              <Newspaper size={18} />
              Actualidad banquiller
            </span>
            <h1 className="mt-3 text-white">{activeCategory ? `Categoría: ${activeCategory}` : 'Noticias'}</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-400">
              {activeCategory ? 'Publicaciones de la más reciente a la más antigua.' : 'Crónicas, avisos, previas y novedades de La Comunidad del Banquillo.'}
            </p>
          </section>

          {isLoading ? (
            <div className="rounded-xl border border-white/10 bg-[#111]/90 p-10 text-center">
              <p className="text-sm font-black uppercase text-gray-400">Cargando noticias...</p>
            </div>
          ) : !sortedPosts.length ? (
            <div className="rounded-xl border border-white/10 bg-[#111]/90 p-10 text-center">
              <Newspaper className="mx-auto text-white/20" size={42} />
              <p className="mt-4 text-lg font-black text-white">{activeCategory ? `No hay noticias en ${activeCategory}` : 'Todavía no hay noticias publicadas'}</p>
              <p className="mt-2 text-sm text-gray-500">{activeCategory ? 'Puedes volver a todas las noticias o elegir otra categoría.' : 'Cuando el club publique novedades aparecerán aquí.'}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {featuredPost && (
                <Link
                  to={`/noticias/${featuredPost.slug}`}
                  className="group grid overflow-hidden rounded-2xl border border-[hsl(43_65%_52%_/_0.25)] bg-[#111]/90 transition hover:border-[hsl(43_65%_52%)] lg:grid-cols-[1.05fr_0.95fr]"
                >
                  <div className="min-h-72 bg-black/30">
                    {featuredPost.cover_url ? (
                      <img src={featuredPost.cover_url} alt={featuredPost.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full min-h-72 items-center justify-center bg-gradient-to-br from-[#241b08] to-black">
                        <Newspaper size={72} className="text-[hsl(43_65%_52%_/_0.55)]" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center p-6 lg:p-8">
                    <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-[hsl(43_65%_52%_/_0.3)] bg-[hsl(43_65%_52%_/_0.08)] px-3 py-1 text-xs font-black uppercase text-[hsl(43_65%_62%)]">
                      <Star size={14} />
                      Destacada · {featuredPost.category}
                    </span>
                    <h2 className="text-3xl font-black leading-tight text-white md:text-4xl">{featuredPost.title}</h2>
                    <p className="mt-4 text-base leading-relaxed text-gray-400">{featuredPost.excerpt}</p>
                    <p className="mt-5 flex items-center gap-2 text-xs font-bold uppercase text-gray-500">
                      <CalendarDays size={15} />
                      {formatDate(featuredPost.published_at)}
                      {featuredPost.author ? ` · ${featuredPost.author}` : ''}
                    </p>
                    <span className="mt-6 inline-flex items-center gap-2 text-sm font-black uppercase text-[hsl(43_65%_52%)]">
                      Leer noticia
                      <ArrowRight size={17} className="transition group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              )}

              <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {secondaryPosts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/noticias/${post.slug}`}
                    className="group overflow-hidden rounded-xl border border-white/10 bg-[#111]/90 transition hover:border-[hsl(43_65%_52%_/_0.65)]"
                  >
                    <div className="h-44 bg-black/30">
                      {post.cover_url ? (
                        <img src={post.cover_url} alt={post.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#1b160a] to-black">
                          <Newspaper size={42} className="text-[hsl(43_65%_52%_/_0.45)]" />
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <p className="text-xs font-black uppercase text-[hsl(43_65%_52%)]">{post.category}</p>
                      <h2 className="mt-2 line-clamp-2 text-xl font-black text-white">{post.title}</h2>
                      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-gray-400">{post.excerpt}</p>
                      <p className="mt-5 flex items-center gap-2 text-xs font-bold uppercase text-gray-500">
                        <CalendarDays size={14} />
                        {formatDate(post.published_at)}
                        {post.author ? ` · ${post.author}` : ''}
                      </p>
                    </div>
                  </Link>
                ))}
              </section>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NewsPage;
