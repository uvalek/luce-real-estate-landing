import { MapPin, BedDouble, Bath, Maximize, ArrowUpRight, Send } from "lucide-react";
import { formatPrice } from "@/lib/formatPrice";
import { getTelegramLink } from "@/lib/telegramLink";
import type { Propiedad } from "@/types";

interface PropertyCardProps {
  property: Propiedad;
  onClick: () => void;
}

const PropertyCard = ({ property, onClick }: PropertyCardProps) => {
  const { galeria, nombre, zona, recamaras, banos, metros_cuadrados, precio, tipo, tipo_oferta } = property;
  const portada = galeria?.find((f) => f.categoria === "portada")?.url || galeria?.[0]?.url || null;

  return (
    <div
      className="group bg-card rounded-[2.5rem] overflow-hidden shadow-[0_15px_40px_-15px_rgba(15,23,42,0.2)] hover:shadow-[0_25px_50px_-15px_rgba(28,55,140,0.3)] hover:-translate-y-1 transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      <div className="relative h-56 overflow-hidden">
        {portada ? (
          <img
            src={portada}
            alt={nombre}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-sm">
            Sin imagen
          </div>
        )}
        {/* Top gradient overlay — legibility for the tags */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/75 via-black/40 to-transparent pointer-events-none"
        />
        {/* Tags row — tipo (left) + tipo_oferta (right) share a single
            flex row so they can never collide. Each side gets a max
            width and shrinks (truncates on a single line) when the card
            is narrow, e.g. inside a 3-column grid on desktop. */}
        <div className="absolute top-5 inset-x-5 sm:inset-x-6 flex items-start justify-between gap-3 pointer-events-none">
          <span
            className="font-heading text-[11px] sm:text-[13px] font-bold tracking-[0.14em] uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] truncate max-w-[55%]"
            title={tipo}
          >
            {tipo}
          </span>
          {tipo_oferta && (
            <div className="flex items-center gap-2 min-w-0 max-w-[55%] justify-end">
              <span
                className="font-heading text-[11px] sm:text-[13px] font-extrabold tracking-[0.16em] uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)] truncate text-right"
                title={tipo_oferta}
              >
                {tipo_oferta}
              </span>
              <span className="h-px w-5 bg-white/80 flex-shrink-0 hidden md:block" />
            </div>
          )}
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-heading text-sm font-semibold text-foreground mb-2 capitalize line-clamp-1">
          {nombre}
        </h3>
        <div className="flex items-center gap-1.5 text-gold mb-3">
          <MapPin size={14} />
          <span className="text-sm font-medium">{zona}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          {recamaras > 0 && (
            <span className="flex items-center gap-1">
              <BedDouble size={14} className="text-gold" /> {recamaras} Rec
            </span>
          )}
          {banos > 0 && (
            <span className="flex items-center gap-1">
              <Bath size={14} className="text-gold" /> {banos} Baños
            </span>
          )}
          <span className="flex items-center gap-1">
            <Maximize size={14} className="text-gold" /> {metros_cuadrados} m²
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Ver Detalles — primary CTA */}
            <button
              type="button"
              className="group/cta relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-cobalt px-4 h-9 text-[11px] font-bold tracking-[0.18em] uppercase text-primary-foreground shadow-[0_8px_20px_-10px_rgba(15,23,42,0.55)] transition-all duration-300 hover:shadow-[0_14px_28px_-10px_rgba(28,55,140,0.55)] active:scale-[0.97]"
            >
              {/* gold sweep on hover */}
              <span
                aria-hidden="true"
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gold/35 to-transparent transition-transform duration-700 group-hover/cta:translate-x-full"
              />
              <span className="relative">Ver detalles</span>
              <ArrowUpRight
                size={13}
                strokeWidth={2.6}
                className="relative text-gold transition-transform duration-300 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5"
              />
            </button>

            {/* Mensaje — outlined satellite action */}
            <a
              href={getTelegramLink(property)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Enviar mensaje"
              aria-label="Enviar mensaje por Telegram"
              className="group/msg relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-cobalt/15 bg-cobalt/[0.03] text-cobalt transition-all duration-300 hover:bg-cobalt hover:text-primary-foreground hover:border-cobalt hover:shadow-[0_8px_20px_-10px_rgba(15,23,42,0.45),0_0_0_3px_rgba(184,134,11,0.18)]"
            >
              <Send
                size={14}
                strokeWidth={2.2}
                className="transition-transform duration-300 group-hover/msg:-translate-y-0.5 group-hover/msg:translate-x-0.5 group-hover/msg:rotate-[12deg]"
              />
            </a>
          </div>
          <span className="font-heading text-base font-bold text-foreground">
            {formatPrice(precio)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
