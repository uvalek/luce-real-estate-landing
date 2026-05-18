import { MapPin, BedDouble, Bath, Maximize, MessageCircle } from "lucide-react";
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
          className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-none"
        />
        {/* Tipo — top left */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_10px_rgba(212,160,23,0.9)]" />
          <span className="font-heading text-[11px] font-bold tracking-[0.22em] uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
            {tipo}
          </span>
        </div>
        {/* Oferta — top right */}
        {tipo_oferta && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5">
            <span className="font-heading text-[11px] font-extrabold tracking-[0.3em] uppercase text-gold drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
              {tipo_oferta}
            </span>
            <span className="h-px w-5 bg-gold/80" />
          </div>
        )}
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="bg-gold text-accent-foreground text-xs font-semibold px-4 py-2 rounded-full hover:bg-gold-light transition-colors">
              Ver Detalles
            </button>
            <a
              href={getTelegramLink(property)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 bg-[#0088cc] text-white text-xs font-semibold px-3 py-2.5 rounded-full hover:bg-[#006da3] transition-colors"
              title="Enviar mensaje"
            >
              <MessageCircle size={14} />
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
