import { useEffect } from "react";
import { X, MapPin, BedDouble, Bath, Maximize, CreditCard, User, Calendar, MessageCircle } from "lucide-react";
import { formatPrice } from "@/lib/formatPrice";
import { getTelegramLink } from "@/lib/telegramLink";
import PropertyGallery from "@/components/PropertyGallery";
import type { Propiedad } from "@/types";

interface PropertyDetailModalProps {
  property: Propiedad;
  onClose: () => void;
}

const PropertyDetailModal = ({ property, onClose }: PropertyDetailModalProps) => {
  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-card rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto overscroll-contain touch-pan-y"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-card/80 backdrop-blur rounded-full p-1.5 hover:bg-card transition-colors"
          aria-label="Cerrar"
        >
          <X size={20} className="text-foreground" />
        </button>

        {/* Gallery / Image */}
        <PropertyGallery
          galeria={property.galeria || []}
        />

        {/* Content */}
        <div className="p-6 md:p-8">
          {/* Badge + Title */}
          <div className="flex items-start gap-3 mb-4">
            <span className="inline-block bg-gold/20 text-gold text-xs font-semibold px-2.5 py-1 rounded capitalize">
              {property.tipo}
            </span>
            {property.tipo_oferta && (
              <span className="inline-block bg-gold/20 text-gold text-xs font-semibold px-2.5 py-1 rounded">
                {property.tipo_oferta}
              </span>
            )}
            {property.acepta_credito && (
              <span className="inline-block bg-cobalt/10 text-cobalt text-xs font-semibold px-2.5 py-1 rounded">
                Acepta crédito
              </span>
            )}
          </div>

          <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-2 capitalize">
            {property.nombre}
          </h2>

          {/* Location */}
          <div className="flex items-center gap-1.5 text-gold mb-4">
            <MapPin size={16} />
            <span className="text-sm font-medium">{property.zona}</span>
            {property.direccion && (
              <span className="text-sm text-muted-foreground ml-1">— {property.direccion}</span>
            )}
          </div>

          {/* Price */}
          <p className="font-heading text-2xl font-bold text-cobalt mb-6">
            {formatPrice(property.precio)}
          </p>

          {/* Stats row */}
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground mb-6 pb-6 border-b border-border">
            {property.recamaras > 0 && (
              <span className="flex items-center gap-1.5">
                <BedDouble size={16} className="text-gold" />
                {property.recamaras} Recámaras
              </span>
            )}
            {property.banos > 0 && (
              <span className="flex items-center gap-1.5">
                <Bath size={16} className="text-gold" />
                {property.banos} Baños
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Maximize size={16} className="text-gold" />
              {property.metros_cuadrados} m²
            </span>
          </div>

          {/* Description */}
          {property.descripcion && (
            <div className="mb-6">
              <h3 className="font-heading text-sm font-semibold text-foreground mb-2">
                Descripción
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed capitalize">
                {property.descripcion}
              </p>
            </div>
          )}

          {/* Extra info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-6">
            {property.tipos_credito && (
              <div className="flex items-start gap-2">
                <CreditCard size={16} className="text-gold mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Tipos de crédito</p>
                  <p className="text-muted-foreground capitalize">{property.tipos_credito}</p>
                </div>
              </div>
            )}
            {property.asesor_asignado && (
              <div className="flex items-start gap-2">
                <User size={16} className="text-gold mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Asesor</p>
                  <p className="text-muted-foreground capitalize">{property.asesor_asignado}</p>
                </div>
              </div>
            )}
            {property.fecha_publicacion && (
              <div className="flex items-start gap-2">
                <Calendar size={16} className="text-gold mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Publicado</p>
                  <p className="text-muted-foreground">
                    {new Date(property.fecha_publicacion).toLocaleDateString("es-MX", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="flex gap-3">
            <a
              href="https://cal.com/alek-nava-i4gvq6/visita-propiedad-programada?overlayCalendar=true"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center bg-cobalt text-primary-foreground font-semibold text-sm px-7 py-3.5 rounded hover:bg-cobalt-light transition-colors"
            >
              Agendar Visita
            </a>
            <a
              href={getTelegramLink(property)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#0088cc] text-white font-semibold text-sm px-5 py-3.5 rounded hover:bg-[#006da3] transition-colors"
            >
              <MessageCircle size={18} />
              Mensaje
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetailModal;
