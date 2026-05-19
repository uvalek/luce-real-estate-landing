import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { useProperties } from "@/hooks/useProperties";
import PropertyCard from "@/components/PropertyCard";
import type { Propiedad } from "@/types";

const PropertyDetailModal = lazy(() => import("@/components/PropertyDetailModal"));

const FEATURED_COUNT = 3;

const PropertyGrid = () => {
  const { properties, loading, error } = useProperties();
  const [selectedProperty, setSelectedProperty] = useState<Propiedad | null>(null);

  const displayedProperties = properties.slice(0, FEATURED_COUNT);

  if (error) {
    return (
      <section id="properties" className="py-16 md:py-24 scroll-mt-20">
        <div className="container mx-auto px-4 lg:px-8 text-center">
          <p className="text-sm text-destructive">Error al cargar propiedades: {error}</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section id="properties" className="py-16 md:py-24 scroll-mt-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold tracking-widest text-gold uppercase mb-2">
                — Destacadas
              </p>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
                Nuestras Propiedades Destacadas
              </h2>
            </div>
            <Link
              to="/resultados"
              className="group/cta relative hidden sm:inline-flex items-center gap-2 overflow-hidden rounded-full bg-cobalt px-5 h-11 text-[11px] font-bold tracking-[0.18em] uppercase text-primary-foreground shadow-[0_10px_24px_-10px_rgba(15,23,42,0.5)] transition-all duration-300 hover:shadow-[0_14px_28px_-10px_rgba(28,55,140,0.55)] active:scale-[0.97]"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gold/35 to-transparent transition-transform duration-700 group-hover/cta:translate-x-full"
              />
              <span className="relative">Explorar todas</span>
              <ArrowUpRight
                size={13}
                strokeWidth={2.6}
                className="relative text-gold transition-transform duration-300 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5"
              />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 size={32} className="animate-spin text-cobalt" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onClick={() => setSelectedProperty(property)}
                />
              ))}
            </div>
          )}

          {/* Mobile CTA */}
          <div className="flex justify-center mt-10 sm:hidden">
            <Link
              to="/resultados"
              className="group/cta relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-cobalt px-6 h-12 text-[11px] font-bold tracking-[0.18em] uppercase text-primary-foreground shadow-[0_10px_24px_-10px_rgba(15,23,42,0.5)] transition-all duration-300 hover:shadow-[0_14px_28px_-10px_rgba(28,55,140,0.55)] active:scale-[0.97]"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gold/35 to-transparent transition-transform duration-700 group-hover/cta:translate-x-full"
              />
              <span className="relative">Explorar todas</span>
              <ArrowUpRight
                size={13}
                strokeWidth={2.6}
                className="relative text-gold transition-transform duration-300 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5"
              />
            </Link>
          </div>
        </div>
      </section>

      {/* Detail Modal */}
      {selectedProperty && (
        <Suspense fallback={null}>
          <PropertyDetailModal
            property={selectedProperty}
            onClose={() => setSelectedProperty(null)}
          />
        </Suspense>
      )}
    </>
  );
};

export default PropertyGrid;
