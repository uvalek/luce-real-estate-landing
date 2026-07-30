import { describe, it, expect, beforeAll, vi } from "vitest";
import { crearFichaPdf } from "@/lib/propiedadPdf";
import type { Propiedad } from "@/types";

/**
 * La ficha PDF se arma con muchas ramas opcionales (fotos, amenidades, terreno,
 * contacto del asesor). Estas pruebas cubren los dos extremos —propiedad
 * completa y propiedad recién creada sin nada— para que un cambio de maquetación
 * no rompa la descarga en producción.
 *
 * jsdom no implementa canvas ni carga imágenes: se sustituyen por stubs.
 */

const JPEG_1PX =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDs0NDT/wAALCAABAAEBAREA/8QAFAABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AJQA/9k=";

const base: Propiedad = {
  id: 99,
  nombre: "Casa de prueba con acentos: Recámaras y Baños",
  tipo: "casa",
  estado: "Tlaxcala",
  municipio: "Apizaco",
  zona: "Centro",
  codigo_postal: "90300",
  direccion: "Av. Hidalgo 123",
  precio: 2_450_000,
  recamaras: 3,
  banos: 2,
  metros_cuadrados: 180,
  metros_terreno: 240,
  estacionamientos: 2,
  amenidades: ["alberca", "jardin", "seguridad_24h", "gimnasio", "roof_garden"],
  acepta_credito: true,
  tipos_credito: "bancario, infonavit",
  descripcion: null,
  disponible: true,
  fecha_publicacion: null,
  asesor_asignado: "Ana López",
  asesor_telefono: "241 123 4567",
  asesor_email: "ana@luce.mx",
  observaciones: null,
  tipo_oferta: "VENTA",
  galeria: [
    { url: "https://ejemplo.test/portada.jpg", categoria: "portada" },
    { url: "https://ejemplo.test/1.jpg", categoria: "cocina" },
    { url: "https://ejemplo.test/2.jpg", categoria: "jardin" },
  ],
};

const DESCRIPCION =
  "Ubicada en el corazón de Apizaco, esta casa de 180 metros cuadrados de construcción " +
  "combina amplitud y ubicación. Sus tres recámaras y dos baños completos están pensados " +
  "para una familia que busca crecer sin salir del centro, y los dos cajones de " +
  "estacionamiento resuelven el día a día. Agenda tu visita con Ana López al 241 123 4567.";

const leerBlob = (blob: Blob): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as ArrayBuffer);
    r.onerror = () => reject(new Error("no se pudo leer el blob"));
    r.readAsArrayBuffer(blob);
  });

beforeAll(() => {
  // Cualquier foto responde con un JPEG mínimo.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      blob: async () => new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }),
    })),
  );

  class FakeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    width = 1600;
    height = 1067;
    #src = "";
    set src(v: string) {
      this.#src = v;
      setTimeout(() => this.onload?.(), 0);
    }
    get src() {
      return this.#src;
    }
  }
  vi.stubGlobal("Image", FakeImage);

  HTMLCanvasElement.prototype.getContext = (() => ({
    fillStyle: "",
    fillRect: () => {},
    drawImage: () => {},
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.toDataURL = () => JPEG_1PX;
});

describe("crearFichaPdf", () => {
  it("arma la ficha de una propiedad completa", async () => {
    const { blob, nombre } = await crearFichaPdf(base, { descripcion: DESCRIPCION });

    expect(nombre).toBe("LUCE-Casa-de-prueba-con-acentos-Recamaras-y-Banos.pdf");
    expect(blob.size).toBeGreaterThan(1000);

    // Una ficha típica debe caber en una sola hoja.
    const bytes = new Uint8Array(await leerBlob(blob));
    const raw = new TextDecoder("latin1").decode(bytes);
    expect(raw.match(/\/Type\s*\/Page[^s]/g)).toHaveLength(1);
  });

  it("no se rompe con una propiedad sin fotos, amenidades ni contacto", async () => {
    const pelada: Propiedad = {
      ...base,
      metros_terreno: 0,
      estacionamientos: 0,
      amenidades: [],
      asesor_asignado: null,
      asesor_telefono: null,
      asesor_email: null,
      galeria: [],
    };

    const { blob } = await crearFichaPdf(pelada, { descripcion: "" });
    expect(blob.size).toBeGreaterThan(500);
  });
});
