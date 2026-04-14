import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { GaleriaFoto } from "@/types";

interface PropertyGalleryProps {
  galeria: GaleriaFoto[];
}

const PropertyGallery = ({ galeria }: PropertyGalleryProps) => {
  // Portada first, then the rest
  const portadas = galeria.filter((f) => f.categoria === "portada");
  const resto = galeria.filter((f) => f.categoria !== "portada");
  const allImages: GaleriaFoto[] = [...portadas, ...resto];

  const [currentIndex, setCurrentIndex] = useState(0);

  if (allImages.length === 0) {
    return (
      <div className="w-full h-64 sm:h-80 bg-muted flex items-center justify-center text-muted-foreground text-sm rounded-t-lg">
        Sin imágenes
      </div>
    );
  }

  const current = allImages[currentIndex];

  const prev = () => setCurrentIndex((i) => (i === 0 ? allImages.length - 1 : i - 1));
  const next = () => setCurrentIndex((i) => (i === allImages.length - 1 ? 0 : i + 1));

  return (
    <div>
      {/* Main image with arrows */}
      <div className="relative">
        <img
          src={current.url}
          alt={current.categoria}
          className="w-full h-64 sm:h-80 object-cover rounded-t-lg"
        />

        {/* Category badge */}
        <span className="absolute top-3 left-3 bg-black/60 text-white text-xs font-semibold px-2.5 py-1 rounded capitalize">
          {current.categoria}
        </span>

        {/* Counter */}
        <span className="absolute top-3 right-3 bg-black/60 text-white text-xs font-semibold px-2.5 py-1 rounded">
          {currentIndex + 1} / {allImages.length}
        </span>

        {/* Arrows */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2.5 transition-colors"
              aria-label="Anterior"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2.5 transition-colors"
              aria-label="Siguiente"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {allImages.length > 1 && (
        <div className="flex gap-1.5 p-3 overflow-x-auto bg-card">
          {allImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`flex-shrink-0 w-14 h-14 rounded overflow-hidden border-2 transition-colors ${
                i === currentIndex ? "border-gold" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img
                src={img.url}
                alt={img.categoria}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PropertyGallery;
