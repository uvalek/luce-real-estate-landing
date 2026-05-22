import { useEffect } from "react";
import {
  X,
  MapPin,
  BedDouble,
  Bath,
  Maximize,
  CreditCard,
  User,
  Calendar,
  Send,
  ArrowUpRight,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
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
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const formattedPrice = formatPrice(property.precio);
  // Split the price for editorial typography: "$" prefix, the number, and the currency suffix.
  const priceMatch = formattedPrice.match(/^(\$)\s*([\d.,]+)\s*([A-Za-z]+)?$/);
  const pricePrefix = priceMatch?.[1] ?? "$";
  const priceNumber = priceMatch?.[2] ?? formattedPrice;
  const priceCurrency = priceMatch?.[3] ?? "MXN";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-cobalt/70 backdrop-blur-md p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-card rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(15,23,42,0.55)] max-w-3xl w-full max-h-[92vh] overflow-x-hidden overflow-y-auto overscroll-contain touch-pan-y"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Soft gold glow — top-right corner (kept fully inside to avoid horizontal overflow on mobile) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 right-0 h-48 w-48 rounded-full bg-gold/15 blur-3xl"
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-white transition-all duration-300 hover:bg-gold hover:border-gold hover:text-cobalt focus:outline-none focus:ring-2 focus:ring-gold/60"
          aria-label="Cerrar"
        >
          <X size={18} strokeWidth={2.4} />
        </button>

        {/* Gallery */}
        <PropertyGallery
          galeria={property.galeria || []}
          tipo={property.tipo}
          tipoOferta={property.tipo_oferta}
        />

        {/* Content */}
        <div className="relative px-6 md:px-10 pt-2 pb-10">
          {/* Eyebrow */}
          <p className="text-sm font-bold tracking-[0.14em] text-gold uppercase mb-3">
            <span>{property.tipo}</span>
            <span className="mx-2 text-foreground/30">·</span>
            {[property.municipio, property.estado].filter(Boolean).join(", ") || property.zona}
          </p>

          {/* Title */}
          <h2 className="font-heading text-[28px] sm:text-3xl md:text-4xl font-extrabold text-cobalt leading-[1.05] tracking-tight capitalize mb-3">
            {property.nombre}
          </h2>

          {/* Address — italic editorial subtitle */}
          {property.direccion && (
            <p className="font-heading text-base md:text-lg text-foreground/55 mb-7 max-w-xl">
              {property.direccion}
            </p>
          )}

          {/* Price + credit chip */}
          <div className="flex flex-wrap items-end justify-between gap-4 pb-7 mb-7 border-b border-border">
            <div>
              <p className="text-sm font-bold tracking-[0.14em] text-foreground/55 uppercase mb-1.5">
                {property.tipo_oferta === "renta" ? "Precio mensual" : "Precio"}
              </p>
              <p className="font-heading leading-none tracking-tight tabular-nums">
                <span className="text-gold text-2xl md:text-3xl font-extrabold align-top mr-1">
                  {pricePrefix}
                </span>
                <span className="text-cobalt text-4xl md:text-5xl font-extrabold">
                  {priceNumber}
                </span>
                <span className="ml-2 text-foreground/40 text-sm font-semibold tracking-[0.18em] uppercase align-middle">
                  {priceCurrency}
                </span>
              </p>
            </div>
            {property.acepta_credito && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/30">
                <CheckCircle2 size={15} className="text-gold" />
                <span className="text-xs font-bold tracking-wider uppercase text-cobalt">
                  Acepta crédito
                </span>
              </div>
            )}
          </div>

          {/* Stats — three tiles */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
            {[
              {
                icon: BedDouble,
                value: property.recamaras,
                label: "Recámaras",
                show: property.recamaras > 0,
              },
              {
                icon: Bath,
                value: property.banos,
                label: property.banos === 1 ? "Baño" : "Baños",
                show: property.banos > 0,
              },
              {
                icon: Maximize,
                value: property.metros_cuadrados,
                label: "m²",
                show: true,
              },
            ]
              .filter((s) => s.show)
              .map(({ icon: Icon, value, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center justify-center text-center px-3 py-4"
                >
                  <Icon
                    size={28}
                    strokeWidth={1.8}
                    className="text-gold mb-4"
                  />
                  <p className="font-heading text-2xl md:text-3xl font-extrabold text-cobalt tabular-nums leading-none">
                    {value}
                  </p>
                  <p className="mt-3 text-sm font-semibold tracking-wide uppercase text-foreground/55">
                    {label}
                  </p>
                </div>
              ))}
          </div>

          {/* Description */}
          {property.descripcion && (
            <div className="relative mb-8 pl-5 border-l-2 border-gold">
              <p className="text-sm font-bold tracking-normal text-gold mb-2.5">
                Descripción
              </p>
              <p className="text-[15px] text-foreground/75 leading-relaxed">
                {property.descripcion}
              </p>
            </div>
          )}

          {/* Info grid — bare, no backgrounds */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6 mb-8">
            <InfoTile icon={MapPin} label="Estado" value={property.estado || "—"} />
            <InfoTile icon={MapPin} label="Municipio" value={property.municipio || property.zona || "—"} />
            {property.tipos_credito && (
              <InfoTile
                icon={CreditCard}
                label="Tipos de crédito"
                value={property.tipos_credito}
              />
            )}
            {property.asesor_asignado && (
              <InfoTile
                icon={User}
                label="Asesor"
                value={property.asesor_asignado}
              />
            )}
            {property.fecha_publicacion && (
              <InfoTile
                icon={Calendar}
                label="Publicado"
                value={new Date(property.fecha_publicacion).toLocaleDateString(
                  "es-MX",
                  { year: "numeric", month: "long", day: "numeric" },
                )}
              />
            )}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="https://cal.com/alek-nava-i4gvq6/visita-propiedad-programada?overlayCalendar=true"
              target="_blank"
              rel="noopener noreferrer"
              className="group/cta relative flex-1 inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-cobalt px-6 py-3.5 text-xs font-bold tracking-[0.2em] uppercase text-primary-foreground shadow-[0_14px_28px_-12px_rgba(15,23,42,0.6)] transition-all duration-300 hover:shadow-[0_20px_40px_-12px_rgba(28,55,140,0.65)] active:scale-[0.98]"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gold/35 to-transparent transition-transform duration-700 group-hover/cta:translate-x-full"
              />
              <span className="relative">Agendar visita</span>
              <ArrowUpRight
                size={14}
                strokeWidth={2.6}
                className="relative text-gold transition-transform duration-300 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5"
              />
            </a>
            <a
              href={getTelegramLink(property)}
              target="_blank"
              rel="noopener noreferrer"
              className="group/msg inline-flex items-center justify-center gap-2 rounded-full border border-cobalt/20 bg-cobalt/[0.03] px-6 py-3.5 text-xs font-bold tracking-[0.2em] uppercase text-cobalt transition-all duration-300 hover:bg-cobalt hover:text-primary-foreground hover:border-cobalt hover:shadow-[0_14px_28px_-12px_rgba(15,23,42,0.5),0_0_0_3px_rgba(184,134,11,0.18)]"
            >
              <Send
                size={14}
                strokeWidth={2.4}
                className="transition-transform duration-300 group-hover/msg:-translate-y-0.5 group-hover/msg:translate-x-0.5 group-hover/msg:rotate-[12deg]"
              />
              Enviar mensaje
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

interface InfoTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

const InfoTile = ({ icon: Icon, label, value }: InfoTileProps) => (
  <div className="flex items-start gap-3 min-w-0">
    <Icon
      size={22}
      strokeWidth={1.8}
      className="text-gold flex-shrink-0 mt-0.5"
    />
    <div className="min-w-0">
      <p className="text-xs font-semibold tracking-wide uppercase text-foreground/55 mb-1">
        {label}
      </p>
      <p className="text-sm font-semibold text-cobalt capitalize leading-snug break-words">
        {value}
      </p>
    </div>
  </div>
);

export default PropertyDetailModal;
