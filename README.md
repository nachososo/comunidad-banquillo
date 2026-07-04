# La Comunidad del Banquillo

Web del club ADNBanquiller (React + Vite + Tailwind).

## Arrancar en local

```bash
cd ~/Desktop/comunidad-banquillo
npm install
npm run dev
```

Abre http://localhost:3000

## Editar contenido

Los jugadores, staff y partidos están en `src/data/data.js`.

## Build para publicar

```bash
npm run build
```

La carpeta `dist/` es la que subes a tu hosting.

## Publicar en Vercel

1. Importa el repositorio desde GitHub.
2. Usa `npm run build` como comando de compilación y `dist` como carpeta de salida.
3. Añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en las variables de entorno de Vercel.
4. Después del despliegue, configura la URL pública en Supabase Authentication > URL Configuration.

`vercel.json` redirige las rutas de React a `index.html` para que páginas como `/18-0`, `/noticias/...` y `/mi-cuenta` funcionen también al recargarlas.
