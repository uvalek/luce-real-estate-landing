/** Matches the "propiedades" table in Supabase */
export interface Propiedad {
  id: number;
  nombre: string;
  tipo: "casa" | "departamento" | "terreno" | "local";
  zona: string;
  direccion: string | null;
  precio: number;
  recamaras: number;
  banos: number;
  metros_cuadrados: number;
  acepta_credito: boolean;
  tipos_credito: string | null;
  descripcion: string | null;
  disponible: boolean;
  fecha_publicacion: string | null;
  asesor_asignado: string | null;
  observaciones: string | null;
  tipo_oferta: string | null;
  galeria: GaleriaFoto[] | null;
}

export interface GaleriaFoto {
  url: string;
  categoria: string;
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

export interface Lead {
  name: string;
  email: string;
  phone: string;
  interestType: "compra" | "renta" | "inversion" | "otro";
}
