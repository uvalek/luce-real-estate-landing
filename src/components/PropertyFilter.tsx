import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Home, DollarSign, Search, KeyRound } from "lucide-react";
import { stats } from "@/data/mockData";

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
    listingType: "",
  });

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

  return (
    <section className="relative z-10 -mt-6 sm:-mt-10 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="bg-card rounded-lg shadow-xl p-6 md:p-8">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-5">
            Busca propiedades disponibles
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Estado */}
            <div className="flex items-center border border-border rounded px-4 py-3 min-w-0">
              <select
                value={filters.state}
                onChange={(e) => handleFilterChange("state", e.target.value)}
                className="text-base sm:text-sm text-foreground/70 w-full min-w-0 bg-transparent outline-none appearance-none cursor-pointer"
              >
                <option value="">Estado</option>
                <option value="puebla">Puebla</option>
                <option value="tlaxcala">Tlaxcala</option>
              </select>
              <MapPin size={18} className="ml-2 text-foreground flex-shrink-0" />
            </div>

            {/* Municipio */}
            <div className="flex items-center border border-border rounded px-4 py-3 min-w-0">
              <select
                value={filters.municipality}
                onChange={(e) => handleFilterChange("municipality", e.target.value)}
                disabled={!filters.state}
                className="text-base sm:text-sm text-foreground/70 w-full min-w-0 bg-transparent outline-none appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
              <MapPin size={18} className="ml-2 text-foreground flex-shrink-0" />
            </div>

            {/* Tipo de Propiedad */}
            <div className="flex items-center border border-border rounded px-4 py-3 min-w-0">
              <select
                value={filters.propertyType}
                onChange={(e) => handleFilterChange("propertyType", e.target.value)}
                className="text-base sm:text-sm text-foreground/70 w-full min-w-0 bg-transparent outline-none appearance-none cursor-pointer"
              >
                <option value="">Tipo de Propiedad</option>
                <option value="casa">Casa</option>
                <option value="departamento">Departamento</option>
                <option value="local">Local</option>
                <option value="terreno">Terreno</option>
              </select>
              <Home size={18} className="ml-2 text-foreground flex-shrink-0" />
            </div>

            {/* Presupuesto */}
            <div className="flex items-center border border-border rounded px-4 py-3 min-w-0">
              <span className="text-sm text-foreground/70 mr-1">$</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Presupuesto máximo"
                value={filters.budget}
                onChange={(e) => handleFilterChange("budget", e.target.value)}
                className="text-base sm:text-sm text-foreground/70 w-full min-w-0 bg-transparent outline-none placeholder:text-foreground/70"
              />
              <DollarSign size={18} className="ml-2 text-foreground flex-shrink-0" />
            </div>

            {/* Renta o Venta */}
            <div className="flex items-center border border-border rounded px-4 py-3 min-w-0">
              <select
                value={filters.listingType}
                onChange={(e) => handleFilterChange("listingType", e.target.value)}
                className="text-base sm:text-sm text-foreground/70 w-full min-w-0 bg-transparent outline-none appearance-none cursor-pointer"
              >
                <option value="">Renta o Venta</option>
                <option value="venta">Venta</option>
                <option value="renta">Renta</option>
              </select>
              <KeyRound size={18} className="ml-2 text-foreground flex-shrink-0" />
            </div>

            {/* Buscar */}
            <button
              onClick={handleSearch}
              className="flex items-center justify-center gap-2 bg-foreground text-background font-semibold text-sm rounded px-6 py-3 hover:bg-foreground/80 transition-colors"
            >
              <Search size={16} className="flex-shrink-0" />
              Buscar
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 mt-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-heading text-2xl md:text-3xl font-bold text-cobalt">
                {s.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PropertyFilter;
