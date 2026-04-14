import type { Propiedad } from "@/types";
import { formatPrice } from "@/lib/formatPrice";

const TELEGRAM_BOT = "https://t.me/alekagency2bot";

const tipoLabel: Record<string, string> = {
  casa: "la casa",
  departamento: "el departamento",
  terreno: "el terreno",
  local: "el local",
};

/**
 * Generates a Telegram bot link with a personalized pre-filled message
 * based on the property characteristics.
 */
export function getTelegramLink(property: Propiedad): string {
  const tipoTexto = tipoLabel[property.tipo] || property.tipo;
  const precio = formatPrice(property.precio);

  let mensaje = `Hola! Me interesó ${tipoTexto} en ${property.zona}`;

  // Add price
  mensaje += ` de ${precio}`;

  // Add key specs
  const specs: string[] = [];
  if (property.recamaras > 0) specs.push(`${property.recamaras} recámara${property.recamaras > 1 ? "s" : ""}`);
  if (property.banos > 0) specs.push(`${property.banos} baño${property.banos > 1 ? "s" : ""}`);
  if (property.metros_cuadrados > 0) specs.push(`${property.metros_cuadrados} m²`);
  if (specs.length > 0) mensaje += ` (${specs.join(", ")})`;

  // Add offer type
  if (property.tipo_oferta) {
    mensaje += ` — ${property.tipo_oferta.toLowerCase()}`;
  }

  mensaje += ". Quiero más información por favor.";

  // Telegram bot deep link uses ?start= with base64-safe payload
  // For simplicity, encode as URL param text
  return `${TELEGRAM_BOT}?start=${encodeURIComponent(mensaje)}`;
}
