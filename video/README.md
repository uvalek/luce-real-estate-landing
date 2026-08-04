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

| Variable             | Para qué                                                     |
| -------------------- | ------------------------------------------------------------ |
| `PORT`               | puerto (8787 por defecto)                                     |
| `SUPABASE_URL`       | URL del proyecto                                              |
| `SUPABASE_ANON_KEY`  | anon key **pública** (no la service key)                      |
| `ALLOWED_ORIGINS`    | orígenes permitidos, separados por comas                      |
| `OPENAI_API_KEY`     | para la narración. Sin ella el reel sale solo con música       |
| `OPENAI_TTS_VOICE`   | opcional: `nova` (por defecto), `shimmer`, `onyx`, `echo`      |
| `OPENAI_TTS_MODEL`   | opcional: `gpt-4o-mini-tts` por defecto, cae a `tts-1`         |

---

## Audio

**Música.** La pista es `public/musica/fondo-luce.mp3`: un pad ambiental de 32 s
sintetizado por `scripts/generar-musica.mjs`. Se hace así a propósito — música
generada aquí no tiene licencia que revisar ni atribución que poner en cada
publicación.

Para cambiarla, reemplaza el archivo por otro con el mismo nombre. Si usas una
pista de terceros, revisa que permita uso comercial: Pixabay Audio es la opción
más simple (licencia libre, sin atribución). Un detalle práctico: en Instagram
las cuentas de empresa tienen la biblioteca de música recortada, y llevarla ya
incrustada en el video evita ese problema.

**Narración.** El servidor escribe un guion a la medida de lo que dura el video
—la descripción larga del dashboard tarda como un minuto leída y no cabría— y
lo convierte a voz con OpenAI. Cuesta alrededor de dos centavos de peso por
video.

La música baja automáticamente mientras habla la voz y vuelve a subir al
terminar. Si la voz sale más larga de lo previsto, la escena final se alarga
sola para que quepa.

Si la narración falla por cualquier motivo, el video se genera igual con música
y sin voz: quedarse sin voz no debe costar el reel entero.

---

## Desplegarlo en EasyPanel

Es el **mismo repositorio de GitHub**, no hace falta uno nuevo. Se crea un
servicio aparte que construye solo esta carpeta.

1. En EasyPanel: **Create Service → App**, fuente **GitHub**, apuntando a
   `uvalek/luce-real-estate-landing`, rama `main`.
2. **Build: Dockerfile**, y en el campo **File** pon la ruta del archivo:
   `video/Dockerfile`. Es la ruta al archivo, no la carpeta.

   EasyPanel construye usando la **raíz del repo** como contexto, por eso el
   `Dockerfile` copia con rutas `video/…`. El `.dockerignore` de la raíz evita
   que se envíen las dependencias y los videos ya renderizados.
3. Variables de entorno:

   ```
   SUPABASE_ANON_KEY = <la anon key pública>
   OPENAI_API_KEY    = <la misma clave que usas en Supabase>
   ALLOWED_ORIGINS   = https://luce-real-estate-landing.vercel.app
   PORT              = 8787
   ```

4. Puerto expuesto: `8787`. Asígnale un dominio (por ejemplo
   `video.tudominio.com`).
5. Recursos: dale al menos **2 GB de RAM y 2 vCPU**. Renderizar es lo más
   pesado que hace este proyecto; con menos funciona pero cada video puede
   tardar varios minutos.

Por qué hace falta el `Dockerfile` en vez de un "app de Node" normal: la imagen
base de Node no trae las librerías de sistema del Chromium que usa Remotion.
Sin ellas el servicio arranca bien y **falla en el primer render**. El
`Dockerfile` de esta carpeta las instala y además deja Chrome descargado
durante el build.

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

Remotion es gratis para personas y para empresas de hasta 3 empleados; a partir
de ahí requiere una licencia de empresa de pago. Este proyecto lo desarrolla una
sola persona, así que cae en el uso gratuito. Si algún día se suma equipo, hay
que revisar <https://remotion.dev/license>.
