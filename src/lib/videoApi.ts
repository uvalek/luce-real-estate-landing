import { supabase } from "@/lib/supabase";

/**
 * Cliente del servicio de render de reels (carpeta `video/` del repo).
 *
 * El render necesita un Chromium headless, así que no puede vivir ni en Vercel
 * (sirve el sitio estático) ni en las Edge Functions de Supabase (Deno, sin
 * navegador): corre en un Node aparte cuya URL se configura en
 * `VITE_VIDEO_API_URL`.
 */

const API = (import.meta.env.VITE_VIDEO_API_URL as string | undefined)?.replace(/\/+$/, "") ?? "";

/** true si el servicio está configurado en esta instalación. */
export const videoDisponible = (): boolean => API.length > 0;

export type EstadoRender = "en cola" | "preparando" | "renderizando" | "subiendo" | "listo" | "error";

export interface ProgresoRender {
  estado: EstadoRender;
  progreso: number;
  duracion: number | null;
  url: string | null;
  nombre: string | null;
  error: string | null;
}

const SIN_CONFIGURAR =
  "El servicio de video no está configurado. Hay que levantarlo y poner su dirección en VITE_VIDEO_API_URL.";

async function token(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const t = session?.access_token ?? "";
  if (!t) throw new Error("Tu sesión expiró. Vuelve a entrar para generar el video.");
  return t;
}

const leerError = async (r: Response, porDefecto: string): Promise<string> => {
  try {
    const body = await r.json();
    if (body && typeof body.error === "string") return body.error;
  } catch {
    // respuesta sin JSON
  }
  return `${porDefecto} (error ${r.status})`;
};

/** Arranca el render y devuelve el id del trabajo. */
export async function iniciarRender(
  propiedadId: number,
  publicacionId?: number | null,
): Promise<string> {
  if (!API) throw new Error(SIN_CONFIGURAR);

  let r: Response;
  try {
    r = await fetch(`${API}/api/video/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await token()}`,
      },
      body: JSON.stringify({ propiedad_id: propiedadId, publicacion_id: publicacionId ?? null }),
    });
  } catch {
    throw new Error("No se pudo contactar al servicio de video. ¿Está encendido?");
  }

  if (!r.ok) throw new Error(await leerError(r, "No se pudo iniciar el video"));
  const { job_id: jobId } = (await r.json()) as { job_id: string };
  return jobId;
}

/** Consulta el avance de un render. */
export async function consultarRender(jobId: string): Promise<ProgresoRender> {
  if (!API) throw new Error(SIN_CONFIGURAR);

  const r = await fetch(`${API}/api/video/render/${jobId}`, {
    headers: { Authorization: `Bearer ${await token()}` },
  });
  if (!r.ok) throw new Error(await leerError(r, "Se perdió el avance del video"));
  return (await r.json()) as ProgresoRender;
}
