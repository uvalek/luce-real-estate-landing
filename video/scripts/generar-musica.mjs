/**
 * Genera la pista de música de fondo de los reels.
 *
 *   node scripts/generar-musica.mjs
 *
 * Es un pad ambiental lento sobre Am–F–C–G, sintetizado aquí mismo. Se hace
 * así a propósito: la música generada por este script no tiene dueño más que
 * LUCE, así que no hay licencias que revisar ni atribuciones que poner en cada
 * publicación.
 *
 * Si prefieres una pista comercial, basta con reemplazar
 * `public/musica/fondo-luce.mp3` por otra (ver README).
 *
 * Necesita ffmpeg para convertir el WAV a mp3.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = path.join(RAIZ, "public", "musica", "fondo-luce.mp3");

const SR = 44100;
const COMPASES = 8; // segundos por acorde
const CHORDS = [
  [220.0, 261.63, 329.63], // Am
  [174.61, 220.0, 261.63], // F
  [130.81, 164.81, 196.0], // C
  [196.0, 246.94, 293.66], // G
];
const DURACION = CHORDS.length * COMPASES; // 32 s
const TOTAL = SR * DURACION;

/** Curva suave (mitad de coseno) para entrar y salir sin chasquidos. */
const suave = (t) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(Math.max(t, 0), 1));

const izq = new Float32Array(TOTAL);
const der = new Float32Array(TOTAL);

for (let i = 0; i < TOTAL; i++) {
  const t = i / SR;
  let l = 0;
  let r = 0;

  CHORDS.forEach((acorde, ci) => {
    const inicio = ci * COMPASES;
    // Cada acorde se solapa con el siguiente: entra mientras el anterior sale.
    const local = t - inicio;
    if (local < -2 || local > COMPASES + 2) return;
    const env = suave((local + 2) / 3) * suave((COMPASES + 2 - local) / 3);
    if (env <= 0.0005) return;

    acorde.forEach((f, ni) => {
      // Voces ligeramente desafinadas entre sí: da cuerpo sin sonar a órgano.
      const detune = 1 + (ni - 1) * 0.0012;
      const fase = ni * 0.7;
      const fundamental = Math.sin(2 * Math.PI * f * detune * t + fase);
      const octava = Math.sin(2 * Math.PI * f * 2 * detune * t + fase) * 0.18;
      const quinta = Math.sin(2 * Math.PI * f * 1.5 * t + fase) * 0.07;
      const voz = (fundamental + octava + quinta) * env * (ni === 0 ? 0.5 : 0.34);

      // Un poco de movimiento estéreo, distinto por voz.
      l += voz * (0.5 + 0.5 * Math.sin(0.11 * t + ni));
      r += voz * (0.5 + 0.5 * Math.sin(0.11 * t + ni + Math.PI));
    });
  });

  // Respiración lenta del conjunto.
  const lfo = 0.86 + 0.14 * Math.sin(2 * Math.PI * 0.035 * t);
  // Entrada y salida de la pista completa.
  const global = suave(t / 2.5) * suave((DURACION - t) / 3.5);
  // 0.45 deja la pista con un pico cerca de -5 dB: suena a nivel normal y
  // todavía tiene margen de sobra para no saturar al mezclarla.
  const g = 0.45 * lfo * global;

  izq[i] = l * g;
  der[i] = r * g;
}

/* ── WAV 16 bits estéreo ─────────────────────────────────────────────────── */
const buffer = Buffer.alloc(44 + TOTAL * 4);
buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + TOTAL * 4, 4);
buffer.write("WAVEfmt ", 8);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(2, 22);
buffer.writeUInt32LE(SR, 24);
buffer.writeUInt32LE(SR * 4, 28);
buffer.writeUInt16LE(4, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(TOTAL * 4, 40);

const aEntero = (v) => Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
for (let i = 0; i < TOTAL; i++) {
  buffer.writeInt16LE(aEntero(izq[i]), 44 + i * 4);
  buffer.writeInt16LE(aEntero(der[i]), 46 + i * 4);
}

const temporal = path.join(RAIZ, "musica-temporal.wav");
fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
fs.writeFileSync(temporal, buffer);

execFileSync("ffmpeg", ["-y", "-i", temporal, "-codec:a", "libmp3lame", "-b:a", "128k", DESTINO], {
  stdio: "ignore",
});
fs.unlinkSync(temporal);

const kb = Math.round(fs.statSync(DESTINO).size / 1024);
console.log(`Listo: ${DESTINO} (${DURACION}s, ${kb} KB)`);
