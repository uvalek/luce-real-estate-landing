import type { Propiedad } from "@/types";

/**
 * Imagen cuadrada de 1080x1080 lista para publicar en Instagram.
 *
 * Se compone en un <canvas> del navegador: la foto de portada al fondo con un
 * degradado oscuro encima para que el texto se lea, el badge de la operación,
 * el precio, la ubicación y los datos principales con iconos.
 *
 * Los iconos se dibujan como vectores (los mismos trazos de lucide que usa el
 * dashboard) en lugar de depender de una fuente de iconos, que en canvas no
 * está garantizada.
 */

const SIZE = 1080;
const PAD = 72;

const GOLD = "#d2962d";
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

function dibujarIcono(
  ctx: CanvasRenderingContext2D,
  paths: readonly string[],
  x: number,
  y: number,
  tam: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(tam / 24, tam / 24);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  paths.forEach((d) => ctx.stroke(new Path2D(d)));
  ctx.restore();
}

/* ── Utilidades ──────────────────────────────────────────────────────────── */

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

/** Texto con espaciado entre letras — canvas no tiene letter-spacing fiable. */
function textoEspaciado(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  espacio: number,
): number {
  let cursor = x;
  for (const ch of texto) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + espacio;
  }
  return cursor - espacio - x;
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

/* ── Composición ─────────────────────────────────────────────────────────── */

export async function crearImagenInstagram(
  propiedad: Propiedad,
): Promise<{ blob: Blob; nombre: string }> {
  await esperarFuentes();

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tu navegador no permite generar la imagen.");

  /* Fondo: foto de portada recortada tipo "cover". */
  const portadaUrl = propiedad.galeria?.find((f) => f.categoria === "portada")?.url ?? null;
  const foto = portadaUrl ? await cargarFoto(portadaUrl) : null;

  if (foto) {
    const ratio = Math.max(SIZE / foto.width, SIZE / foto.height);
    const w = foto.width * ratio;
    const h = foto.height * ratio;
    ctx.drawImage(foto, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
  } else {
    // Sin foto: fondo de marca en vez de un cuadro vacío.
    const fondo = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    fondo.addColorStop(0, "#16294f");
    fondo.addColorStop(1, COBALT);
    ctx.fillStyle = fondo;
    ctx.fillRect(0, 0, SIZE, SIZE);
  }

  /* Degradados: uno arriba para el badge y el logo, otro abajo para el texto. */
  // El de arriba llega con cuerpo hasta y≈200: el logo cae ahí y muchas fotos
  // tienen cielo claro justo en esa esquina.
  const arriba = ctx.createLinearGradient(0, 0, 0, 380);
  arriba.addColorStop(0, "rgba(10,18,36,0.8)");
  arriba.addColorStop(0.45, "rgba(10,18,36,0.42)");
  arriba.addColorStop(1, "rgba(10,18,36,0)");
  ctx.fillStyle = arriba;
  ctx.fillRect(0, 0, SIZE, 380);

  const abajo = ctx.createLinearGradient(0, 380, 0, SIZE);
  abajo.addColorStop(0, "rgba(10,18,36,0)");
  abajo.addColorStop(0.45, "rgba(10,18,36,0.72)");
  abajo.addColorStop(1, "rgba(8,14,28,0.96)");
  ctx.fillStyle = abajo;
  ctx.fillRect(0, 380, SIZE, SIZE - 380);

  ctx.textBaseline = "alphabetic";

  /* ── Badge de operación (arriba a la izquierda) ─────────────────────────── */
  const badge = textoOperacion(propiedad.tipo_oferta).toUpperCase();
  ctx.font = "800 28px Montserrat, sans-serif";
  const badgeTexto = anchoEspaciado(ctx, badge, 3.2);
  const badgeW = badgeTexto + 56;
  const badgeH = 64;
  ctx.fillStyle = GOLD;
  rectRedondeado(ctx, PAD, PAD, badgeW, badgeH, badgeH / 2);
  ctx.fill();
  ctx.fillStyle = COBALT;
  textoEspaciado(ctx, badge, PAD + 28, PAD + 42, 3.2);

  /* ── Marca (arriba a la derecha) ────────────────────────────────────────── */
  ctx.font = "800 34px Montserrat, sans-serif";
  ctx.fillStyle = "#ffffff";
  const marcaW = anchoEspaciado(ctx, "LUCE", 8);
  textoEspaciado(ctx, "LUCE", SIZE - PAD - marcaW, PAD + 36, 8);
  ctx.font = "700 18px Montserrat, sans-serif";
  ctx.fillStyle = "#e5b463";
  const subW = anchoEspaciado(ctx, "REAL ESTATE", 5);
  textoEspaciado(ctx, "REAL ESTATE", SIZE - PAD - subW, PAD + 66, 5);

  /* ── Bloque inferior ────────────────────────────────────────────────────── */
  const datos: { icono: readonly string[]; valor: string }[] = [];
  if (propiedad.recamaras > 0)
    datos.push({ icono: ICONOS.recamaras, valor: `${numero(propiedad.recamaras)} rec` });
  if (propiedad.banos > 0)
    datos.push({ icono: ICONOS.banos, valor: `${numero(propiedad.banos)} baños` });
  if (propiedad.metros_cuadrados > 0)
    datos.push({ icono: ICONOS.metros, valor: `${numero(propiedad.metros_cuadrados)} m²` });

  const chipH = 84;
  const baseY = SIZE - PAD - (datos.length > 0 ? chipH : 0);

  /* Precio */
  ctx.font = "800 104px Montserrat, sans-serif";
  ctx.fillStyle = "#ffffff";
  const precioTexto = `$${numero(propiedad.precio)}`;
  const precioY = baseY - (datos.length > 0 ? 46 : 8);
  ctx.fillText(precioTexto, PAD, precioY);
  const precioW = ctx.measureText(precioTexto).width;
  ctx.font = "700 36px Montserrat, sans-serif";
  ctx.fillStyle = GOLD;
  ctx.fillText("MXN", PAD + precioW + 18, precioY);

  /* Ubicación */
  const ubicacion =
    [propiedad.municipio, propiedad.estado].filter(Boolean).join(", ") ||
    propiedad.zona ||
    propiedad.direccion ||
    "";
  if (ubicacion) {
    ctx.font = "600 30px Montserrat, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    textoEspaciado(ctx, ubicacion.toUpperCase(), PAD, precioY - 138, 3);
  }

  /* Línea dorada de remate — separada del precio, que sube ~75 px sobre su base. */
  ctx.fillStyle = GOLD;
  ctx.fillRect(PAD, precioY - 114, 88, 5);

  /* Chips con iconos */
  if (datos.length > 0) {
    let x = PAD;
    const y = SIZE - PAD - chipH;
    ctx.font = "700 34px Montserrat, sans-serif";

    datos.forEach(({ icono, valor }) => {
      const textoW = ctx.measureText(valor).width;
      const w = 44 + 44 + 18 + textoW;

      ctx.fillStyle = "rgba(255,255,255,0.13)";
      rectRedondeado(ctx, x, y, w, chipH, 22);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 2;
      rectRedondeado(ctx, x, y, w, chipH, 22);
      ctx.stroke();

      dibujarIcono(ctx, icono, x + 22, y + (chipH - 44) / 2, 44);

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 34px Montserrat, sans-serif";
      ctx.fillText(valor, x + 22 + 44 + 18, y + chipH / 2 + 12);

      x += w + 18;
    });
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("No se pudo crear la imagen."))),
      "image/png",
    );
  });

  return { blob, nombre: `LUCE-${slug(propiedad.nombre)}-instagram.png` };
}

/** Genera la imagen y la descarga. Devuelve el nombre del archivo. */
export async function descargarImagenInstagram(propiedad: Propiedad): Promise<string> {
  const { blob, nombre } = await crearImagenInstagram(propiedad);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Se libera después del click para no cancelar la descarga en curso.
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return nombre;
}
