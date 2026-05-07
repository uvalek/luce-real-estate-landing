import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, SearchX, MapPinned, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Propiedad } from "@/types";
import PropertyCard from "@/components/PropertyCard";
import PropertyDetailModal from "@/components/PropertyDetailModal";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type FallbackLevel =
  | "exact"          // matched all filters
  | "same-zone"      // dropped tipo / budget but kept zona
  | "same-state"     // expanded to all of the same state
  | "all"            // showing whatever is available
  | "none";          // truly empty database

const STATE_ZONES: Record<string, string> = {
  tlaxcala:
    "zona.ilike.%Tlaxcala%,zona.ilike.%Apizaco%,zona.ilike.%Huamantla%,zona.ilike.%Chiautempan%,zona.ilike.%Zacatelco%,zona.ilike.%Calpulalpan%,zona.ilike.%Xaloztoc%,zona.ilike.%Tlaxco%,zona.ilike.%Contla%",
  puebla:
    "zona.ilike.%Puebla%,zona.ilike.%Cholula%,zona.ilike.%Atlixco%,zona.ilike.%Tehuacán%,zona.ilike.%Zacatlán%,zona.ilike.%Cuetzalan%,zona.ilike.%Huejotzingo%,zona.ilike.%Amozoc%,zona.ilike.%San Andrés%,zona.ilike.%Angelópolis%,zona.ilike.%Sonterra%,zona.ilike.%La Vista%,zona.ilike.%Lomas%",
};

/**
 * Infer the state from a free-text municipality, when possible.
 * Returns "tlaxcala" | "puebla" | "" if unknown.
 */
const inferStateFromMunicipality = (municipio: string): string => {
  if (!municipio) return "";
  const m = municipio.toLowerCase();
  const tlx = ["tlaxcala", "apizaco", "huamantla", "chiautempan", "zacatelco", "calpulalpan", "xaloztoc", "tlaxco", "contla"];
  const pue = ["puebla", "cholula", "atlixco", "tehuacán", "tehuacan", "zacatlán", "zacatlan", "cuetzalan", "huejotzingo", "amozoc", "san andrés", "san andres", "angelópolis", "angelopolis", "sonterra", "lomas"];
  if (tlx.some((z) => m.includes(z))) return "tlaxcala";
  if (pue.some((z) => m.includes(z))) return "puebla";
  return "";
};

const Resultados = () => {
  const [searchParams] = useSearchParams();
  const [properties, setProperties] = useState<Propiedad[]>([]);
  const [fallbackLevel, setFallbackLevel] = useState<FallbackLevel>("exact");
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Propiedad | null>(null);

  const state = searchParams.get("estado") || "";
  const municipality = searchParams.get("municipio") || "";
  const propertyType = searchParams.get("tipo") || "";
  const budgetMax = searchParams.get("presupuesto") || "";
  const listingType = searchParams.get("oferta") || "";

  const numericBudget = budgetMax ? Number(budgetMax.replace(/[^0-9]/g, "")) : 0;
  const inferredState = state || inferStateFromMunicipality(municipality);

  useEffect(() => {
    const baseQuery = () =>
      supabase
        .from("propiedades")
        .select("*")
        .eq("disponible", true)
        .order("fecha_publicacion", { ascending: false });

    const applyListing = (q: ReturnType<typeof baseQuery>) => {
      if (listingType === "venta") return q.ilike("tipo_oferta", "%VENTA%");
      if (listingType === "renta") return q.ilike("tipo_oferta", "%RENTA%");
      return q;
    };

    /** Step A — exact match: all filters applied */
    const queryExact = async () => {
      let q = baseQuery();
      if (municipality) {
        q = q.ilike("zona", `%${municipality}%`);
      } else if (state && STATE_ZONES[state]) {
        q = q.or(STATE_ZONES[state]);
      }
      if (propertyType) q = q.eq("tipo", propertyType);
      if (numericBudget > 0) q = q.lte("precio", numericBudget);
      q = applyListing(q);
      const { data } = await q;
      return (data as Propiedad[]) || [];
    };

    /** Step B — same zone, drop type + budget */
    const querySameZone = async () => {
      if (!municipality && !state) return [];
      let q = baseQuery();
      if (municipality) {
        q = q.ilike("zona", `%${municipality}%`);
      } else if (state && STATE_ZONES[state]) {
        q = q.or(STATE_ZONES[state]);
      }
      q = applyListing(q);
      const { data } = await q;
      return (data as Propiedad[]) || [];
    };

    /** Step C — same state (expand from municipality) */
    const querySameState = async () => {
      const target = inferredState;
      if (!target || !STATE_ZONES[target]) return [];
      let q = baseQuery().or(STATE_ZONES[target]);
      q = applyListing(q);
      const { data } = await q;
      return (data as Propiedad[]) || [];
    };

    /** Step D — fully open: any disponible (still respects listingType if any) */
    const queryAll = async () => {
      let q = baseQuery();
      q = applyListing(q);
      const { data } = await q;
      return (data as Propiedad[]) || [];
    };

    const run = async () => {
      setLoading(true);

      // Step A
      const exact = await queryExact();
      if (exact.length > 0) {
        setProperties(exact);
        setFallbackLevel("exact");
        setLoading(false);
        return;
      }

      // Step B — only if there were extra filters beyond zone+listing
      const hadExtraFilters = !!propertyType || numericBudget > 0;
      if (hadExtraFilters && (municipality || state)) {
        const sameZone = await querySameZone();
        if (sameZone.length > 0) {
          setProperties(sameZone);
          setFallbackLevel("same-zone");
          setLoading(false);
          return;
        }
      }

      // Step C — expand to whole state
      const sameState = await querySameState();
      if (sameState.length > 0) {
        // Sort: prefer different zone but same state nearer the top of relevance
        setProperties(sameState);
        setFallbackLevel("same-state");
        setLoading(false);
        return;
      }

      // Step D — anything
      const all = await queryAll();
      setProperties(all);
      setFallbackLevel(all.length === 0 ? "none" : "all");
      setLoading(false);
    };

    run();
  }, [state, municipality, propertyType, budgetMax, listingType, numericBudget, inferredState]);

  const filterSummary = [
    municipality || (state ? (state === "puebla" ? "Puebla" : "Tlaxcala") : ""),
    propertyType ? propertyType.charAt(0).toUpperCase() + propertyType.slice(1) : "",
    budgetMax ? `Hasta $${Number(budgetMax.replace(/[^0-9]/g, "")).toLocaleString("es-MX")}` : "",
    listingType ? (listingType === "venta" ? "Venta" : "Renta") : "",
  ]
    .filter(Boolean)
    .join(" · ");

  // Banner copy per fallback level
  const targetZone =
    municipality ||
    (state === "puebla" ? "Puebla" : state === "tlaxcala" ? "Tlaxcala" : "");

  let banner: { title: string; subtitle: string } | null = null;
  if (fallbackLevel === "same-zone") {
    banner = {
      title: `Sin coincidencia exacta en ${targetZone || "tu zona"}`,
      subtitle: `No encontramos propiedades que cumplan todos tus filtros, pero te mostramos otras opciones disponibles en ${targetZone || "esta zona"}.`,
    };
  } else if (fallbackLevel === "same-state") {
    const stateLabel = inferredState === "puebla" ? "Puebla" : inferredState === "tlaxcala" ? "Tlaxcala" : "la zona";
    banner = {
      title: `Te mostramos propiedades cercanas`,
      subtitle: `No hay coincidencias exactas en ${targetZone || stateLabel}. Estas son opciones disponibles en ${stateLabel} que podrían interesarte.`,
    };
  } else if (fallbackLevel === "all") {
    banner = {
      title: `Te mostramos todas las propiedades disponibles`,
      subtitle: `No encontramos resultados con tus filtros, pero aquí tienes todas las propiedades activas en nuestro catálogo.`,
    };
  }

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

          {/* ─── Fallback banner — shown only when not exact match ─── */}
          {!loading && banner && properties.length > 0 && (
            <div className="mb-6 relative overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-amber-50/70 to-white px-5 py-4 shadow-[0_8px_30px_-15px_rgba(202,138,4,0.25)]">
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-2xl pointer-events-none" />
              <div className="relative flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                  {fallbackLevel === "all" ? (
                    <Sparkles size={18} className="text-white" />
                  ) : (
                    <MapPinned size={18} className="text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-sm md:text-base font-bold text-amber-900">
                    {banner.title}
                  </p>
                  <p className="text-xs md:text-sm text-amber-900/75 mt-1 leading-relaxed">
                    {banner.subtitle}
                  </p>
                </div>
              </div>
            </div>
          )}

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
                No hay propiedades disponibles en este momento. Vuelve pronto o contáctanos para opciones a medida.
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
                {properties.length} propiedad{properties.length !== 1 ? "es" : ""}
                {fallbackLevel === "exact" ? " encontrada" : " sugerida"}
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
