import type { jsPDF as JsPdfDoc } from "jspdf";
import { formatPrice } from "@/lib/formatPrice";
import { amenidadesLabels } from "@/data/amenidades";
import type { Propiedad } from "@/types";

/**
 * Ficha PDF de una propiedad, lista para mandar a un cliente.
 *
 * Se maqueta a mano con jsPDF en vez de capturar la pantalla con html2canvas:
 * así el texto queda vectorial (nítido al imprimir y se puede seleccionar) y
 * el PDF pesa una fracción. jsPDF se carga con `import()` dinámico para que no
 * entre al bundle principal — solo se descarga cuando el agente pide el PDF.
 *
 * Las fotos viven en el bucket público `fotospropiedades` de Supabase, cuyo
 * dominio ya está permitido en el `connect-src` de la CSP.
 */

/* ── Paleta de marca (equivalente RGB de las variables HSL de index.css) ──── */
const COBALT: [number, number, number] = [15, 31, 61];
const COBALT_LIGHT: [number, number, number] = [28, 47, 84];
const GOLD: [number, number, number] = [210, 150, 45];
const INK: [number, number, number] = [30, 36, 48];
const MUTED: [number, number, number] = [120, 128, 142];
const SURFACE: [number, number, number] = [244, 246, 249];
const BORDER: [number, number, number] = [223, 227, 234];
const WHITE: [number, number, number] = [255, 255, 255];

/* ── Geometría de la hoja (A4 en mm) ─────────────────────────────────────── */
const PAGE_W = 210;
const PAGE_H = 297;
const M = 14;
const CW = PAGE_W - M * 2;
const FOOTER_H = 24;
const CONTENT_BOTTOM = PAGE_H - FOOTER_H - 6;

const MAX_EXTRAS = 4;
const PORTADA_H = 62;

const TIPO_LABELS: Record<string, string> = {
  casa: "Casa",
  departamento: "Departamento",
  penthouse: "Penthouse",
  local: "Local comercial",
  terreno: "Terreno",
};

/* ── Imágenes ────────────────────────────────────────────────────────────── */

/**
 * Descarga una imagen y la recorta al ancho/alto pedido con estrategia
 * "cover" (llena el marco sin deformar). Devuelve un JPEG en data URL.
 *
 * Se hace `fetch` → blob → data URL antes de tocar el canvas: así el canvas
 * nunca queda "tainted" y `toDataURL` no falla por CORS.
 */
async function imagenRecortada(
  url: string,
  boxW: number,
  boxH: number,
): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
      reader.readAsDataURL(blob);
    });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Imagen inválida"));
      el.src = dataUrl;
    });

    // ~150 dpi: suficiente para imprimir sin inflar el archivo.
    const scale = 6;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(boxW * scale);
    canvas.height = Math.round(boxH * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cover: se escala por el lado que falte y se centra el recorte.
    const ratio = Math.max(canvas.width / img.width, canvas.height / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);

    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    // Una foto que no carga no debe tumbar el PDF completo.
    return null;
  }
}

/* ── Utilidades ──────────────────────────────────────────────────────────── */

const slug = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "propiedad";

const compacto = (n: number): string => {
  if (n >= 1_000_000) {
    const millones = n / 1_000_000;
    return `$${Number.isInteger(millones) ? millones : millones.toFixed(1)} M`;
  }
  return `$${n.toLocaleString("es-MX")}`;
};

/* ── Generación ──────────────────────────────────────────────────────────── */

export interface PdfOptions {
  /** Descripción profesional generada por la IA. */
  descripcion: string;
}

/**
 * Arma la ficha PDF. Devuelve el documento y el nombre de archivo sugerido,
 * sin descargar nada — así se puede previsualizar o probar sin tocar el disco.
 */
async function construirFicha(
  propiedad: Propiedad,
  { descripcion }: PdfOptions,
): Promise<{ doc: JsPdfDoc; nombre: string }> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });

  const portadaUrl = propiedad.galeria?.find((f) => f.categoria === "portada")?.url ?? null;
  const extrasUrls = (propiedad.galeria ?? [])
    .filter((f) => f.categoria !== "portada")
    .slice(0, MAX_EXTRAS)
    .map((f) => f.url);

  // Las imágenes se preparan en paralelo antes de dibujar. Las extras reparten
  // el ancho entre las que hay (2 fotos = mitad cada una, no cuartos huérfanos).
  const gapExtras = 4;
  const nExtras = Math.max(extrasUrls.length, 1);
  const extraW = (CW - gapExtras * (nExtras - 1)) / nExtras;
  const extraH = nExtras >= 3 ? 21 : 26;

  const [portada, extras] = await Promise.all([
    portadaUrl ? imagenRecortada(portadaUrl, CW, PORTADA_H) : Promise.resolve(null),
    Promise.all(extrasUrls.map((u) => imagenRecortada(u, extraW, extraH))),
  ]);
  const extrasOk = extras.filter((e): e is string => Boolean(e));

  const ubicacion =
    [propiedad.zona, propiedad.municipio, propiedad.estado].filter(Boolean).join(", ") ||
    propiedad.direccion ||
    "Ubicación por confirmar";
  const tipoLabel = TIPO_LABELS[propiedad.tipo] ?? propiedad.tipo;
  const operacion = (propiedad.tipo_oferta || "").trim() || "Disponible";

  /* ── Encabezado de color ───────────────────────────────────────────────── */
  const dibujarEncabezado = (primera: boolean): number => {
    const h = primera ? 46 : 24;
    doc.setFillColor(...COBALT);
    doc.rect(0, 0, PAGE_W, h, "F");
    // Franja dorada inferior: remate de marca.
    doc.setFillColor(...GOLD);
    doc.rect(0, h - 1.6, PAGE_W, 1.6, "F");

    doc.setTextColor(...GOLD);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(primera ? 8 : 7.5);
    doc.text("L U C E   R E A L   E S T A T E", M, primera ? 12 : 10);

    if (!primera) {
      doc.setTextColor(...WHITE);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(propiedad.nombre, M, 17.5);
      return h + 8;
    }

    // Nombre de la propiedad (hasta 2 líneas).
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    const titulo = doc.splitTextToSize(propiedad.nombre, CW - 46).slice(0, 2) as string[];
    doc.text(titulo, M, 24);

    const yUbic = 24 + titulo.length * 7.4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(198, 206, 220);
    doc.text(ubicacion, M, yUbic);

    // Badge de operación, arriba a la derecha.
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    const badge = operacion.toUpperCase();
    const badgeW = doc.getTextWidth(badge) + 9;
    doc.setFillColor(...GOLD);
    doc.roundedRect(PAGE_W - M - badgeW, 9.5, badgeW, 7.4, 1.6, 1.6, "F");
    doc.setTextColor(...COBALT);
    doc.text(badge, PAGE_W - M - badgeW / 2, 14.5, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(198, 206, 220);
    doc.text(tipoLabel, PAGE_W - M, 23.5, { align: "right" });

    return h + 9;
  };

  /* ── Pie con los datos del asesor ──────────────────────────────────────── */
  const dibujarPie = () => {
    const top = PAGE_H - FOOTER_H;
    doc.setFillColor(...COBALT_LIGHT);
    doc.rect(0, top, PAGE_W, FOOTER_H, "F");
    doc.setFillColor(...GOLD);
    doc.rect(0, top, PAGE_W, 1.2, "F");

    doc.setTextColor(...GOLD);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.text("T U   A S E S O R", M, top + 7.5);

    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(propiedad.asesor_asignado || "LUCE Real Estate", M, top + 14.5);

    const contacto = [propiedad.asesor_telefono, propiedad.asesor_email]
      .map((c) => (c || "").trim())
      .filter(Boolean);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(206, 213, 226);
    doc.text(
      contacto.length > 0 ? contacto.join("   ·   ") : "Contáctanos para más información",
      M,
      top + 20,
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...GOLD);
    doc.text(formatPrice(propiedad.precio), PAGE_W - M, top + 14.5, { align: "right" });
  };

  let y = dibujarEncabezado(true);

  /** Salta de página cuando la siguiente sección no cabe. */
  const espacio = (alto: number) => {
    if (y + alto <= CONTENT_BOTTOM) return;
    dibujarPie();
    doc.addPage();
    y = dibujarEncabezado(false);
  };

  const tituloSeccion = (texto: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(texto.toUpperCase(), M, y);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.7);
    doc.line(M, y + 1.8, M + 12, y + 1.8);
    y += 7;
  };

  /* ── Foto de portada ───────────────────────────────────────────────────── */
  if (portada) {
    espacio(PORTADA_H);
    doc.addImage(portada, "JPEG", M, y, CW, PORTADA_H);
    y += PORTADA_H + 3;
  }

  /* ── Fotos extras ──────────────────────────────────────────────────────── */
  if (extrasOk.length > 0) {
    espacio(extraH);
    extrasOk.forEach((img, i) => {
      doc.addImage(img, "JPEG", M + i * (extraW + gapExtras), y, extraW, extraH);
    });
    y += extraH + 8;
  } else if (portada) {
    y += 5;
  }

  /* ── Datos clave ───────────────────────────────────────────────────────── */
  const datos: { label: string; valor: string }[] = [
    { label: "Precio", valor: compacto(propiedad.precio) },
  ];
  if (propiedad.recamaras > 0) datos.push({ label: "Recámaras", valor: String(propiedad.recamaras) });
  if (propiedad.banos > 0) datos.push({ label: "Baños", valor: String(propiedad.banos) });
  if (propiedad.metros_cuadrados > 0)
    datos.push({ label: "Construidos", valor: `${propiedad.metros_cuadrados} m²` });
  if (propiedad.metros_terreno > 0)
    datos.push({ label: "Terreno", valor: `${propiedad.metros_terreno} m²` });
  if (propiedad.estacionamientos > 0)
    datos.push({ label: "Autos", valor: String(propiedad.estacionamientos) });

  {
    const boxH = 19;
    espacio(boxH + 8);
    tituloSeccion("Datos clave");

    const gap = 3.5;
    // El precio ocupa una caja y media para que resalte.
    const unidades = datos.length + 0.5;
    const base = (CW - gap * (datos.length - 1)) / unidades;
    let x = M;
    datos.forEach((d, i) => {
      const w = i === 0 ? base * 1.5 : base;
      doc.setFillColor(...(i === 0 ? COBALT : SURFACE));
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, w, boxH, 2.2, 2.2, i === 0 ? "F" : "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...(i === 0 ? GOLD : MUTED));
      doc.text(d.label.toUpperCase(), x + w / 2, y + 6.5, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(i === 0 ? 13 : 12);
      doc.setTextColor(...(i === 0 ? WHITE : COBALT));
      doc.text(d.valor, x + w / 2, y + 14.5, { align: "center" });

      x += w + gap;
    });
    y += boxH + 8;
  }

  /* ── Amenidades ────────────────────────────────────────────────────────── */
  // Van antes de la descripción: son un bloque corto y acotado, así la página 1
  // siempre queda completa y solo la prosa (de largo variable) puede continuar.
  const amenidades = amenidadesLabels(propiedad.amenidades);
  if (amenidades.length > 0) {
    espacio(18);
    tituloSeccion("Amenidades");

    const pillH = 7.4;
    const padX = 4.5;
    const gap = 3;
    let x = M;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);

    amenidades.forEach((a) => {
      const w = doc.getTextWidth(a) + padX * 2;
      if (x + w > M + CW) {
        x = M;
        y += pillH + gap;
        espacio(pillH);
      }
      doc.setFillColor(...SURFACE);
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, w, pillH, 3.7, 3.7, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.2);
      doc.setTextColor(...COBALT);
      doc.text(a, x + w / 2, y + 5, { align: "center" });
      x += w + gap;
    });
    y += pillH + 7;
  }

  /* ── Descripción profesional ───────────────────────────────────────────── */
  if (descripcion.trim()) {
    const texto = descripcion.trim();

    // El cuerpo se ajusta al espacio que queda en la hoja: si el texto es
    // largo baja de 9.8 a 8.4 pt antes de mandar líneas a una segunda página,
    // para que la ficha típica quepa en una sola.
    const disponible = CONTENT_BOTTOM - (y + 7);
    let size = 9.8;
    let lineas: string[] = [];
    for (const candidato of [9.8, 9.4, 9, 8.7, 8.4]) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(candidato);
      lineas = doc.splitTextToSize(texto, CW) as string[];
      size = candidato;
      if (lineas.length * (candidato * 0.5) <= disponible) break;
    }
    const lh = size * 0.5;

    espacio(8 + lh * Math.min(lineas.length, 6));
    tituloSeccion("Sobre esta propiedad");

    lineas.forEach((linea) => {
      espacio(lh);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(size);
      doc.setTextColor(...INK);
      doc.text(linea, M, y);
      y += lh;
    });
    y += 6;
  }

  dibujarPie();

  return { doc, nombre: `LUCE-${slug(propiedad.nombre)}.pdf` };
}

/** Ficha PDF como blob — útil para previsualizar o adjuntar. */
export async function crearFichaPdf(
  propiedad: Propiedad,
  options: PdfOptions,
): Promise<{ blob: Blob; nombre: string }> {
  const { doc, nombre } = await construirFicha(propiedad, options);
  return { blob: doc.output("blob"), nombre };
}

/**
 * Arma y descarga la ficha PDF de la propiedad.
 * Devuelve el nombre del archivo generado.
 */
export async function descargarFichaPdf(
  propiedad: Propiedad,
  options: PdfOptions,
): Promise<string> {
  const { doc, nombre } = await construirFicha(propiedad, options);
  doc.save(nombre);
  return nombre;
}
