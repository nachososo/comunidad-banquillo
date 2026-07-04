# Configurar Supabase

Esta web ya tiene preparado el login para funcionar con Supabase cuando pongamos las claves del proyecto.
Mientras no existan esas claves, seguirá usando el modo local de pruebas.

## 1. Crear el proyecto

1. Entra en Supabase y crea un proyecto nuevo.
2. Ve a `Project Settings > API`.
3. Copia el `Project URL` y la `anon public key`.

## 2. Añadir las claves

Crea un archivo `.env.local` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

Después reinicia el servidor de desarrollo con `npm run dev`.

## 3. Crear las tablas

En Supabase, abre `SQL Editor`, pega el contenido de `supabase/schema.sql` y ejecútalo.

## 4. Crear el primer administrador

1. Regístrate desde `/login` con tu correo real.
2. En Supabase, ejecuta este SQL cambiando el correo:

```sql
update public.profiles
set role = 'admin'
where email = 'tu-correo@email.com';
```

## 5. Siguiente fase

Con esto tendremos login real y permisos. El siguiente paso será conectar los módulos del panel de control para editar:
plantillas, calendario, estadísticas, mensajes de contacto y Banquiger.
