export const defaultNewsPosts = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    title: 'La Comunidad del Banquillo estrena sección de noticias',
    slug: 'bienvenida-noticias',
    excerpt: 'Un nuevo espacio para publicar novedades del club, previas, crónicas y avisos importantes.',
    body: 'La sección de noticias nace para centralizar las novedades de La Comunidad del Banquillo: actualidad de los equipos, anuncios, previas, crónicas, comunicados y todo aquello que merezca quedarse publicado en la web.',
    cover_url: '',
    category: 'Club',
    author: '',
    published: true,
    featured: true,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
];

export const createNewsSlug = (title = '') =>
  title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `noticia-${Date.now()}`;

export const normalizeNewsPost = (post = {}) => ({
  id: post.id || `local-${Date.now()}`,
  title: post.title || 'Nueva noticia',
  slug: post.slug || createNewsSlug(post.title || 'Nueva noticia'),
  excerpt: post.excerpt || '',
  body: post.body || '',
  cover_url: post.cover_url || '',
  category: post.category || 'Club',
  author: post.author || '',
  published: post.published !== false,
  featured: Boolean(post.featured),
  published_at: post.published_at || post.created_at || new Date().toISOString(),
  created_at: post.created_at || new Date().toISOString(),
});

export const sortNewsPosts = (posts = []) =>
  [...posts].map(normalizeNewsPost).sort((first, second) => {
    if (first.featured !== second.featured) return first.featured ? -1 : 1;
    return new Date(second.published_at || second.created_at) - new Date(first.published_at || first.created_at);
  });
