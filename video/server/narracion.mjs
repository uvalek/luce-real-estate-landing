/**
 * Narración del reel: guion corto + voz sintética, ambos con OpenAI.
 *
 * La descripción que ya genera el dashboard dura como un minuto hablada, así
 * que no sirve: aquí se pide un guion a la medida de la duración real del
 * video, y se convierte a voz.
 *
 * Si falta OPENAI_API_KEY, todo esto se salta y el reel sale solo con música.
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const MODELO_GUION = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const MODELO_VOZ = process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts";
/** Voces de OpenAI: nova y shimmer son femeninas; onyx y echo, masculinas. */
const VOZ = process.env.OPENAI_TTS_VOICE ?? "nova";

/** En español neutro se hablan ~2.6 palabras por segundo a ritmo natural. */
const PALABRAS_POR_SEGUNDO = 2.6;

export const narracionDisponible = () => OPENAI_API_KEY.length > 0;

const numero = (n) => Math.round(Number(n) || 0).toLocaleString("es-MX");

/** Ficha compacta para el guion: solo lo que existe. */
function fichaCorta(props) {
  const partes = [
    `Tipo de operación: ${props.operacion}`,
    `Ubicación: ${props.ubicacion}`,
    `Precio: $${numero(props.precio)} MXN`,
  ];
  if (props.recamaras > 0) partes.push(`Recámaras: ${props.recamaras}`);
  if (props.banos > 0) partes.push(`Baños: ${props.banos}`);
  if (props.metrosCuadrados > 0) partes.push(`Construcción: ${numero(props.metrosCuadrados)} m2`);
  if (props.metrosTerreno > 0) partes.push(`Terreno: ${numero(props.metrosTerreno)} m2`);
  if (props.estacionamientos > 0) partes.push(`Estacionamientos: ${props.estacionamientos}`);
  if (props.amenidades.length) partes.push(`Amenidades: ${props.amenidades.join(", ")}`);
  if (props.asesor.nombre) partes.push(`Asesor: ${props.asesor.nombre}`);
  return partes.join("\n");
}

/** Escribe un guion que quepa en `segundos` de video. */
export async function escribirGuion(props, segundos) {
  const palabras = Math.max(24, Math.floor(segundos * PALABRAS_POR_SEGUNDO) - 6);

  const system = `Eres locutor de reels inmobiliarios en México. Escribes guiones para leer en voz alta, en español de México, con tono cálido y profesional.

REGLAS:
1. Usa ÚNICAMENTE los datos de la ficha. Está prohibido inventar cualquier dato.
2. Máximo ${palabras} palabras. Es un límite duro: el guion tiene que caber en ${Math.round(segundos)} segundos de video.
3. Se lee en voz alta: nada de emojis, hashtags, viñetas ni abreviaturas. Escribe "metros cuadrados", no "m2".
4. Los precios en palabras naturales: "cuatro millones de pesos", no "$4,000,000 MXN".
5. Estructura: gancho corto, dos o tres características concretas, y un cierre invitando a escribir o agendar una visita.
6. Responde solo con el guion, sin comillas ni comentarios.`;

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODELO_GUION,
      temperature: 0.8,
      max_tokens: 400,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Ficha de la propiedad:\n${fichaCorta(props)}` },
      ],
    }),
  });

  if (!r.ok) {
    throw new Error(`OpenAI (guion) respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
  }
  const payload = await r.json();
  const guion = (payload?.choices?.[0]?.message?.content ?? "").trim();
  if (!guion) throw new Error("OpenAI devolvió un guion vacío");
  return guion;
}

/** Convierte el guion a un mp3. Devuelve un Buffer. */
export async function sintetizarVoz(guion) {
  const pedir = async (modelo) =>
    fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelo,
        voice: VOZ,
        input: guion,
        response_format: "mp3",
        speed: 1,
      }),
    });

  let r = await pedir(MODELO_VOZ);
  // Si la cuenta no tiene acceso al modelo nuevo, se cae al clásico.
  if (!r.ok && MODELO_VOZ !== "tts-1") {
    console.warn(`Voz: ${MODELO_VOZ} falló (${r.status}), reintentando con tts-1`);
    r = await pedir("tts-1");
  }
  if (!r.ok) {
    throw new Error(`OpenAI (voz) respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
  }

  return Buffer.from(await r.arrayBuffer());
}
