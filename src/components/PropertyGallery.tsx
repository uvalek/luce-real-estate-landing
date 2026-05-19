import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { GaleriaFoto } from "@/types";

interface PropertyGalleryProps {
  galeria: GaleriaFoto[];
  tipo?: string;
  tipoOferta?: string;
}

const PropertyGallery = ({ galeria, tipo, tipoOferta }: PropertyGalleryProps) => {
  // Portada first, then the rest
  const portadas = galeria.filter((f) => f.categoria === "portada");
  const resto = galeria.filter((f) => f.categoria !== "portada");
  const allImages: GaleriaFoto[] = [...portadas, ...resto];

  const [currentIndex, setCurrentIndex] = useState(0);

  if (allImages.length === 0) {
    return (
      <div className="w-full h-64 sm:h-96 bg-muted flex items-center justify-center text-muted-foreground text-sm">
        Sin imágenes
      </div>
    );
  }

  const current = allImages[currentIndex];

  const prev = () => setCurrentIndex((i) => (i === 0 ? allImages.length - 1 : i - 1));
  const next = () => setCurrentIndex((i) => (i === allImages.length - 1 ? 0 : i + 1));

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div>
      {/* Main image */}
      <div className="relative">
        <img
          src={current.url}
          alt={current.categoria}
          className="w-full h-72 sm:h-96 md:h-[28rem] object-cover"
        />

        {/* Top gradient for tag legibility */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/75 via-black/40 to-transparent pointer-events-none"
        />
        {/* Bottom gradient for counter legibility */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none"
        />

        {/* Tipo — top left */}
        {tipo && (
          <div className="absolute top-6 left-7">
            <span className="font-heading text-[14px] font-bold tracking-[0.22em] uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
              {tipo}
            </span>
          </div>
        )}
        {/* Oferta — top right */}
        {tipoOferta && (
          <div className="absolute top-6 right-7 flex items-center gap-2">
            <span className="font-heading text-[14px] font-extrabold tracking-[0.3em] uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)]">
              {tipoOferta}
            </span>
            <span className="h-px w-6 bg-white/80" />
          </div>
        )}

        {/* Editorial counter — bottom right */}
        {allImages.length > 1 && (
          <div className="absolute bottom-5 right-7 flex items-baseline gap-2 font-heading tabular-nums">
            <span className="text-2xl font-extrabold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
              {pad(currentIndex + 1)}
            </span>
            <span className="h-px w-5 bg-gold translate-y-[-4px]" />
            <span className="text-sm font-semibold text-gold tracking-[0.18em]">
              {pad(allImages.length)}
            </span>
          </div>
        )}

        {/* Arrows */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={prev}
              className="group absolute left-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/25 text-white transition-all duration-300 hover:bg-gold hover:border-gold hover:text-cobalt focus:outline-none focus:ring-2 focus:ring-gold/60"
              aria-label="Imagen anterior"
            >
              <ChevronLeft size={20} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
            </button>
            <button
              onClick={next}
              className="group absolute right-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/25 text-white transition-all duration-300 hover:bg-gold hover:border-gold hover:text-cobalt focus:outline-none focus:ring-2 focus:ring-gold/60"
              aria-label="Imagen siguiente"
            >
              <ChevronRight size={20} className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {allImages.length > 1 && (
        <div className="flex gap-2.5 px-6 md:px-8 py-4 overflow-x-auto bg-card">
          {allImages.map((img, i) => {
            const active = i === currentIndex;
            return (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`relative flex-shrink-0 w-16 h-16 rounded-2xl overflow-hidden transition-all duration-300 ${
                  active
                    ? "ring-2 ring-gold ring-offset-2 ring-offset-card shadow-[0_8px_20px_-8px_rgba(184,134,11,0.55)]"
                    : "opacity-55 hover:opacity-100 ring-1 ring-border"
                }`}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={active}
              >
                <img
                  src={img.url}
                  alt={img.categoria}
                  className="w-full h-full object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PropertyGallery;
