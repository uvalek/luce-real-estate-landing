/**
 * Catálogo de amenidades de una propiedad.
 *
 * Fuente única de verdad: la usa el formulario de propiedades para pintar los
 * checkboxes y el generador de contenido para traducir los slugs guardados en
 * la columna `propiedades.amenidades` (jsonb) a texto legible.
 *
 * Los `value` se guardan en la base de datos — NO los cambies sin migrar los
 * datos existentes. Agregar opciones nuevas al final es seguro.
 */
export interface AmenidadOption {
  value: string;
  label: string;
}

export const AMENIDADES: readonly AmenidadOption[] = [
  { value: "alberca", label: "Alberca" },
  { value: "jardin", label: "Jardín" },
  { value: "seguridad_24h", label: "Seguridad 24h" },
  { value: "gimnasio", label: "Gimnasio" },
  { value: "roof_garden", label: "Roof garden" },
  { value: "elevador", label: "Elevador" },
  { value: "terraza", label: "Terraza" },
  { value: "area_juegos", label: "Área de juegos" },
  { value: "salon_eventos", label: "Salón de eventos" },
  { value: "caseta_vigilancia", label: "Caseta de vigilancia" },
  { value: "amueblado", label: "Amueblado" },
  { value: "acepta_mascotas", label: "Acepta mascotas" },
  { value: "cisterna", label: "Cisterna" },
  { value: "cuarto_servicio", label: "Cuarto de servicio" },
  { value: "vista_panoramica", label: "Vista panorámica" },
  { value: "paneles_solares", label: "Paneles solares" },
] as const;

/** Traduce un slug guardado en BD a su etiqueta legible (o el slug si no está en el catálogo). */
export const amenidadLabel = (value: string): string =>
  AMENIDADES.find((a) => a.value === value)?.label ?? value;

/** Traduce un array de slugs a etiquetas legibles, ignorando valores vacíos. */
export const amenidadesLabels = (values: string[] | null | undefined): string[] =>
  (values ?? []).filter(Boolean).map(amenidadLabel);
