import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Home,
  Building2,
  Store,
  Trees,
  ChevronDown,
  ArrowRight,
  Check,
} from "lucide-react";
import { stats } from "@/data/mockData";
import AnimatedStat from "@/components/AnimatedStat";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const municipiosPuebla = [
  "Heroica Puebla de Zaragoza",
  "Cholula",
  "Atlixco",
  "Tehuacán",
  "San Martín Texmelucan",
  "Zacatlán",
  "Cuetzalan",
  "Izúcar de Matamoros",
  "Huejotzingo",
  "Amozoc",
];

const municipiosTlaxcala = [
  "Tlaxcala de Xicohténcatl",
  "Apizaco",
  "Huamantla",
  "Santa Ana Chiautempan",
  "Zacatelco",
  "Calpulalpan",
  "Contla de Juan Cuamatzi",
  "Papalotla de Xicohténcatl",
  "Chiautempan",
  "Tlaxco",
];

const propertyTypes = [
  { value: "casa", label: "Casa", icon: Home },
  { value: "departamento", label: "Departamento", icon: Building2 },
  { value: "local", label: "Local", icon: Store },
  { value: "terreno", label: "Terreno", icon: Trees },
] as const;

export interface PropertyFilters {
  state: string;
  municipality: string;
  propertyType: string;
  budget: string;
  listingType: string;
}

const formatBudgetInput = (value: string): string => {
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("es-MX");
};

const PropertyFilter = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<PropertyFilters>({
    state: "",
    municipality: "",
    propertyType: "",
    budget: "",
    listingType: "venta",
  });
  const [typeOpen, setTypeOpen] = useState(false);

  const handleFilterChange = (field: keyof PropertyFilters, value: string) => {
    if (field === "state") {
      setFilters((prev) => ({ ...prev, state: value, municipality: "" }));
    } else if (field === "budget") {
      setFilters((prev) => ({ ...prev, budget: formatBudgetInput(value) }));
    } else {
      setFilters((prev) => ({ ...prev, [field]: value }));
    }
  };

  const getMunicipios = () => {
    if (filters.state === "puebla") return municipiosPuebla;
    if (filters.state === "tlaxcala") return municipiosTlaxcala;
    return [];
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (filters.state) params.set("estado", filters.state);
    if (filters.municipality) params.set("municipio", filters.municipality);
    if (filters.propertyType) params.set("tipo", filters.propertyType);
    if (filters.budget) {
      params.set("presupuesto", filters.budget.replace(/[^0-9]/g, ""));
    }
    if (filters.listingType) params.set("oferta", filters.listingType);
    navigate(`/resultados?${params.toString()}`);
  };

  const selectedType = propertyTypes.find(
    (t) => t.value === filters.propertyType,
  );
  const SelectedIcon = selectedType?.icon ?? Home;

  return (
    <section className="relative z-10 -mt-6 sm:-mt-10 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="relative bg-card rounded-[2.5rem] shadow-[0_25px_60px_-20px_rgba(15,23,42,0.25)] p-6 md:p-10 overflow-hidden">
          {/* Decorative gold corner accent */}
          <div
            aria-hidden="true"
            className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-gold/10 blur-3xl pointer-events-none"
          />

          {/* Header — title + Venta/Renta tabs */}
          <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-7">
            <div>
              <h3 className="font-heading text-2xl md:text-3xl font-bold text-cobalt leading-tight">
                Búsqueda a tu medida
              </h3>
            </div>

            {/* Listing type toggle */}
            <div
              role="tablist"
              aria-label="Tipo de operación"
              className="inline-flex self-start sm:self-auto p-1 rounded-full bg-cobalt/5 border border-cobalt/10"
            >
              {[
                { v: "venta", label: "Venta" },
                { v: "renta", label: "Renta" },
              ].map((opt) => {
                const active = filters.listingType === opt.v;
                return (
                  <button
                    key={opt.v}
                    role="tab"
                    aria-selected={active}
                    onClick={() => handleFilterChange("listingType", opt.v)}
                    className={`relative px-5 py-2 text-xs font-bold tracking-[0.15em] uppercase rounded-full transition-colors duration-300 ${
                      active
                        ? "bg-cobalt text-primary-foreground shadow-[0_8px_20px_-8px_rgba(15,23,42,0.5)]"
                        : "text-cobalt/60 hover:text-cobalt"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Asymmetric grid */}
          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4">
            {/* Ubicación — dominant capsule (Estado + Municipio) */}
            <div className="lg:col-span-7 group">
              <FieldLabel>Ubicación</FieldLabel>
              <div className="flex items-stretch rounded-[45px] border border-border bg-background/40 transition-all duration-300 focus-within:border-cobalt focus-within:bg-background focus-within:shadow-[0_10px_30px_-12px_rgba(15,23,42,0.25),0_0_0_4px_rgba(184,134,11,0.08)] hover:border-cobalt/30">
                {/* Estado */}
                <div className="relative flex items-center pl-5 pr-3 py-3.5 flex-1 min-w-0 gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/10 text-gold flex-shrink-0">
                    <MapPin size={18} strokeWidth={2.2} />
                  </span>
                  <select
                    value={filters.state}
                    onChange={(e) =>
                      handleFilterChange("state", e.target.value)
                    }
                    className="text-base sm:text-sm font-medium text-foreground w-full min-w-0 bg-transparent outline-none appearance-none cursor-pointer pr-5"
                  >
                    <option value="">Estado</option>
                    <option value="puebla">Puebla</option>
                    <option value="tlaxcala">Tlaxcala</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-3 text-foreground/40 pointer-events-none"
                  />
                </div>

                {/* Divider */}
                <div className="w-px self-stretch my-3 bg-border" />

                {/* Municipio */}
                <div className="relative flex items-center px-3 pr-5 py-3.5 flex-1 min-w-0">
                  <select
                    value={filters.municipality}
                    onChange={(e) =>
                      handleFilterChange("municipality", e.target.value)
                    }
                    disabled={!filters.state}
                    className="text-base sm:text-sm font-medium text-foreground w-full min-w-0 bg-transparent outline-none appearance-none cursor-pointer pr-5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {filters.state ? "Municipio" : "Elige un estado primero"}
                    </option>
                    {getMunicipios().map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-4 text-foreground/40 pointer-events-none"
                  />
                </div>
              </div>
            </div>

            {/* Tipo de Propiedad — custom popover with icons */}
            <div className="lg:col-span-5">
              <FieldLabel>Tipo de propiedad</FieldLabel>
              <Popover open={typeOpen} onOpenChange={setTypeOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-[45px] border bg-background/40 text-left transition-all duration-300 hover:border-cobalt/30 ${
                      typeOpen
                        ? "border-cobalt bg-background shadow-[0_10px_30px_-12px_rgba(15,23,42,0.25),0_0_0_4px_rgba(184,134,11,0.08)]"
                        : "border-border"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                        selectedType
                          ? "bg-cobalt text-primary-foreground"
                          : "bg-gold/10 text-gold"
                      }`}
                    >
                      <SelectedIcon size={18} strokeWidth={2.2} />
                    </span>
                    <span
                      className={`flex-1 text-sm font-medium ${
                        selectedType ? "text-foreground" : "text-foreground/60"
                      }`}
                    >
                      {selectedType ? selectedType.label : "Cualquiera"}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-foreground/50 transition-transform duration-300 ${
                        typeOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  sideOffset={8}
                  className="w-[min(20rem,calc(100vw-2rem))] p-2 rounded-3xl border-border shadow-[0_20px_50px_-15px_rgba(15,23,42,0.3)]"
                >
                  <button
                    type="button"
                    onClick={() => {
                      handleFilterChange("propertyType", "");
                      setTypeOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                      !filters.propertyType
                        ? "bg-cobalt/5 text-cobalt font-semibold"
                        : "text-foreground/70 hover:bg-muted"
                    }`}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
                      <Home size={14} className="text-foreground/50" />
                    </span>
                    Cualquiera
                    {!filters.propertyType && (
                      <Check size={14} className="ml-auto text-gold" />
                    )}
                  </button>
                  <div className="my-1 h-px bg-border/70" />
                  {propertyTypes.map(({ value, label, icon: Icon }) => {
                    const active = filters.propertyType === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          handleFilterChange("propertyType", value);
                          setTypeOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                          active
                            ? "bg-cobalt/5 text-cobalt font-semibold"
                            : "text-foreground/80 hover:bg-muted"
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                            active
                              ? "bg-cobalt text-primary-foreground"
                              : "bg-gold/10 text-gold"
                          }`}
                        >
                          <Icon size={14} strokeWidth={2.2} />
                        </span>
                        {label}
                        {active && (
                          <Check size={14} className="ml-auto text-gold" />
                        )}
                      </button>
                    );
                  })}
                </PopoverContent>
              </Popover>
            </div>

            {/* Presupuesto */}
            <div className="lg:col-span-8">
              <FieldLabel>Presupuesto máximo</FieldLabel>
              <div className="flex items-center gap-3 px-5 py-3.5 rounded-[45px] border border-border bg-background/40 transition-all duration-300 focus-within:border-cobalt focus-within:bg-background focus-within:shadow-[0_10px_30px_-12px_rgba(15,23,42,0.25),0_0_0_4px_rgba(184,134,11,0.08)] hover:border-cobalt/30">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/10 text-gold font-heading text-lg font-bold flex-shrink-0">
                  $
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Sin límite"
                  value={filters.budget}
                  onChange={(e) => handleFilterChange("budget", e.target.value)}
                  className="text-base sm:text-sm font-medium text-foreground flex-1 min-w-0 bg-transparent outline-none placeholder:text-foreground/40 placeholder:font-normal tabular-nums"
                />
                {filters.budget && (
                  <span className="text-xs font-semibold tracking-wider text-foreground/40 uppercase">
                    MXN
                  </span>
                )}
              </div>
            </div>

            {/* CTA */}
            <div className="lg:col-span-4 flex mt-4 lg:mt-0">
              <button
                onClick={handleSearch}
                className="group relative w-full lg:mt-[30px] flex items-center justify-center gap-3 bg-cobalt text-primary-foreground font-semibold text-sm rounded-[45px] px-6 py-4 overflow-hidden transition-all duration-300 hover:shadow-[0_20px_40px_-10px_rgba(15,23,42,0.5)] active:scale-[0.98]"
              >
                {/* Gold sweep on hover */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gold/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                />
                <span className="relative tracking-wide uppercase">Buscar</span>
                <ArrowRight
                  size={16}
                  className="relative transition-transform duration-300 group-hover:translate-x-1"
                />
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-20 md:mt-28 mb-4 max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-y-12 sm:gap-y-0 sm:divide-x sm:divide-border/60">
          {stats.map((s) => (
            <div key={s.label} className="px-6 sm:px-8 flex justify-center">
              <AnimatedStat value={s.value} label={s.label} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="block mb-2 ml-2 text-sm md:text-[15px] font-semibold tracking-wide text-foreground/65">
    {children}
  </label>
);

export default PropertyFilter;
