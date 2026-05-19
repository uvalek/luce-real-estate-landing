import { useState, useEffect, lazy, Suspense } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  SearchX,
  MapPinned,
  Sparkles,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Propiedad } from "@/types";
import PropertyCard from "@/components/PropertyCard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ResultsFilterPanel, {
  type FilterValues,
} from "@/components/ResultsFilterPanel";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const PropertyDetailModal = lazy(() => import("@/components/PropertyDetailModal"));

type FallbackLevel =
  | "exact"
  | "same-zone"
  | "same-state"
  | "all"
  | "none";

const STATE_ZONES: Record<string, string> = {
  tlaxcala:
    "zona.ilike.%Tlaxcala%,zona.ilike.%Apizaco%,zona.ilike.%Huamantla%,zona.ilike.%Chiautempan%,zona.ilike.%Zacatelco%,zona.ilike.%Calpulalpan%,zona.ilike.%Xaloztoc%,zona.ilike.%Tlaxco%,zona.ilike.%Contla%",
  puebla:
    "zona.ilike.%Puebla%,zona.ilike.%Cholula%,zona.ilike.%Atlixco%,zona.ilike.%Tehuacán%,zona.ilike.%Zacatlán%,zona.ilike.%Cuetzalan%,zona.ilike.%Huejotzingo%,zona.ilike.%Amozoc%,zona.ilike.%San Andrés%,zona.ilike.%Angelópolis%,zona.ilike.%Sonterra%,zona.ilike.%La Vista%,zona.ilike.%Lomas%",
};

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState<Propiedad[]>([]);
  const [fallbackLevel, setFallbackLevel] = useState<FallbackLevel>("exact");
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Propiedad | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const state = searchParams.get("estado") || "";
  const municipality = searchParams.get("municipio") || "";
  const propertyTypeParam = searchParams.get("tipo") || "";
  const propertyTypeList = propertyTypeParam
    ? propertyTypeParam.split(",").filter(Boolean)
    : [];
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

    const applyTipos = (q: ReturnType<typeof baseQuery>) => {
      if (propertyTypeList.length === 1) return q.eq("tipo", propertyTypeList[0]);
      if (propertyTypeList.length > 1) return q.in("tipo", propertyTypeList);
      return q;
    };

    const queryExact = async () => {
      let q = baseQuery();
      if (municipality) {
        q = q.ilike("zona", `%${municipality}%`);
      } else if (state && STATE_ZONES[state]) {
        q = q.or(STATE_ZONES[state]);
      }
      q = applyTipos(q);
      if (numericBudget > 0) q = q.lte("precio", numericBudget);
      q = applyListing(q);
      const { data } = await q;
      return (data as Propiedad[]) || [];
    };

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

    const querySameState = async () => {
      const target = inferredState;
      if (!target || !STATE_ZONES[target]) return [];
      let q = baseQuery().or(STATE_ZONES[target]);
      q = applyListing(q);
      const { data } = await q;
      return (data as Propiedad[]) || [];
    };

    const queryAll = async () => {
      let q = baseQuery();
      q = applyListing(q);
      const { data } = await q;
      return (data as Propiedad[]) || [];
    };

    const run = async () => {
      setLoading(true);

      const exact = await queryExact();
      if (exact.length > 0) {
        setProperties(exact);
        setFallbackLevel("exact");
        setLoading(false);
        return;
      }

      const hadExtraFilters = propertyTypeList.length > 0 || numericBudget > 0;
      if (hadExtraFilters && (municipality || state)) {
        const sameZone = await querySameZone();
        if (sameZone.length > 0) {
          setProperties(sameZone);
          setFallbackLevel("same-zone");
          setLoading(false);
          return;
        }
      }

      const sameState = await querySameState();
      if (sameState.length > 0) {
        setProperties(sameState);
        setFallbackLevel("same-state");
        setLoading(false);
        return;
      }

      const all = await queryAll();
      setProperties(all);
      setFallbackLevel(all.length === 0 ? "none" : "all");
      setLoading(false);
    };

    run();
  }, [
    state,
    municipality,
    propertyTypeParam,
    budgetMax,
    listingType,
    numericBudget,
    inferredState,
  ]);

  const handleApplyFilters = (v: FilterValues) => {
    const next = new URLSearchParams();
    if (v.state) next.set("estado", v.state);
    if (v.municipality) next.set("municipio", v.municipality);
    if (v.propertyTypes.length) next.set("tipo", v.propertyTypes.join(","));
    if (v.budgetMax > 0) next.set("presupuesto", String(v.budgetMax));
    if (v.listingType) next.set("oferta", v.listingType);
    setSearchParams(next);
    setMobileFiltersOpen(false);
  };

  const filterSummary = [
    municipality || (state ? (state === "puebla" ? "Puebla" : "Tlaxcala") : ""),
    propertyTypeList.length > 0
      ? propertyTypeList
          .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
          .join(", ")
      : "",
    budgetMax ? `Hasta $${Number(budgetMax.replace(/[^0-9]/g, "")).toLocaleString("es-MX")}` : "",
    listingType ? (listingType === "venta" ? "Venta" : "Renta") : "",
  ]
    .filter(Boolean)
    .join(" · ");

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

  const initialFilters: FilterValues = {
    state,
    municipality,
    propertyTypes: propertyTypeList,
    budgetMax: numericBudget,
    listingType,
  };

  const activeFilterCount = [
    state,
    municipality,
    propertyTypeList.length > 0,
    numericBudget > 0,
    listingType,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />

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

          {/* Mobile filter trigger */}
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <div className="lg:hidden mb-6">
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl bg-card border border-border hover:border-cobalt/30 transition-colors"
                >
                  <span className="inline-flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/10 text-gold">
                      <SlidersHorizontal size={15} strokeWidth={2.2} />
                    </span>
                    <span className="font-heading font-bold text-sm text-cobalt">
                      Modificar filtros
                    </span>
                  </span>
                  {activeFilterCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-cobalt text-primary-foreground text-[11px] font-bold tabular-nums">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </SheetTrigger>
            </div>

            <SheetContent
              side="right"
              className="w-full sm:max-w-md p-0 overflow-y-auto bg-background"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
                <p className="font-heading text-base font-bold text-cobalt">
                  Refinar búsqueda
                </p>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted transition-colors"
                  aria-label="Cerrar filtros"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 pb-10">
                <ResultsFilterPanel
                  initial={initialFilters}
                  onApply={handleApplyFilters}
                  resultsCount={loading ? undefined : properties.length}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Two-column grid: sidebar + results */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar — desktop only.
              No max-height / no internal scroll so the panel is shown in
              its full natural height. The column self-aligns to the top
              of the grid so it doesn't stretch with the results column. */}
            <div className="hidden lg:block lg:col-span-4 xl:col-span-3 self-start">
              <ResultsFilterPanel
                initial={initialFilters}
                onApply={handleApplyFilters}
                resultsCount={loading ? undefined : properties.length}
              />
            </div>

            {/* Results column */}
            <div className="lg:col-span-8 xl:col-span-9 min-w-0">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
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
          </div>
        </div>
      </section>

      <Footer />

      {selectedProperty && (
        <Suspense fallback={null}>
          <PropertyDetailModal
            property={selectedProperty}
            onClose={() => setSelectedProperty(null)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default Resultados;
