import { useState } from "react";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { useProperties } from "@/hooks/useProperties";
import PropertyCard from "@/components/PropertyCard";
import PropertyDetailModal from "@/components/PropertyDetailModal";
import type { Propiedad } from "@/types";

const FEATURED_COUNT = 3;

const PropertyGrid = () => {
  const { properties, loading, error } = useProperties();
  const [showAll, setShowAll] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Propiedad | null>(null);

  const displayedProperties = showAll ? properties : properties.slice(0, FEATURED_COUNT);

  if (error) {
    return (
      <section id="properties" className="py-16 md:py-24">
        <div className="container mx-auto px-4 lg:px-8 text-center">
          <p className="text-sm text-destructive">Error al cargar propiedades: {error}</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section id="properties" className="py-16 md:py-24">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-semibold tracking-widest text-gold uppercase mb-2">
                {showAll ? "— Catálogo Completo" : "— Destacadas"}
              </p>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
                {showAll
                  ? `Todas las Propiedades (${properties.length})`
                  : "Nuestras Propiedades Destacadas"}
              </h2>
            </div>
            <button
              onClick={() => setShowAll(!showAll)}
              className="hidden sm:flex items-center gap-1 text-sm font-medium text-foreground/70 hover:text-cobalt transition-colors"
            >
              {showAll ? (
                <>
                  Ver Menos <ArrowLeft size={16} />
                </>
              ) : (
                <>
                  Explorar Todas <ArrowRight size={16} />
                </>
              )}
            </button>
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

          {/* Mobile toggle */}
          <div className="flex justify-center mt-8 sm:hidden">
            <button
              onClick={() => setShowAll(!showAll)}
              className="flex items-center gap-1 text-sm font-medium text-foreground/70 hover:text-cobalt transition-colors"
            >
              {showAll ? (
                <>
                  Ver Menos <ArrowLeft size={16} />
                </>
              ) : (
                <>
                  Explorar Todas <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Detail Modal */}
      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </>
  );
};

export default PropertyGrid;
