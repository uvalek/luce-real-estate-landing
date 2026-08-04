/**
 * Render local de un reel, sin levantar el servidor. Útil para revisar el
 * diseño y para comprobar que la máquina puede renderizar.
 *
 *   node scripts/render-local.mjs <id-de-propiedad> [salida.mp4]
 *
 * Lee la propiedad de Supabase con la anon key (`propiedades` tiene lectura
 * pública) y deja el .mp4 en ./salida/.
 */
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { propsDesdePropiedad } from "../server/propsDesdePropiedad.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://lrxwvyilfobwyndikqpq.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";

const propiedadId = process.argv[2];
if (!propiedadId) {
  console.error("Uso: node scripts/render-local.mjs <id-de-propiedad> [salida.mp4]");
  process.exit(1);
}

const salida = path.resolve(RAIZ, process.argv[3] ?? `salida/propiedad-${propiedadId}.mp4`);
fs.mkdirSync(path.dirname(salida), { recursive: true });

const res = await fetch(`${SUPABASE_URL}/rest/v1/propiedades?id=eq.${propiedadId}&select=*`, {
  headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
});
if (!res.ok) {
  console.error("No se pudo leer la propiedad:", res.status, await res.text());
  process.exit(1);
}
const filas = await res.json();
if (!filas[0]) {
  console.error(`No existe la propiedad ${propiedadId}.`);
  process.exit(1);
}

const inputProps = propsDesdePropiedad(filas[0]);

console.log("Empaquetando la composición...");
const serveUrl = await bundle({ entryPoint: path.resolve(RAIZ, "src/index.ts") });

console.log(`Renderizando "${inputProps.nombre}" (${inputProps.fotos.length} fotos)...`);
const composition = await selectComposition({ serveUrl, id: "PropiedadReel", inputProps });
console.log(`  ${composition.durationInFrames} frames · ${(composition.durationInFrames / composition.fps).toFixed(1)} s`);

await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation: salida,
  inputProps,
  onProgress: ({ progress }) => process.stdout.write(`\r  render ${Math.round(progress * 100)}%   `),
});

console.log(`\nListo: ${salida}`);
