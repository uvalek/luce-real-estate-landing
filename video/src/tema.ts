import { z } from "zod";

/** Paleta y tiempos del reel. Mismos colores de marca que el dashboard. */

export const COLORES = {
  cobalt: "#0f1f3d",
  cobaltClaro: "#1c2f54",
  gold: "#d2962d",
  goldClaro: "#e5b463",
  blanco: "#ffffff",
  velo: "rgba(9,16,32,0.92)",
} as const;

export const FPS = 30;
export const ANCHO = 1080;
export const ALTO = 1920;

/** Duraciones en frames. */
export const DUR = {
  portada: 4.5 * FPS, //  4.5 s
  foto: 3.5 * FPS, //  3.5 s por foto
  cierre: 5 * FPS, //  5.0 s
  transicion: 0.5 * FPS,
} as const;

/**
 * Cuántas escenas de foto lleva el reel.
 *
 * El encargo pide entre 20 y 30 segundos, con 3-4 s por foto. Con las escenas
 * fijas (4.5 + 5 s) y 3.5 s por foto, eso son entre 4 y 6 escenas:
 *   4 escenas → 21.0 s · 5 → 24.0 s · 6 → 27.0 s
 * (las transiciones se solapan con las escenas, por eso restan del total).
 *
 * Si la propiedad tiene menos de 4 fotos se repiten en ciclo: cada repetición
 * muestra un dato distinto, así que sigue aportando información.
 */
export const MIN_ESCENAS = 4;
export const MAX_ESCENAS = 6;

/**
 * Props que el backend le pasa a la composición.
 *
 * Se declaran con zod porque Remotion las usa para dos cosas: tipar el
 * componente y pintar un formulario editable en el estudio (`npm run studio`),
 * que es como se prueban cambios de diseño sin tocar el backend.
 */
export const fotoSchema = z.object({
  url: z.string(),
  categoria: z.string(),
});

export const reelSchema = z.object({
  nombre: z.string(),
  /** "En Venta" | "En Renta" | ... */
  operacion: z.string(),
  precio: z.number(),
  ubicacion: z.string(),
  recamaras: z.number(),
  banos: z.number(),
  metrosCuadrados: z.number(),
  metrosTerreno: z.number(),
  estacionamientos: z.number(),
  amenidades: z.array(z.string()),
  /** La portada va primero. */
  fotos: z.array(fotoSchema),
  asesor: z.object({
    nombre: z.string(),
    telefono: z.string(),
    email: z.string(),
  }),
});

export type FotoReel = z.infer<typeof fotoSchema>;
export type ReelProps = z.infer<typeof reelSchema>;
export type AsesorReel = ReelProps["asesor"];

export const CATEGORIA_LABELS: Record<string, string> = {
  portada: "La propiedad",
  fachada: "Fachada",
  sala: "Sala",
  cocina: "Cocina",
  recamara: "Recámara",
  bano: "Baño",
  comedor: "Comedor",
  jardin: "Jardín",
  cochera: "Cochera",
  terraza: "Terraza",
  patio: "Patio",
  otro: "Un vistazo más",
};

export const numero = (n: number): string => Math.round(n).toLocaleString("es-MX");

/** Un dato destacado que acompaña a una foto. */
export interface DatoDestacado {
  etiqueta: string;
  valor: string;
}

/**
 * Reparte los datos de la propiedad entre las fotos: primero el que va con la
 * categoría de la foto (la cochera habla de estacionamientos), y si no aplica,
 * el siguiente dato que todavía no se haya mostrado. Así cada lámina aporta
 * información nueva en vez de repetir la misma.
 */
export function repartirDatos(props: ReelProps, fotos: FotoReel[]): (DatoDestacado | null)[] {
  const porCategoria: Record<string, DatoDestacado | null> = {
    recamara: props.recamaras > 0 ? { etiqueta: "Recámaras", valor: numero(props.recamaras) } : null,
    bano: props.banos > 0 ? { etiqueta: "Baños completos", valor: numero(props.banos) } : null,
    cochera:
      props.estacionamientos > 0
        ? { etiqueta: "Estacionamientos", valor: numero(props.estacionamientos) }
        : null,
    jardin: props.metrosTerreno > 0 ? { etiqueta: "Terreno", valor: `${numero(props.metrosTerreno)} m²` } : null,
    patio: props.metrosTerreno > 0 ? { etiqueta: "Terreno", valor: `${numero(props.metrosTerreno)} m²` } : null,
    terraza: props.metrosTerreno > 0 ? { etiqueta: "Terreno", valor: `${numero(props.metrosTerreno)} m²` } : null,
  };

  const cola: DatoDestacado[] = [];
  if (props.metrosCuadrados > 0)
    cola.push({ etiqueta: "Construcción", valor: `${numero(props.metrosCuadrados)} m²` });
  if (props.recamaras > 0) cola.push({ etiqueta: "Recámaras", valor: numero(props.recamaras) });
  if (props.banos > 0) cola.push({ etiqueta: "Baños completos", valor: numero(props.banos) });
  if (props.metrosTerreno > 0)
    cola.push({ etiqueta: "Terreno", valor: `${numero(props.metrosTerreno)} m²` });
  if (props.estacionamientos > 0)
    cola.push({ etiqueta: "Estacionamientos", valor: numero(props.estacionamientos) });
  props.amenidades.slice(0, 3).forEach((a) => cola.push({ etiqueta: "Amenidad", valor: a }));

  const usados = new Set<string>();
  const siguienteLibre = (): DatoDestacado | null => {
    const libre = cola.find((d) => !usados.has(`${d.etiqueta}${d.valor}`));
    if (libre) usados.add(`${libre.etiqueta}${libre.valor}`);
    return libre ?? null;
  };

  return fotos.map((f) => {
    const preferido = porCategoria[f.categoria];
    if (preferido && !usados.has(`${preferido.etiqueta}${preferido.valor}`)) {
      usados.add(`${preferido.etiqueta}${preferido.valor}`);
      return preferido;
    }
    return siguienteLibre();
  });
}
