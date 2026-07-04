import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Newspaper } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { defaultNewsPosts, sortNewsPosts } from '@/data/newsPosts.js';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';

const formatDate = (value) =>
  new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value));

const NewsDetailPage = () => {
  const { slug } = useParams();
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
        .eq('slug', slug)
        .maybeSingle();

      if (!active) return;
      if (!error) setPosts(data ? [data] : []);
      setIsLoading(false);
    };

    loadNews();

    return () => {
      active = false;
    };
  }, [slug]);

  const post = useMemo(
    () => sortNewsPosts(posts).find((candidate) => candidate.slug === slug && candidate.published !== false),
    [posts, slug],
  );

  if (!isLoading && !post) return <Navigate to="/noticias" replace />;

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Helmet>
        <title>{post ? `${post.title} - Noticias` : 'Noticias'} - La Comunidad del Banquillo</title>
        <meta name="description" content={post?.excerpt || 'Noticia de La Comunidad del Banquillo.'} />
      </Helmet>

      <Header />

      <main className="flex-1 py-12">
        <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link
            to="/noticias"
            className="mb-6 inline-flex items-center gap-2 text-sm font-black uppercase text-gray-400 transition hover:text-[hsl(43_65%_52%)]"
          >
            <ArrowLeft size={17} />
            Volver a noticias
          </Link>

          {isLoading || !post ? (
            <div className="rounded-xl border border-white/10 bg-[#111]/90 p-10 text-center">
              <p className="text-sm font-black uppercase text-gray-400">Cargando noticia...</p>
            </div>
          ) : (
            <>
              <header className="mb-8">
                <Link to={`/noticias?categoria=${encodeURIComponent(post.category)}`} className="inline-flex items-center gap-2 rounded-full border border-[hsl(43_65%_52%_/_0.3)] bg-[hsl(43_65%_52%_/_0.08)] px-3 py-1 text-xs font-black uppercase text-[hsl(43_65%_62%)] transition hover:border-[hsl(43_65%_52%)] hover:bg-[hsl(43_65%_52%_/_0.16)]">
                  <Newspaper size={14} />
                  {post.category}
                </Link>
                <h1 className="mt-4 text-white">{post.title}</h1>
                <p className="mt-4 text-lg leading-relaxed text-gray-300">{post.excerpt}</p>
                <p className="mt-5 flex items-center gap-2 text-xs font-bold uppercase text-gray-500">
                  <CalendarDays size={15} />
                  {formatDate(post.published_at)}
                  {post.author ? ` · ${post.author}` : ''}
                </p>
              </header>

              {post.cover_url && (
                <figure className="mb-8 flex w-full justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                  <img
                    src={post.cover_url}
                    alt={post.title}
                    className="block max-h-[42rem] max-w-full object-contain"
                  />
                </figure>
              )}

              <div className="rounded-2xl border border-white/10 bg-[#111]/90 p-6 md:p-8">
                <div className="space-y-5 text-base leading-8 text-gray-300">
                  {post.body.split(/\n{2,}/).map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </>
          )}
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default NewsDetailPage;
