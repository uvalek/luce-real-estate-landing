# Reels de propiedades (Remotion)

Video vertical de 1080 × 1920 para Instagram y TikTok: la foto de portada con
zoom lento, una escena por foto con un dato distinto de la propiedad, textos y
números animados, y una pantalla final con los datos del asesor.

Dura entre **21 y 27 segundos** según cuántas fotos tenga la propiedad.

---

## Por qué esto vive aparte

Renderizar video necesita un **Chromium headless**. Eso no puede correr:

- en **Vercel**, que sirve el sitio ya compilado;
- en las **Edge Functions de Supabase**, que corren en Deno sin navegador.

Por eso el render es un servicio de Node independiente. Esta carpeta tiene su
propio `package.json`, así que no afecta al build del dashboard.

---

## Probar el diseño sin backend

```bash
cd video
npm install
npm run studio
```

Abre el estudio de Remotion con datos de ejemplo y un formulario para editar
las props en vivo. Es la forma rápida de ajustar colores, tiempos y textos.

## Renderizar un video a mano

```bash
cd video
SUPABASE_ANON_KEY=<la anon key publica> node scripts/render-local.mjs 15
```

Deja el `.mp4` en `video/salida/`. Sirve para comprobar que la máquina puede
renderizar antes de montar el servicio.

## Levantar el servicio de render

```bash
cd video
SUPABASE_ANON_KEY=<la anon key publica> npm run server
```

Escucha en el puerto `8787`:

| Método | Ruta                        | Qué hace                                    |
| ------ | --------------------------- | ------------------------------------------- |
| GET    | `/api/video/salud`          | comprobar que está vivo                     |
| POST   | `/api/video/render`         | `{ propiedad_id, publicacion_id }` → `job_id` |
| GET    | `/api/video/render/:jobId`  | estado y porcentaje de avance                |

Toda petición exige el **JWT del admin** en `Authorization: Bearer ...`; sin él
responde 401. No usa service key: actúa en nombre del usuario, así que las
políticas RLS de Supabase siguen aplicando.

Al terminar sube el `.mp4` al bucket `publicaciones`
(`videos/{propiedad_id}/{job}/…mp4`) y guarda la URL en
`publicaciones_generadas.video_url`.

### Variables de entorno

| Variable            | Para qué                                          |
| ------------------- | ------------------------------------------------- |
| `PORT`              | puerto (8787 por defecto)                          |
| `SUPABASE_URL`      | URL del proyecto                                   |
| `SUPABASE_ANON_KEY` | anon key **pública** (no la service key)           |
| `ALLOWED_ORIGINS`   | orígenes permitidos, separados por comas           |

---

## Conectarlo al dashboard

1. Levanta el servicio donde vaya a vivir (EasyPanel, un VPS, o tu máquina).
2. En Vercel, agrega la variable `VITE_VIDEO_API_URL` con su dirección
   (por ejemplo `https://video.tudominio.com`) y vuelve a desplegar.
3. En `vercel.json`, agrega ese mismo dominio a `connect-src` de la CSP:

   ```
   connect-src 'self' https://lrxwvyilfobwyndikqpq.supabase.co wss://... https://video.tudominio.com;
   ```

   Sin este paso el navegador bloquea la llamada aunque el servicio funcione.

Mientras `VITE_VIDEO_API_URL` no esté configurada, el dashboard muestra el
botón desactivado con una nota explicando qué falta.

---

## Cuánto tarda y cuánto pesa

En una Mac reciente, un reel de 21 s tarda **1-3 minutos** y pesa unos 10 MB.
En un servidor modesto puede tardar bastante más: el render usa todos los
núcleos disponibles. Para 3-5 videos por semana un contenedor pequeño alcanza.

---

## Licencia de Remotion

**Remotion no es software libre para todos los usos.** Es gratis para personas
y para empresas de hasta 3 empleados; a partir de ahí requiere una licencia de
empresa de pago. Antes de usar esto en producción conviene revisar
<https://remotion.dev/license> y ver en qué caso cae LUCE.
