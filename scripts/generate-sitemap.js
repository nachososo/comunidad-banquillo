import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { allPlayers, matches } from '../src/data/data.js';
import { defaultNewsPosts } from '../src/data/newsPosts.js';
import { getPlayerSlug } from '../src/utils/playerSlug.js';

const SITE_URL = 'https://comunidaddelbanquillo.es';

const today = new Date().toISOString().slice(0, 10);

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const normalizePath = (path) => (path.startsWith('/') ? path : `/${path}`);

const route = (path, { priority = '0.7', changefreq = 'weekly', lastmod = today } = {}) => ({
  loc: `${SITE_URL}${normalizePath(path)}`,
  priority,
  changefreq,
  lastmod,
});

const calendarRoutes = Array.from(
  new Set(matches.map((match) => `${match.team}/${match.season}`).filter(Boolean)),
).map((key) => route(`/calendario/${key}`, { priority: '0.65', changefreq: 'weekly' }));

const playerRoutes = allPlayers.map((player) =>
  route(`/jugador/${getPlayerSlug(player)}`, { priority: '0.75', changefreq: 'monthly' }),
);

const newsRoutes = defaultNewsPosts
  .filter((post) => post.published !== false)
  .map((post) =>
    route(`/noticias/${post.slug}`, {
      priority: '0.65',
      changefreq: 'monthly',
      lastmod: new Date(post.published_at || post.created_at || Date.now()).toISOString().slice(0, 10),
    }),
  );

const routes = [
  route('/', { priority: '1.0', changefreq: 'weekly' }),
  route('/plantilla-masculina', { priority: '0.9', changefreq: 'weekly' }),
  route('/plantilla-femenina', { priority: '0.9', changefreq: 'weekly' }),
  route('/staff', { priority: '0.75', changefreq: 'monthly' }),
  route('/calendario', { priority: '0.85', changefreq: 'weekly' }),
  route('/noticias', { priority: '0.8', changefreq: 'weekly' }),
  route('/contacto', { priority: '0.55', changefreq: 'monthly' }),
  route('/18-0', { priority: '0.8', changefreq: 'weekly' }),
  route('/banquiger', { priority: '0.75', changefreq: 'weekly' }),
  ...calendarRoutes,
  ...playerRoutes,
  ...newsRoutes,
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (item) => `  <url>
    <loc>${escapeXml(item.loc)}</loc>
    <lastmod>${item.lastmod}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

await writeFile(resolve('public/sitemap.xml'), sitemap);
await writeFile(resolve('public/robots.txt'), robots);

console.log(`Generated sitemap with ${routes.length} URLs.`);
