// supabase/functions/chatbot-proxy/index.ts
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │  PROXY SEGURO PARA LA API DEL CHATBOT (FastAPI en EasyPanel)              │
// ├─────────────────────────────────────────────────────────────────────────┤
// │  PROBLEMA QUE RESUELVE (ver SECURITY_AUDIT.md, hallazgo CRÍTICO #1):      │
// │  Hoy el cliente llama directo a la API del chatbot con un header          │
// │  X-API-Key que vive en VITE_CHATBOT_API_KEY. Como es una variable VITE_,  │
// │  esa key queda incrustada en el JavaScript que llega al navegador, así    │
// │  que CUALQUIER visitante del sitio puede extraerla y usar tu API.         │
// │                                                                           │
// │  ESTA FUNCIÓN mueve esa key al servidor: el navegador llama a esta Edge   │
// │  Function con su JWT de Supabase (sesión del admin); la función verifica  │
// │  que sea un usuario autenticado y SOLO ENTONCES reenvía la petición a la  │
// │  FastAPI agregando la X-API-Key del lado servidor (Deno.env, nunca        │
// │  expuesta al navegador).                                                  │
// └─────────────────────────────────────────────────────────────────────────┘
//
// CÓMO DESPLEGAR (ver SECURITY_AUDIT.md → "Cutover del chatbot"):
//   1. supabase secrets set CHATBOT_API_URL="https://TU-CHATBOT.easypanel.host"
//   2. supabase secrets set CHATBOT_API_KEY="la-key-real-NUEVA-rotada"
//   3. supabase secrets set ALLOWED_ORIGIN="https://tu-dominio-en-vercel.com"
//   4. supabase functions deploy chatbot-proxy
//   5. Refactoriza src/lib/chatbotApi.ts para llamar a esta función en lugar
//      de a la FastAPI directa (snippet en SECURITY_AUDIT.md).
//   6. Borra VITE_CHATBOT_API_KEY de Vercel y rota la key vieja en EasyPanel.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CHATBOT_API_URL y ALLOWED_ORIGIN tienen defaults seguros (no son secretos),
// así el owner SOLO tiene que registrar UN secreto en el dashboard: CHATBOT_API_KEY.
const CHATBOT_API_URL =
  Deno.env.get("CHATBOT_API_URL") ??
  "https://megachatbot-chatbotmain.aslx54.easypanel.host";
const CHATBOT_API_KEY = Deno.env.get("CHATBOT_API_KEY") ?? "";
const ALLOWED_ORIGIN =
  Deno.env.get("ALLOWED_ORIGIN") ??
  "https://luce-real-estate-landing.vercel.app";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!CHATBOT_API_URL || !CHATBOT_API_KEY) {
    return json({ error: "Proxy no configurado" }, 500);
  }

  // 1) Verificar el JWT del usuario (debe ser un admin con sesión válida).
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "No autorizado" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    return json({ error: "No autorizado" }, 401);
  }

  // 2) Reconstruir la ruta destino: todo lo que venga después de
  //    /functions/v1/chatbot-proxy se reenvía tal cual a la FastAPI.
  const url = new URL(req.url);
  const marker = "/chatbot-proxy";
  const idx = url.pathname.indexOf(marker);
  const forwardPath =
    idx >= 0 ? url.pathname.slice(idx + marker.length) : url.pathname;
  const target = `${CHATBOT_API_URL}${forwardPath}${url.search}`;

  // 3) Reenviar con la key del lado servidor.
  const init: RequestInit = {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": CHATBOT_API_KEY,
    },
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  try {
    const upstream = await fetch(target, init);
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        "Content-Type":
          upstream.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (_e) {
    // No filtramos detalles internos del error al cliente.
    return json({ error: "Error al contactar el servicio" }, 502);
  }
});
