/**
 * Metadata de los "atributos" (columnas) de la tabla `contactos` en Supabase.
 * Cada atributo tiene un tipo, etiqueta y descripción. Si `hasOptions` es true,
 * sus opciones se almacenan en la tabla `crm_atributo_opciones` y son editables
 * desde la sección de Configuración.
 */

export type TipoAtributo =
  | "id"
  | "text"
  | "email"
  | "tel"
  | "select"
  | "number"
  | "datetime"
  | "reference"
  | "timestamp";

export interface AtributoMeta {
  campo: string;          // nombre de la columna en Supabase
  etiqueta: string;       // nombre visible en la UI
  tipo: TipoAtributo;     // tipo lógico del campo
  tipoSupabase: string;   // tipo real en Postgres
  descripcion: string;    // descripción corta de qué almacena
  editable: boolean;      // si el usuario puede modificar el valor desde la tabla
  hasOptions?: boolean;   // si es un select con opciones configurables
}

export const ATRIBUTOS_CONTACTOS: AtributoMeta[] = [
  {
    campo: "id",
    etiqueta: "ID",
    tipo: "id",
    tipoSupabase: "integer (auto)",
    descripcion: "Identificador único auto-generado por la base de datos.",
    editable: false,
  },
  {
    campo: "nombre",
    etiqueta: "Nombre",
    tipo: "text",
    tipoSupabase: "text",
    descripcion: "Nombre completo del contacto. Campo obligatorio.",
    editable: true,
  },
  {
    campo: "correo",
    etiqueta: "Correo electrónico",
    tipo: "email",
    tipoSupabase: "text",
    descripcion: "Dirección de email del contacto.",
    editable: true,
  },
  {
    campo: "telefono",
    etiqueta: "Teléfono",
    tipo: "tel",
    tipoSupabase: "text",
    descripcion: "Número telefónico de contacto (incluye lada).",
    editable: true,
  },
  {
    campo: "etapa_seguimiento",
    etiqueta: "Etapa de seguimiento",
    tipo: "select",
    tipoSupabase: "text",
    descripcion: "Fase del embudo de venta en la que se encuentra el contacto.",
    editable: true,
    hasOptions: true,
  },
  {
    campo: "tipo_credito",
    etiqueta: "Tipo de crédito",
    tipo: "select",
    tipoSupabase: "text",
    descripcion: "Tipo de financiamiento con el que planea adquirir el inmueble.",
    editable: true,
    hasOptions: true,
  },
  {
    campo: "zona_interes",
    etiqueta: "Zona de interés",
    tipo: "text",
    tipoSupabase: "text",
    descripcion: "Zona o colonia en la que el contacto busca inmueble.",
    editable: true,
  },
  {
    campo: "presupuesto_max",
    etiqueta: "Presupuesto máximo",
    tipo: "number",
    tipoSupabase: "numeric",
    descripcion: "Presupuesto tope en pesos mexicanos (MXN).",
    editable: true,
  },
  {
    campo: "fecha_visita",
    etiqueta: "Fecha de visita",
    tipo: "datetime",
    tipoSupabase: "timestamptz",
    descripcion: "Fecha y hora agendada para la visita al inmueble.",
    editable: true,
  },
  {
    campo: "propiedad_interesada",
    etiqueta: "Inmueble de interés",
    tipo: "reference",
    tipoSupabase: "integer → propiedades(id)",
    descripcion: "Inmueble del catálogo con el que el contacto está vinculado.",
    editable: true,
  },
  {
    campo: "created_at",
    etiqueta: "Fecha de creación",
    tipo: "timestamp",
    tipoSupabase: "timestamptz (auto)",
    descripcion: "Cuándo se registró el contacto por primera vez (automático).",
    editable: false,
  },
];

export interface OpcionAtributo {
  id: number;
  campo: string;
  valor: string;
  etiqueta: string;
  color: string | null;
  orden: number;
  created_at?: string;
}

/**
 * Paleta de colores sugeridos para opciones.
 * Cada entrada es una clase Tailwind compuesta (bg + text).
 */
export const COLOR_PALETTE: { label: string; className: string }[] = [
  { label: "Azul",      className: "bg-blue-100 text-blue-700" },
  { label: "Morado",    className: "bg-purple-100 text-purple-700" },
  { label: "Rosa",      className: "bg-pink-100 text-pink-700" },
  { label: "Rojo",      className: "bg-red-100 text-red-700" },
  { label: "Naranja",   className: "bg-orange-100 text-orange-700" },
  { label: "Ámbar",     className: "bg-amber-100 text-amber-700" },
  { label: "Amarillo",  className: "bg-yellow-100 text-yellow-700" },
  { label: "Lima",      className: "bg-lime-100 text-lime-700" },
  { label: "Verde",     className: "bg-emerald-100 text-emerald-700" },
  { label: "Teal",      className: "bg-teal-100 text-teal-700" },
  { label: "Cian",      className: "bg-cyan-100 text-cyan-700" },
  { label: "Índigo",    className: "bg-indigo-100 text-indigo-700" },
  { label: "Gris",      className: "bg-gray-100 text-gray-700" },
  { label: "Piedra",    className: "bg-stone-100 text-stone-700" },
  { label: "Rosa fucsia", className: "bg-fuchsia-100 text-fuchsia-700" },
];

export const DEFAULT_OPTION_COLOR = "bg-gray-100 text-gray-700";
