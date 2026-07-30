// ============================================================================
// Edge Function: generar-contenido-propiedad
//
// Genera con OpenAI (a) una descripción profesional de una propiedad y (b) un
// copy para Instagram con hashtags del sector inmobiliario en México.
//
// ¿Por qué una Edge Function y no llamar a OpenAI desde el navegador?
//   1. La API key nunca debe llegar al cliente (ver SECURITY_AUDIT.md).
//   2. La CSP de vercel.json no permite `connect-src` a api.openai.com.
//   3. Aquí exigimos un JWT válido, así nadie de fuera gasta el saldo de OpenAI.
//
// Secretos (ponerlos en Supabase → Edge Functions → Secrets):
//   OPENAI_API_KEY   obligatorio
//   OPENAI_MODEL     opcional (default: gpt-4o-mini)
//   ALLOWED_ORIGINS  opcional, lista separada por comas
//
// Deploy:
//   supabase secrets set OPENAI_API_KEY=sk-...
//   supabase functions deploy generar-contenido-propiedad
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// Producción + dev local (el dev server de Vite corre en el puerto 8080).
const DEFAULT_ORIGINS = [
  "https://luce-real-estate-landing.vercel.app",
  "http://localhost:8080",
];
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const ORIGINS = ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : DEFAULT_ORIGINS;

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

// ── Catálogo de amenidades ──────────────────────────────────────────────────
// Espejo de `src/data/amenidades.ts`. Se duplica porque una Edge Function de
// Deno no puede importar del bundle de la SPA. Si agregas amenidades allá,
// agrégalas aquí también (si falta una, se usa el slug tal cual).
const AMENIDAD_LABELS: Record<string, string> = {
  alberca: "alberca",
  jardin: "jardín",
  seguridad_24h: "seguridad 24 horas",
  gimnasio: "gimnasio",
  roof_garden: "roof garden",
  elevador: "elevador",
  terraza: "terraza",
  area_juegos: "área de juegos",
  salon_eventos: "salón de eventos",
  caseta_vigilancia: "caseta de vigilancia",
  amueblado: "amueblado",
  acepta_mascotas: "acepta mascotas",
  cisterna: "cisterna",
  cuarto_servicio: "cuarto de servicio",
  vista_panoramica: "vista panorámica",
  paneles_solares: "paneles solares",
};

const TIPO_LABELS: Record<string, string> = {
  casa: "Casa",
  departamento: "Departamento",
  penthouse: "Penthouse",
  local: "Local comercial",
  terreno: "Terreno",
};

interface Propiedad {
  id: number;
  nombre: string;
  tipo: string;
  tipo_oferta: string | null;
  estado: string | null;
  municipio: string | null;
  zona: string | null;
  direccion: string | null;
  codigo_postal: string | null;
  precio: number;
  recamaras: number | null;
  banos: number | null;
  metros_cuadrados: number | null;
  metros_terreno: number | null;
  estacionamientos: number | null;
  amenidades: string[] | null;
  acepta_credito: boolean | null;
  tipos_credito: string | null;
  descripcion: string | null;
  asesor_asignado: string | null;
  asesor_telefono: string | null;
  asesor_email: string | null;
}

/**
 * Arma la ficha que ve el modelo. Solo incluye lo que realmente existe: los
 * campos vacíos se omiten para que el modelo no tenga nada que "rellenar".
 */
function fichaPropiedad(p: Propiedad): string {
  const lineas: string[] = [];
  const add = (etiqueta: string, valor: unknown) => {
    if (valor === null || valor === undefined || valor === "" || valor === 0) return;
    lineas.push(`- ${etiqueta}: ${valor}`);
  };

  add("Nombre interno", p.nombre);
  add("Tipo de propiedad", TIPO_LABELS[p.tipo] ?? p.tipo);
  add("Operación", p.tipo_oferta);
  add("Precio", `$${Number(p.precio).toLocaleString("es-MX")} MXN`);
  add("Dirección", p.direccion);
  add("Zona o colonia", p.zona);
  add("Municipio", p.municipio);
  add("Estado", p.estado);
  add("Recámaras", p.recamaras);
  add("Baños", p.banos);
  add("Superficie construida", p.metros_cuadrados ? `${p.metros_cuadrados} m²` : null);
  add("Superficie de terreno", p.metros_terreno ? `${p.metros_terreno} m²` : null);
  add("Estacionamientos", p.estacionamientos);

  const amenidades = (p.amenidades ?? [])
    .filter(Boolean)
    .map((a) => AMENIDAD_LABELS[a] ?? a.replace(/_/g, " "));
  if (amenidades.length > 0) add("Amenidades", amenidades.join(", "));

  if (p.acepta_credito && p.tipos_credito) add("Créditos aceptados", p.tipos_credito);
  add("Notas del asesor sobre lo que destaca", p.descripcion);
  add("Nombre del asesor", p.asesor_asignado);
  add("Teléfono del asesor", p.asesor_telefono);
  add("Email del asesor", p.asesor_email);

  return lineas.join("\n");
}

const SYSTEM_PROMPT = `Eres un redactor experto en marketing inmobiliario en México. Escribes en español de México, con un tono profesional, cálido y aspiracional, sin exagerar ni sonar a folleto genérico.

REGLAS ABSOLUTAS:
1. Usa ÚNICAMENTE los datos de la ficha que te dan. Está terminantemente prohibido inventar, estimar o suponer datos (metros, recámaras, amenidades, años, cercanías, escuelas, plazas, precios o formas de pago que no aparezcan en la ficha).
2. Si un dato no está en la ficha, simplemente no lo menciones. Nunca escribas espacios en blanco, "N/D", corchetes ni marcadores como [precio].
3. No prometas rendimientos, plusvalía garantizada ni des asesoría legal o financiera.
4. Nada de MAYÚSCULAS sostenidas ni signos de exclamación repetidos.
5. Responde SOLO con un objeto JSON válido, sin texto adicional ni bloques de código.

Formato de respuesta (JSON):
{
  "descripcion": "string",
  "copy_instagram": "string",
  "hashtags": ["#ejemplo", "..."]
}

CÓMO ESCRIBIR "descripcion":
- Entre 120 y 180 palabras, en 2 o 3 párrafos, texto corrido sin emojis y sin viñetas.
- Estructura: gancho inicial que enamore → características concretas (superficie, recámaras, baños, estacionamiento, amenidades) → ubicación y entorno según los datos disponibles → cierre invitando a agendar una visita, con el nombre y los datos de contacto del asesor si están en la ficha.
- Menciona el precio y si es venta o renta.
- Sirve para portales inmobiliarios, WhatsApp y presentaciones a clientes.

CÓMO ESCRIBIR "copy_instagram":
- De 4 a 7 líneas cortas separadas por saltos de línea reales (\\n), pensado para leerse en el celular.
- Primera línea: gancho potente y corto.
- Incluye el precio, la operación (venta o renta) y la ubicación (municipio, estado).
- 2 o 3 líneas con lo mejor de la propiedad usando emojis con medida (máximo uno por línea; útiles: 🏡 🛏️ 🛁 🚗 📍 💰 ✨).
- Termina con un llamado a la acción claro ("Mándame un DM", "Escríbeme al ..." con el teléfono del asesor si está en la ficha).
- Después del llamado a la acción, deja una línea en blanco y pon TODOS los hashtags juntos en la última línea.

CÓMO ELEGIR "hashtags":
- Entre 20 y 25 hashtags, en español, sin repetir, cada uno empezando con #.
- Combina: (a) genéricos del sector en México, como #BienesRaicesMexico #Inmobiliaria #InversionInmobiliaria; (b) del tipo de propiedad y la operación, como #CasaEnVenta #DepartamentoEnRenta #Penthouse; (c) geolocalizados construidos con el municipio y el estado REALES de la ficha, por ejemplo #Tlaxcala #Puebla #Apizaco; (d) de estilo de vida acordes a la propiedad, como #HogarIdeal #MiPrimeraCasa.
- Escríbelos en CamelCase sin espacios, acentos ni caracteres especiales (#CasaEnVentaTlaxcala, no #CasaEnVentaTlaxcalá).
- El array "hashtags" debe contener los mismos hashtags que pusiste en la última línea de "copy_instagram".`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return json(req, { error: "Método no permitido" }, 405);
  }
  if (!OPENAI_API_KEY) {
    return json(req, { error: "El generador no está configurado. Falta la clave de OpenAI." }, 500);
  }

  // ── 1. Autenticación: sin JWT válido no se gasta un solo token de OpenAI ──
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json(req, { error: "No autorizado" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) return json(req, { error: "No autorizado" }, 401);
  const user = userData.user;

  // ── 2. Entrada ────────────────────────────────────────────────────────────
  let body: { propiedad_id?: number; tono?: string; guardar?: boolean };
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "Cuerpo de la petición inválido" }, 400);
  }

  const propiedadId = Number(body.propiedad_id);
  if (!propiedadId || Number.isNaN(propiedadId)) {
    return json(req, { error: "Falta el id de la propiedad" }, 400);
  }
  const tono = body.tono === "cercano" ? "cercano" : "profesional";
  const guardar = body.guardar !== false;

  // ── 3. La propiedad se lee de la BD, NUNCA del cliente ────────────────────
  // Así el texto siempre refleja el dato real y el navegador no puede inyectar
  // instrucciones dentro del prompt.
  const { data: propiedad, error: propErr } = await supabase
    .from("propiedades")
    .select(
      "id, nombre, tipo, tipo_oferta, estado, municipio, zona, direccion, codigo_postal, precio, recamaras, banos, metros_cuadrados, metros_terreno, estacionamientos, amenidades, acepta_credito, tipos_credito, descripcion, asesor_asignado, asesor_telefono, asesor_email",
    )
    .eq("id", propiedadId)
    .maybeSingle();

  if (propErr) return json(req, { error: "No se pudo leer la propiedad" }, 502);
  if (!propiedad) return json(req, { error: "Propiedad no encontrada" }, 404);

  const ficha = fichaPropiedad(propiedad as Propiedad);

  const userPrompt = `Ficha real de la propiedad:
${ficha}

Tono solicitado: ${tono === "cercano" ? "cercano y conversacional, de tú a tú" : "profesional y elegante"}.

Genera el JSON con la descripción, el copy de Instagram y los hashtags.`;

  // ── 4. OpenAI ─────────────────────────────────────────────────────────────
  let contenido: { descripcion?: string; copy_instagram?: string; hashtags?: unknown };
  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.8,
        max_tokens: 1400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!upstream.ok) {
      // El detalle se queda en los logs, no se filtra al navegador.
      console.error("OpenAI error", upstream.status, (await upstream.text()).slice(0, 500));
      return json(req, { error: "No se pudo generar el contenido. Intenta de nuevo." }, 502);
    }

    const payload = await upstream.json();
    const raw = payload?.choices?.[0]?.message?.content ?? "";
    contenido = JSON.parse(raw);
  } catch (e) {
    console.error("Fallo al generar contenido", e);
    return json(req, { error: "No se pudo generar el contenido. Intenta de nuevo." }, 502);
  }

  const descripcion = typeof contenido.descripcion === "string" ? contenido.descripcion.trim() : "";
  const copyInstagram =
    typeof contenido.copy_instagram === "string" ? contenido.copy_instagram.trim() : "";
  const hashtags = Array.isArray(contenido.hashtags)
    ? contenido.hashtags
        .filter((h): h is string => typeof h === "string")
        .map((h) => (h.startsWith("#") ? h : `#${h}`))
    : [];

  if (!descripcion && !copyInstagram) {
    return json(req, { error: "No se pudo generar el contenido. Intenta de nuevo." }, 502);
  }

  // ── 5. Historial. Si falla, se devuelve el contenido igualmente: perder el
  //       registro no debe costarle al agente el texto ya generado.
  if (guardar) {
    const { error: insErr } = await supabase.from("publicaciones_generadas").insert({
      propiedad_id: propiedadId,
      descripcion_generada: descripcion,
      copy_instagram: copyInstagram,
      hashtags,
      asesor: (propiedad as Propiedad).asesor_asignado ?? user.email ?? null,
      creado_por: user.id,
      modelo: OPENAI_MODEL,
    });
    if (insErr) console.error("No se pudo guardar el historial", insErr.message);
  }

  return json(req, {
    descripcion,
    copy_instagram: copyInstagram,
    hashtags,
    modelo: OPENAI_MODEL,
  });
});
