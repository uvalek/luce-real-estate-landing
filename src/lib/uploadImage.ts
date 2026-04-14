import { supabase } from "@/lib/supabase";

const BUCKET = "fotospropiedades";
const BASE_URL = `https://lrxwvyilfobwyndikqpq.supabase.co/storage/v1/object/public/${BUCKET}`;

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
