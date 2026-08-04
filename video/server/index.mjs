/**
 * Servicio de render de reels.
 *
 * Renderizar video necesita un Chromium headless, así que esto NO puede correr
 * en Vercel (sirve el sitio estático) ni en las Edge Functions de Supabase
 * (Deno, sin navegador). Corre en Node: en tu servidor o en tu máquina.
 *
 *   npm run server
 *
 * Variables de entorno:
 *   PORT              puerto (8787 por defecto)
 *   SUPABASE_URL      https://lrxwvyilfobwyndikqpq.supabase.co
 *   SUPABASE_ANON_KEY anon key (la pública)
 *   ALLOWED_ORIGINS   orígenes permitidos, separados por comas
 *
 * No lleva service key: cada petición usa el JWT del admin que la hizo, así
 * que las políticas RLS de Supabase siguen mandando.
 */
import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { createClient } from "@supabase/supabase-js";
import { propsDesdePropiedad, slug } from "./propsDesdePropiedad.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PORT = Number(process.env.PORT ?? 8787);
const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://lrxwvyilfobwyndikqpq.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const BUCKET = "publicaciones";

const ORIGINS = (process.env.ALLOWED_ORIGINS ?? "https://luce-real-estate-landing.vercel.app,http://localhost:8080")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const app = express();
app.use(cors({ origin: ORIGINS }));
app.use(express.json());

/* ── Bundle de Remotion, una sola vez ──────────────────────────────────────
   Empaquetar tarda unos segundos; se hace al primer render y se reutiliza. */
let bundlePromesa = null;
const obtenerBundle = () => {
  if (!bundlePromesa) {
    console.log("Empaquetando la composición (solo la primera vez)...");
    bundlePromesa = bundle({ entryPoint: path.resolve(RAIZ, "src/index.ts") });
  }
  return bundlePromesa;
};

/* ── Trabajos en memoria ───────────────────────────────────────────────────
   Suficiente para el volumen real (3-5 videos por semana). Si el proceso se
   reinicia se pierde el progreso, pero el .mp4 terminado ya vive en Storage. */
const trabajos = new Map();

const TTL_TRABAJO = 30 * 60 * 1000;
setInterval(() => {
  const ahora = Date.now();
  for (const [id, t] of trabajos) {
    if (ahora - t.actualizado > TTL_TRABAJO) trabajos.delete(id);
  }
}, 5 * 60 * 1000).unref();

const actualizar = (id, cambios) => {
  const actual = trabajos.get(id);
  if (actual) trabajos.set(id, { ...actual, ...cambios, actualizado: Date.now() });
};

/** Cliente de Supabase que actúa en nombre del admin que hizo la petición. */
function clienteDelUsuario(authHeader) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Sin JWT válido no se renderiza: un render cuesta CPU y tiempo. */
async function autenticar(req, res) {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    res.status(401).json({ error: "No autorizado" });
    return null;
  }
  const supabase = clienteDelUsuario(authHeader);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: "No autorizado" });
    return null;
  }
  return { supabase, user: data.user, authHeader };
}

async function renderizar(jobId, { supabase, propiedad, publicacionId }) {
  const salida = path.join(os.tmpdir(), `luce-reel-${jobId}.mp4`);
  try {
    actualizar(jobId, { estado: "preparando", progreso: 0 });
    const serveUrl = await obtenerBundle();

    const inputProps = propsDesdePropiedad(propiedad);
    const composition = await selectComposition({
      serveUrl,
      id: "PropiedadReel",
      inputProps,
    });

    actualizar(jobId, {
      estado: "renderizando",
      progreso: 0,
      duracion: Math.round(composition.durationInFrames / composition.fps),
    });

    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: salida,
      inputProps,
      // Se reserva 0.92 del avance al render; el resto es la subida.
      onProgress: ({ progress }) =>
        actualizar(jobId, { progreso: Math.round(progress * 92) }),
    });

    actualizar(jobId, { estado: "subiendo", progreso: 94 });

    const nombre = `${slug(propiedad.nombre)}-reel.mp4`;
    const ruta = `videos/${propiedad.id}/${jobId}/${nombre}`;
    const archivo = await fs.promises.readFile(salida);

    const { error: errSubida } = await supabase.storage
      .from(BUCKET)
      .upload(ruta, archivo, { contentType: "video/mp4", upsert: true, cacheControl: "3600" });
    if (errSubida) throw new Error(`No se pudo guardar el video: ${errSubida.message}`);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(ruta);
    const url = data.publicUrl;

    // Colgarlo del historial es un extra: si falla, el video ya está subido.
    if (publicacionId) {
      const { error: errFila } = await supabase
        .from("publicaciones_generadas")
        .update({ video_url: url })
        .eq("id", publicacionId);
      if (errFila) console.error("No se pudo guardar el video en el historial:", errFila.message);
    }

    actualizar(jobId, { estado: "listo", progreso: 100, url, nombre });
    console.log(`[${jobId}] listo -> ${url}`);
  } catch (e) {
    console.error(`[${jobId}] falló:`, e);
    actualizar(jobId, { estado: "error", error: e.message ?? "Falló el render" });
  } finally {
    fs.promises.unlink(salida).catch(() => {});
  }
}

app.get("/api/video/salud", (_req, res) => res.json({ ok: true }));

app.post("/api/video/render", async (req, res) => {
  const sesion = await autenticar(req, res);
  if (!sesion) return;

  const propiedadId = Number(req.body?.propiedad_id);
  if (!propiedadId || Number.isNaN(propiedadId)) {
    return res.status(400).json({ error: "Falta el id de la propiedad" });
  }
  const publicacionId = req.body?.publicacion_id ? Number(req.body.publicacion_id) : null;

  // La propiedad se lee de la base, nunca del cliente.
  const { data: propiedad, error } = await sesion.supabase
    .from("propiedades")
    .select("*")
    .eq("id", propiedadId)
    .maybeSingle();
  if (error) return res.status(502).json({ error: "No se pudo leer la propiedad" });
  if (!propiedad) return res.status(404).json({ error: "Propiedad no encontrada" });
  if (!(propiedad.galeria ?? []).length) {
    return res.status(400).json({ error: "La propiedad no tiene fotos para armar el video." });
  }

  const jobId = randomUUID();
  trabajos.set(jobId, {
    estado: "en cola",
    progreso: 0,
    propiedadId,
    actualizado: Date.now(),
  });

  // Se responde de inmediato y el render sigue en segundo plano.
  renderizar(jobId, { supabase: sesion.supabase, propiedad, publicacionId });

  res.status(202).json({ job_id: jobId });
});

app.get("/api/video/render/:jobId", async (req, res) => {
  const sesion = await autenticar(req, res);
  if (!sesion) return;

  const trabajo = trabajos.get(req.params.jobId);
  if (!trabajo) return res.status(404).json({ error: "Ese render ya no existe. Vuelve a intentarlo." });

  res.json({
    estado: trabajo.estado,
    progreso: trabajo.progreso,
    duracion: trabajo.duracion ?? null,
    url: trabajo.url ?? null,
    nombre: trabajo.nombre ?? null,
    error: trabajo.error ?? null,
  });
});

app.listen(PORT, () => {
  console.log(`Servicio de video escuchando en http://localhost:${PORT}`);
  console.log(`Orígenes permitidos: ${ORIGINS.join(", ")}`);
  if (!SUPABASE_ANON_KEY) {
    console.warn("OJO: falta SUPABASE_ANON_KEY, las peticiones van a fallar.");
  }
});
