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
      className="group bg-card rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow cursor-pointer"
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
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="bg-cobalt/90 text-white text-xs font-semibold px-2.5 py-1 rounded capitalize">
            {tipo}
          </span>
          {tipo_oferta && (
            <span className="bg-gold/90 text-white text-xs font-semibold px-2.5 py-1 rounded">
              {tipo_oferta}
            </span>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="bg-gold text-accent-foreground text-xs font-semibold px-4 py-2 rounded hover:bg-gold-light transition-colors">
              Ver Detalles
            </button>
            <a
              href={getTelegramLink(property)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 bg-[#0088cc] text-white text-xs font-semibold px-3 py-2.5 rounded hover:bg-[#006da3] transition-colors"
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
