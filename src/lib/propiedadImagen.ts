import { amenidadesLabels } from "@/data/amenidades";
import type { Propiedad } from "@/types";

/**
 * Carrusel de imágenes cuadradas (1080x1080) para publicar en Instagram.
 *
 *   1. Portada  — foto principal, badge de operación, precio, ubicación y los
 *                 datos clave con iconos.
 *   2..N.       — una lámina por cada foto extra, con el nombre del espacio y
 *                 el dato de la propiedad que le corresponde.
 *   Última      — cierre con las amenidades y los datos del asesor.
 *
 * Se compone en un <canvas> del navegador. Los iconos se dibujan como vectores
 * (los mismos trazos de lucide que usa el dashboard) porque dentro del canvas
 * no se puede depender de una fuente de iconos.
 */

const SIZE = 1080;
const PAD = 72;

/** Instagram acepta hasta 20, pero un carrusel largo se abandona a media vista. */
const MAX_SLIDES = 10;

const GOLD = "#d2962d";
const GOLD_CLARO = "#e5b463";
const COBALT = "#0f1f3d";

/* ── Iconos (viewBox 24x24, trazos de lucide) ────────────────────────────── */
const ICONOS = {
  recamaras: [
    "M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8",
    "M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4",
    "M12 4v6",
    "M2 18h20",
  ],
  banos: [
    "M4 12V5a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2",
    "M3 12h18v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-3z",
    "M7 20l-1 2",
    "M17 20l1 2",
  ],
  metros: [
    "M8 3H5a2 2 0 0 0-2 2v3",
    "M21 8V5a2 2 0 0 0-2-2h-3",
    "M3 16v3a2 2 0 0 0 2 2h3",
    "M16 21h3a2 2 0 0 0 2-2v-3",
  ],
} as const;

/**
 * Nombres de los espacios de la galería.
 * Espejo de las categorías de `src/components/admin/GalleryUpload.tsx`; si se
 * agregan allá, agrégalas aquí (si falta una se usa el slug tal cual).
 */
const CATEGORIA_LABELS: Record<string, string> = {
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

/* ── Utilidades de dibujo ────────────────────────────────────────────────── */

function dibujarIcono(
  ctx: CanvasRenderingContext2D,
  paths: readonly string[],
  x: number,
  y: number,
  tam: number,
  color = GOLD,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(tam / 24, tam / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  paths.forEach((d) => ctx.stroke(new Path2D(d)));
  ctx.restore();
}

/** Texto con espaciado entre letras — canvas no tiene letter-spacing fiable. */
function textoEspaciado(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  espacio: number,
) {
  let cursor = x;
  for (const ch of texto) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + espacio;
  }
}

function anchoEspaciado(
  ctx: CanvasRenderingContext2D,
  texto: string,
  espacio: number,
): number {
  let ancho = 0;
  for (const ch of texto) ancho += ctx.measureText(ch).width + espacio;
  return ancho - espacio;
}

function rectRedondeado(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const numero = (n: number): string => Math.round(n).toLocaleString("es-MX");

const slug = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "propiedad";

/** "VENTA" → "En Venta", "RENTA Y VENTA" → "En Renta y Venta". */
function textoOperacion(tipoOferta: string | null): string {
  const v = (tipoOferta || "").trim().toUpperCase();
  if (v === "VENTA") return "En Venta";
  if (v === "RENTA") return "En Renta";
  if (v === "RENTA Y VENTA") return "En Renta y Venta";
  return "Disponible";
}

/** Descarga la foto y la devuelve como <img> ya cargada (sin ensuciar el canvas). */
async function cargarFoto(url: string): Promise<HTMLImageElement | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("No se pudo leer la foto"));
      reader.readAsDataURL(blob);
    });
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Foto inválida"));
      img.src = dataUrl;
    });
  } catch {
    return null;
  }
}

/** Espera a que Montserrat esté disponible para el canvas. */
async function esperarFuentes(): Promise<void> {
  if (!("fonts" in document)) return;
  try {
    await Promise.all([
      document.fonts.load("800 100px Montserrat"),
      document.fonts.load("700 40px Montserrat"),
      document.fonts.load("600 30px Montserrat"),
    ]);
  } catch {
    // Si Google Fonts no responde, canvas cae a la tipografía del sistema.
  }
}

function nuevoLienzo(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tu navegador no permite generar las imágenes.");
  ctx.textBaseline = "alphabetic";
  return { canvas, ctx };
}

/** Foto de fondo recortada tipo "cover", o degradado de marca si no hay foto. */
function dibujarFondo(ctx: CanvasRenderingContext2D, foto: HTMLImageElement | null) {
  if (foto) {
    const ratio = Math.max(SIZE / foto.width, SIZE / foto.height);
    const w = foto.width * ratio;
    const h = foto.height * ratio;
    ctx.drawImage(foto, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
  } else {
    const fondo = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    fondo.addColorStop(0, "#16294f");
    fondo.addColorStop(1, COBALT);
    ctx.fillStyle = fondo;
    ctx.fillRect(0, 0, SIZE, SIZE);
  }
}

/**
 * Degradado superior: el logo cae ahí y muchas fotos tienen cielo claro justo
 * en esa esquina.
 */
function dibujarVeloSuperior(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, 0, 380);
  g.addColorStop(0, "rgba(10,18,36,0.8)");
  g.addColorStop(0.45, "rgba(10,18,36,0.42)");
  g.addColorStop(1, "rgba(10,18,36,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, 380);
}

function dibujarVeloInferior(ctx: CanvasRenderingContext2D, desde = 380) {
  const g = ctx.createLinearGradient(0, desde, 0, SIZE);
  g.addColorStop(0, "rgba(10,18,36,0)");
  g.addColorStop(0.45, "rgba(10,18,36,0.72)");
  g.addColorStop(1, "rgba(8,14,28,0.96)");
  ctx.fillStyle = g;
  ctx.fillRect(0, desde, SIZE, SIZE - desde);
}

function dibujarMarca(ctx: CanvasRenderingContext2D) {
  ctx.font = "800 34px Montserrat, sans-serif";
  ctx.fillStyle = "#ffffff";
  const marcaW = anchoEspaciado(ctx, "LUCE", 8);
  textoEspaciado(ctx, "LUCE", SIZE - PAD - marcaW, PAD + 36, 8);
  ctx.font = "700 18px Montserrat, sans-serif";
  ctx.fillStyle = GOLD_CLARO;
  const subW = anchoEspaciado(ctx, "REAL ESTATE", 5);
  textoEspaciado(ctx, "REAL ESTATE", SIZE - PAD - subW, PAD + 66, 5);
}

/** Chip translúcido con icono y valor. Devuelve el ancho ocupado. */
function dibujarChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  alto: number,
  icono: readonly string[],
  valor: string,
): number {
  ctx.font = "700 34px Montserrat, sans-serif";
  const w = 44 + 44 + 18 + ctx.measureText(valor).width;

  ctx.fillStyle = "rgba(255,255,255,0.13)";
  rectRedondeado(ctx, x, y, w, alto, 22);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 2;
  rectRedondeado(ctx, x, y, w, alto, 22);
  ctx.stroke();

  dibujarIcono(ctx, icono, x + 22, y + (alto - 44) / 2, 44);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 34px Montserrat, sans-serif";
  ctx.fillText(valor, x + 22 + 44 + 18, y + alto / 2 + 12);
  return w;
}

/**
 * JPEG en calidad alta y no PNG: las láminas son fotografías, Instagram las
 * recomprime a JPEG de todas formas, y el carrusel completo baja de ~4 MB a
 * poco más de 1 MB.
 */
const lienzoABlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("No se pudo crear la imagen."))),
      "image/jpeg",
      0.92,
    );
  });

/* ── Datos clave ─────────────────────────────────────────────────────────── */

function datosClave(p: Propiedad): { icono: readonly string[]; valor: string }[] {
  const datos: { icono: readonly string[]; valor: string }[] = [];
  if (p.recamaras > 0) datos.push({ icono: ICONOS.recamaras, valor: `${numero(p.recamaras)} rec` });
  if (p.banos > 0) datos.push({ icono: ICONOS.banos, valor: `${numero(p.banos)} baños` });
  if (p.metros_cuadrados > 0)
    datos.push({ icono: ICONOS.metros, valor: `${numero(p.metros_cuadrados)} m²` });
  return datos;
}

const ubicacionDe = (p: Propiedad): string =>
  [p.municipio, p.estado].filter(Boolean).join(", ") || p.zona || p.direccion || "";

/**
 * El dato que mejor acompaña a la foto de cada espacio: la recámara habla de
 * recámaras, la cochera de estacionamientos, el jardín del terreno.
 */
function datoDeCategoria(categoria: string, p: Propiedad): string | null {
  switch (categoria) {
    case "recamara":
      return p.recamaras > 0 ? `${numero(p.recamaras)} recámaras en total` : null;
    case "bano":
      return p.banos > 0 ? `${numero(p.banos)} baños completos` : null;
    case "cochera":
      return p.estacionamientos > 0
        ? `${numero(p.estacionamientos)} lugares de estacionamiento`
        : null;
    case "jardin":
    case "patio":
    case "terraza":
      return p.metros_terreno > 0 ? `${numero(p.metros_terreno)} m² de terreno` : null;
    default:
      return p.metros_cuadrados > 0 ? `${numero(p.metros_cuadrados)} m² de construcción` : null;
  }
}

/* ── Láminas ─────────────────────────────────────────────────────────────── */

/** Lámina 1: el gancho. */
function laminaPortada(propiedad: Propiedad, foto: HTMLImageElement | null): HTMLCanvasElement {
  const { canvas, ctx } = nuevoLienzo();
  dibujarFondo(ctx, foto);
  dibujarVeloSuperior(ctx);
  dibujarVeloInferior(ctx);

  // Badge de operación
  const badge = textoOperacion(propiedad.tipo_oferta).toUpperCase();
  ctx.font = "800 28px Montserrat, sans-serif";
  const badgeW = anchoEspaciado(ctx, badge, 3.2) + 56;
  const badgeH = 64;
  ctx.fillStyle = GOLD;
  rectRedondeado(ctx, PAD, PAD, badgeW, badgeH, badgeH / 2);
  ctx.fill();
  ctx.fillStyle = COBALT;
  textoEspaciado(ctx, badge, PAD + 28, PAD + 42, 3.2);

  dibujarMarca(ctx);

  const datos = datosClave(propiedad);
  const chipH = 84;
  const baseY = SIZE - PAD - (datos.length > 0 ? chipH : 0);

  // Precio
  ctx.font = "800 104px Montserrat, sans-serif";
  ctx.fillStyle = "#ffffff";
  const precioTexto = `$${numero(propiedad.precio)}`;
  const precioY = baseY - (datos.length > 0 ? 46 : 8);
  ctx.fillText(precioTexto, PAD, precioY);
  const precioW = ctx.measureText(precioTexto).width;
  ctx.font = "700 36px Montserrat, sans-serif";
  ctx.fillStyle = GOLD;
  ctx.fillText("MXN", PAD + precioW + 18, precioY);

  // Ubicación
  const ubicacion = ubicacionDe(propiedad);
  if (ubicacion) {
    ctx.font = "600 30px Montserrat, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    textoEspaciado(ctx, ubicacion.toUpperCase(), PAD, precioY - 138, 3);
  }

  // Línea dorada, separada del precio (que sube ~75 px sobre su base).
  ctx.fillStyle = GOLD;
  ctx.fillRect(PAD, precioY - 114, 88, 5);

  // Chips
  let x = PAD;
  datos.forEach(({ icono, valor }) => {
    x += dibujarChip(ctx, x, SIZE - PAD - chipH, chipH, icono, valor) + 18;
  });

  return canvas;
}

/** Láminas intermedias: una foto, el espacio que muestra y un dato. */
function laminaEspacio(
  propiedad: Propiedad,
  foto: HTMLImageElement,
  categoria: string,
): HTMLCanvasElement {
  const { canvas, ctx } = nuevoLienzo();
  dibujarFondo(ctx, foto);
  dibujarVeloSuperior(ctx);
  dibujarVeloInferior(ctx, 620);
  dibujarMarca(ctx);

  const titulo = (CATEGORIA_LABELS[categoria] ?? categoria.replace(/_/g, " ")).toUpperCase();
  const dato = datoDeCategoria(categoria, propiedad);

  const baseY = SIZE - PAD - (dato ? 56 : 0);

  ctx.font = "800 62px Montserrat, sans-serif";
  ctx.fillStyle = "#ffffff";
  textoEspaciado(ctx, titulo, PAD, baseY, 4);

  ctx.fillStyle = GOLD;
  ctx.fillRect(PAD, baseY - 96, 88, 5);

  if (dato) {
    ctx.font = "600 34px Montserrat, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.86)";
    ctx.fillText(dato, PAD, SIZE - PAD);
  }

  return canvas;
}

/** Última lámina: amenidades y cómo contactar al asesor. */
function laminaCierre(propiedad: Propiedad, foto: HTMLImageElement | null): HTMLCanvasElement {
  const { canvas, ctx } = nuevoLienzo();
  dibujarFondo(ctx, foto);

  // Velo casi opaco: aquí manda el texto, la foto solo da textura.
  ctx.fillStyle = "rgba(9,16,32,0.9)";
  ctx.fillRect(0, 0, SIZE, SIZE);

  dibujarMarca(ctx);

  let y = 250;
  const amenidades = amenidadesLabels(propiedad.amenidades).slice(0, 10);

  const etiqueta = (texto: string) => {
    ctx.font = "700 22px Montserrat, sans-serif";
    ctx.fillStyle = GOLD;
    textoEspaciado(ctx, texto.toUpperCase(), PAD, y, 4);
    ctx.fillStyle = GOLD;
    ctx.fillRect(PAD, y + 22, 88, 4);
    y += 74;
  };

  if (amenidades.length > 0) {
    etiqueta("Amenidades");

    const colW = (SIZE - PAD * 2) / 2;
    const filas = Math.ceil(amenidades.length / 2);
    ctx.font = "600 34px Montserrat, sans-serif";
    amenidades.forEach((a, i) => {
      const col = Math.floor(i / filas);
      const fila = i % filas;
      const x = PAD + col * colW;
      const filaY = y + fila * 56;
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(x + 8, filaY - 10, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "600 34px Montserrat, sans-serif";
      ctx.fillText(a, x + 32, filaY);
    });
    y += filas * 56 + 40;
  } else {
    // Sin amenidades capturadas, el cierre muestra los datos clave.
    etiqueta("La propiedad");
    const chipH = 84;
    let x = PAD;
    datosClave(propiedad).forEach(({ icono, valor }) => {
      x += dibujarChip(ctx, x, y - 56, chipH, icono, valor) + 18;
    });
    y += 84;
  }

  // Separador
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(PAD, y, SIZE - PAD * 2, 2);
  y += 76;

  etiqueta("Agenda tu visita");

  ctx.font = "800 54px Montserrat, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(propiedad.asesor_asignado || "LUCE Real Estate", PAD, y);
  y += 60;

  const contacto = [propiedad.asesor_telefono, propiedad.asesor_email]
    .map((c) => (c || "").trim())
    .filter(Boolean);
  ctx.font = "600 36px Montserrat, sans-serif";
  ctx.fillStyle = GOLD_CLARO;
  if (contacto.length > 0) {
    contacto.forEach((linea) => {
      ctx.fillText(linea, PAD, y);
      y += 50;
    });
  } else {
    ctx.fillText("Mándanos un mensaje directo", PAD, y);
    y += 50;
  }

  // Precio abajo, como recordatorio de cierre.
  ctx.font = "800 76px Montserrat, sans-serif";
  ctx.fillStyle = "#ffffff";
  const precioTexto = `$${numero(propiedad.precio)}`;
  const precioW = ctx.measureText(precioTexto).width;
  ctx.fillText(precioTexto, PAD, SIZE - PAD);
  ctx.font = "700 30px Montserrat, sans-serif";
  ctx.fillStyle = GOLD;
  ctx.fillText("MXN", PAD + precioW + 16, SIZE - PAD);

  return canvas;
}

/* ── API ─────────────────────────────────────────────────────────────────── */

export interface Lamina {
  nombre: string;
  blob: Blob;
}

/** Genera todas las láminas del carrusel, en el orden en que hay que subirlas. */
export async function crearCarruselInstagram(propiedad: Propiedad): Promise<Lamina[]> {
  await esperarFuentes();

  const galeria = propiedad.galeria ?? [];
  const portadaUrl = galeria.find((f) => f.categoria === "portada")?.url ?? null;
  // Se reservan dos lugares: la portada y el cierre.
  const extras = galeria.filter((f) => f.categoria !== "portada").slice(0, MAX_SLIDES - 2);

  const [portada, fotosExtra] = await Promise.all([
    portadaUrl ? cargarFoto(portadaUrl) : Promise.resolve(null),
    Promise.all(extras.map((f) => cargarFoto(f.url))),
  ]);

  const laminas: { canvas: HTMLCanvasElement; etiqueta: string }[] = [
    { canvas: laminaPortada(propiedad, portada), etiqueta: "portada" },
  ];

  fotosExtra.forEach((foto, i) => {
    // Una foto que no cargó se omite en vez de dejar una lámina vacía.
    if (!foto) return;
    const categoria = extras[i].categoria;
    laminas.push({
      canvas: laminaEspacio(propiedad, foto, categoria),
      etiqueta: slug(categoria).toLowerCase() || "espacio",
    });
  });

  laminas.push({ canvas: laminaCierre(propiedad, portada), etiqueta: "contacto" });

  return Promise.all(
    laminas.map(async ({ canvas, etiqueta }, i) => ({
      nombre: `${String(i + 1).padStart(2, "0")}-${etiqueta}.jpg`,
      blob: await lienzoABlob(canvas),
    })),
  );
}

function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Se libera después del click para no cancelar la descarga en curso.
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Descarga el carrusel en un .zip con las láminas numeradas, para que el
 * agente las suba a Instagram en orden. Siempre hay al menos dos (portada y
 * cierre), así que no existe el caso de una sola imagen suelta.
 */
export async function descargarCarruselInstagram(propiedad: Propiedad): Promise<string> {
  const laminas = await crearCarruselInstagram(propiedad);
  const base = `LUCE-${slug(propiedad.nombre)}`;

  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  laminas.forEach(({ nombre, blob }) => zip.file(nombre, blob));
  const archivo = await zip.generateAsync({ type: "blob" });

  const nombre = `${base}-carrusel.zip`;
  descargarBlob(archivo, nombre);
  return nombre;
}
