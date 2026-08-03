/** Matches the "propiedades" table in Supabase */
export interface Propiedad {
  id: number;
  nombre: string;
  tipo: "casa" | "departamento" | "terreno" | "local" | "penthouse";
  estado: string;
  municipio: string;
  /** Comunidad / colonia / zona específica dentro del municipio. */
  zona: string;
  codigo_postal: string | null;
  direccion: string | null;
  precio: number;
  recamaras: number;
  banos: number;
  /** Superficie construida en m². */
  metros_cuadrados: number;
  /** Superficie de terreno en m². 0 cuando no aplica (p. ej. departamentos). */
  metros_terreno: number;
  estacionamientos: number;
  /** Slugs del catálogo en `src/data/amenidades.ts`. Columna jsonb. */
  amenidades: string[] | null;
  acepta_credito: boolean;
  tipos_credito: string | null;
  descripcion: string | null;
  disponible: boolean;
  fecha_publicacion: string | null;
  asesor_asignado: string | null;
  /** Teléfono de contacto del asesor — se publica en el contenido generado. */
  asesor_telefono: string | null;
  /** Email de contacto del asesor — se publica en el contenido generado. */
  asesor_email: string | null;
  observaciones: string | null;
  tipo_oferta: string | null;
  galeria: GaleriaFoto[] | null;
}

export interface GaleriaFoto {
  url: string;
  categoria: string;
}

/** Una lámina del carrusel de Instagram ya guardada en Storage. */
export interface LaminaGuardada {
  nombre: string;
  url: string;
}

/** Matches the "publicaciones_generadas" table in Supabase */
export interface PublicacionGenerada {
  id: number;
  propiedad_id: number;
  descripcion_generada: string | null;
  copy_instagram: string | null;
  hashtags: string[] | null;
  /** Láminas del carrusel ya generadas, en orden. Columna jsonb. */
  imagenes: LaminaGuardada[] | null;
  asesor: string | null;
  creado_por: string | null;
  modelo: string | null;
  created_at: string;
}

/** Respuesta de la Edge Function `generar-contenido-propiedad`. */
export interface ContenidoGenerado {
  descripcion: string;
  copy_instagram: string;
  hashtags: string[];
  modelo: string;
  /** Fila creada en `publicaciones_generadas`; null si el historial falló. */
  publicacion_id: number | null;
}

/** Legacy interface kept for backward compatibility with mockData */
export interface Property {
  id: string;
  title: string;
  price: string;
  location: string;
  beds: number;
  baths: number;
  sqft: string;
  imageUrl: string;
  featured: boolean;
}

/** Matches the "contactos" table in Supabase */
export interface Contacto {
  id: number;
  nombre: string;
  correo: string | null;
  etapa_seguimiento: string;
  telefono: string | null;
  tipo_credito: string | null;
  zona_interes: string | null;
  presupuesto_max: number;
  fecha_visita: string | null;
  propiedad_interesada: number | null;
  asesor_asignado: string | null;
  estado: string | null;
  municipio: string | null;
  created_at: string;
}

export interface Lead {
  name: string;
  email: string;
  phone: string;
  interestType: "compra" | "renta" | "inversion" | "otro";
}
