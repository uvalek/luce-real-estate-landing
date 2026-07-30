import { supabase } from "@/lib/supabase";
import type { ContenidoGenerado, PublicacionGenerada } from "@/types";

/**
 * Cliente del generador de contenido para redes.
 *
 * La generación pasa por la Edge Function `generar-contenido-propiedad`: la
 * clave de OpenAI vive ahí y nunca llega al navegador (ver SECURITY_AUDIT.md).
 * El historial sí se consulta directo a Postgres, protegido por RLS.
 *
 * Mismo patrón de llamada que `src/lib/chatbotApi.ts`.
 */

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "https://lrxwvyilfobwyndikqpq.supabase.co";
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/generar-contenido-propiedad`;

/** Extrae el mensaje de error legible que devuelve la función. */
const readError = async (r: Response): Promise<string> => {
  try {
    const body = await r.json();
    if (body && typeof body.error === "string") return body.error;
  } catch {
    // respuesta sin JSON — caemos al mensaje genérico
  }
  return `No se pudo generar el contenido (error ${r.status}).`;
};

/** Genera descripción + copy de Instagram para una propiedad. */
export async function generarContenido(
  propiedadId: number,
  tono: "profesional" | "cercano" = "profesional",
): Promise<ContenidoGenerado> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token ?? "";
  if (!token) throw new Error("Tu sesión expiró. Vuelve a entrar para generar contenido.");

  const r = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ propiedad_id: propiedadId, tono }),
  });

  if (!r.ok) throw new Error(await readError(r));
  return (await r.json()) as ContenidoGenerado;
}

/** Historial de contenido generado, opcionalmente filtrado por propiedad. */
export async function listarPublicaciones(
  propiedadId?: number,
  limite = 10,
): Promise<PublicacionGenerada[]> {
  let query = supabase
    .from("publicaciones_generadas")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limite);

  if (propiedadId) query = query.eq("propiedad_id", propiedadId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as PublicacionGenerada[]) || [];
}

/** Borra un registro del historial. */
export async function borrarPublicacion(id: number): Promise<void> {
  const { error } = await supabase.from("publicaciones_generadas").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
