import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Propiedad } from "@/types";

export function useProperties() {
  const [properties, setProperties] = useState<Propiedad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("propiedades")
        .select("*")
        .eq("disponible", true)
        .order("fecha_publicacion", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        console.error("Error fetching properties:", fetchError);
      } else {
        setProperties(data as Propiedad[]);
      }
      setLoading(false);
    };

    fetchProperties();
  }, []);

  return { properties, loading, error };
}
