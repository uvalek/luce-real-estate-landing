import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, SearchX } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Propiedad } from "@/types";
import PropertyCard from "@/components/PropertyCard";
import PropertyDetailModal from "@/components/PropertyDetailModal";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Resultados = () => {
  const [searchParams] = useSearchParams();
  const [properties, setProperties] = useState<Propiedad[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Propiedad | null>(null);

  const state = searchParams.get("estado") || "";
  const municipality = searchParams.get("municipio") || "";
  const propertyType = searchParams.get("tipo") || "";
  const budgetMax = searchParams.get("presupuesto") || "";
  const listingType = searchParams.get("oferta") || "";

  useEffect(() => {
    const fetchFiltered = async () => {
      setLoading(true);

      let query = supabase
        .from("propiedades")
        .select("*")
        .eq("disponible", true)
        .order("fecha_publicacion", { ascending: false });

      // Filter by zona (municipality or state-based zones)
      if (municipality) {
        query = query.ilike("zona", `%${municipality}%`);
      } else if (state) {
        // Map state to known zones
        if (state === "tlaxcala") {
          query = query.or(
            "zona.ilike.%Tlaxcala%,zona.ilike.%Apizaco%,zona.ilike.%Huamantla%,zona.ilike.%Chiautempan%,zona.ilike.%Zacatelco%,zona.ilike.%Calpulalpan%,zona.ilike.%Xaloztoc%,zona.ilike.%Tlaxco%"
          );
        } else if (state === "puebla") {
          query = query.or(
            "zona.ilike.%Puebla%,zona.ilike.%Cholula%,zona.ilike.%Atlixco%,zona.ilike.%Tehuacán%,zona.ilike.%Zacatlán%,zona.ilike.%Cuetzalan%,zona.ilike.%Huejotzingo%,zona.ilike.%Amozoc%,zona.ilike.%San Andrés%,zona.ilike.%Angelópolis%,zona.ilike.%Sonterra%,zona.ilike.%La Vista%,zona.ilike.%Lomas%"
          );
        }
      }

      // Filter by property type
      if (propertyType) {
        query = query.eq("tipo", propertyType);
      }

      // Filter by budget (max price)
      if (budgetMax) {
        const numericBudget = Number(budgetMax.replace(/[^0-9]/g, ""));
        if (numericBudget > 0) {
          query = query.lte("precio", numericBudget);
        }
      }

      // Filter by listing type (renta/venta)
      if (listingType === "venta") {
        query = query.or("tipo_oferta.ilike.%VENTA%");
      } else if (listingType === "renta") {
        query = query.or("tipo_oferta.ilike.%RENTA%");
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching filtered properties:", error);
        setProperties([]);
      } else {
        setProperties(data as Propiedad[]);
      }
      setLoading(false);
    };

    fetchFiltered();
  }, [state, municipality, propertyType, budgetMax, listingType]);

  // Build human-readable summary of filters
  const filterSummary = [
    municipality || (state ? (state === "puebla" ? "Puebla" : "Tlaxcala") : ""),
    propertyType ? propertyType.charAt(0).toUpperCase() + propertyType.slice(1) : "",
    budgetMax ? `Hasta $${Number(budgetMax.replace(/[^0-9]/g, "")).toLocaleString("es-MX")}` : "",
    listingType ? (listingType === "venta" ? "Venta" : "Renta") : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Spacer for fixed header */}
      <div className="h-16" />

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Back + title */}
          <div className="mb-8">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-cobalt transition-colors mb-4"
            >
              <ArrowLeft size={16} />
              Volver al inicio
            </Link>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
              Resultados de búsqueda
            </h1>
            {filterSummary && (
              <p className="text-sm text-muted-foreground mt-2">
                Filtros: {filterSummary}
              </p>
            )}
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 size={32} className="animate-spin text-cobalt" />
            </div>
          ) : properties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <SearchX size={48} className="text-muted-foreground mb-4" />
              <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
                No encontramos propiedades
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Intenta ajustar los filtros de búsqueda para encontrar más opciones disponibles.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 bg-cobalt text-primary-foreground font-semibold text-sm px-7 py-3.5 rounded hover:bg-cobalt-light transition-colors"
              >
                <ArrowLeft size={16} />
                Volver al inicio
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-6">
                {properties.length} propiedad{properties.length !== 1 ? "es" : ""} encontrada
                {properties.length !== 1 ? "s" : ""}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onClick={() => setSelectedProperty(property)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />

      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  );
};

export default Resultados;
