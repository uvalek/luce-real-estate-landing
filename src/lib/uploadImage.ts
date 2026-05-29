import { supabase } from "@/lib/supabase";

const BUCKET = "fotospropiedades";
// Derive the storage URL from the same env var the client uses, so the project
// reference lives in one place only (no duplicated hardcoded subdomain).
const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "https://lrxwvyilfobwyndikqpq.supabase.co";
const BASE_URL = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;

/**
 * Uploads a file to Supabase Storage and returns the public URL.
 * File is stored under propiedades/{propiedadId}/{categoria}/{filename}
 */
export async function uploadImage(
  file: File,
  categoria: string,
  propiedadId?: number
): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const timestamp = Date.now();
  const folder = propiedadId ? `propiedades/${propiedadId}` : "propiedades/temp";
  const path = `${folder}/${categoria}/${timestamp}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw new Error(`Error subiendo imagen: ${error.message}`);

  return `${BASE_URL}/${path}`;
}
