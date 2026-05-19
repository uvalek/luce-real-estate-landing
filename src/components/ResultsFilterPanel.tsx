import { useEffect, useState } from "react";
import {
  Home,
  Building2,
  Store,
  Trees,
  MapPin,
  ChevronDown,
  Filter as FilterIcon,
  RotateCcw,
  ArrowUpRight,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";

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

const BUDGET_MIN = 0;
const BUDGET_MAX = 10_000_000;
const BUDGET_STEP = 100_000;

export interface FilterValues {
  state: string;
  municipality: string;
  propertyTypes: string[];
  budgetMax: number; // 0 means "no limit"
  listingType: string;
}

interface ResultsFilterPanelProps {
  initial: FilterValues;
  onApply: (values: FilterValues) => void;
  resultsCount?: number;
}

const formatBudget = (n: number) => {
  if (n === 0 || n >= BUDGET_MAX) return "Sin límite";
  return `$${n.toLocaleString("es-MX")}`;
};

const ResultsFilterPanel = ({
  initial,
  onApply,
  resultsCount,
}: ResultsFilterPanelProps) => {
  const [state, setState] = useState(initial.state);
  const [municipality, setMunicipality] = useState(initial.municipality);
  const [types, setTypes] = useState<string[]>(initial.propertyTypes);
  const [budget, setBudget] = useState(
    initial.budgetMax > 0 ? initial.budgetMax : BUDGET_MAX,
  );
  const [listing, setListing] = useState(initial.listingType);

  // Keep state in sync when URL/initial changes externally
  useEffect(() => {
    setState(initial.state);
    setMunicipality(initial.municipality);
    setTypes(initial.propertyTypes);
    setBudget(initial.budgetMax > 0 ? initial.budgetMax : BUDGET_MAX);
    setListing(initial.listingType);
  }, [
    initial.state,
    initial.municipality,
    initial.budgetMax,
    initial.listingType,
    initial.propertyTypes,
  ]);

  const municipios =
    state === "puebla"
      ? municipiosPuebla
      : state === "tlaxcala"
        ? municipiosTlaxcala
        : [];

  const handleStateChange = (newState: string) => {
    setState(newState);
    setMunicipality("");
  };

  const toggleType = (value: string) => {
    setTypes((prev) =>
      prev.includes(value)
        ? prev.filter((t) => t !== value)
        : [...prev, value],
    );
  };

  const handleApply = () => {
    onApply({
      state,
      municipality,
      propertyTypes: types,
      budgetMax: budget >= BUDGET_MAX ? 0 : budget,
      listingType: listing,
    });
  };

  const handleReset = () => {
    setState("");
    setMunicipality("");
    setTypes([]);
    setBudget(BUDGET_MAX);
    setListing("");
    onApply({
      state: "",
      municipality: "",
      propertyTypes: [],
      budgetMax: 0,
      listingType: "",
    });
  };

  return (
    <aside className="bg-card rounded-[2rem] border border-border/70 shadow-[0_15px_40px_-20px_rgba(15,23,42,0.18)] p-6 md:p-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/10 text-gold">
            <FilterIcon size={16} strokeWidth={2.2} />
          </span>
          <div>
            <p className="font-heading text-base font-bold text-cobalt leading-none">
              Filtros
            </p>
            {typeof resultsCount === "number" && (
              <p className="text-xs text-foreground/55 mt-1 tabular-nums">
                {resultsCount} resultado{resultsCount === 1 ? "" : "s"}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="group inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/60 hover:text-cobalt transition-colors"
          title="Limpiar filtros"
        >
          <RotateCcw
            size={13}
            className="transition-transform duration-500 group-hover:-rotate-180"
          />
          Limpiar
        </button>
      </div>

      {/* Listing type — segmented pills */}
      <Section title="Operación">
        <div className="inline-flex w-full p-1 rounded-full bg-cobalt/5 border border-cobalt/10">
          {[
            { v: "", label: "Ambos" },
            { v: "venta", label: "Venta" },
            { v: "renta", label: "Renta" },
          ].map((opt) => {
            const active = listing === opt.v;
            return (
              <button
                key={opt.v}
                type="button"
                onClick={() => setListing(opt.v)}
                className={`flex-1 px-3 py-2 text-[11px] font-bold tracking-[0.14em] uppercase rounded-full transition-colors duration-300 ${
                  active
                    ? "bg-cobalt text-primary-foreground shadow-[0_6px_16px_-6px_rgba(15,23,42,0.5)]"
                    : "text-cobalt/55 hover:text-cobalt"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Estado */}
      <Section title="Estado">
        <SelectField
          icon={MapPin}
          value={state}
          onChange={handleStateChange}
          placeholder="Cualquier estado"
          options={[
            { value: "", label: "Cualquier estado" },
            { value: "puebla", label: "Puebla" },
            { value: "tlaxcala", label: "Tlaxcala" },
          ]}
        />
      </Section>

      {/* Municipio */}
      <Section title="Municipio">
        <SelectField
          icon={MapPin}
          value={municipality}
          onChange={setMunicipality}
          disabled={!state}
          placeholder={state ? "Cualquier municipio" : "Elige un estado primero"}
          options={[
            { value: "", label: state ? "Cualquier municipio" : "—" },
            ...municipios.map((m) => ({ value: m, label: m })),
          ]}
        />
      </Section>

      {/* Tipo de propiedad — multi checkbox */}
      <Section title="Tipo de propiedad">
        <div className="space-y-2.5">
          {propertyTypes.map(({ value, label, icon: Icon }) => {
            const active = types.includes(value);
            return (
              <label
                key={value}
                className={`group flex items-center gap-3 px-4 py-2.5 rounded-2xl border cursor-pointer transition-all duration-200 ${
                  active
                    ? "border-cobalt bg-cobalt/5"
                    : "border-border hover:border-cobalt/30 bg-background/40"
                }`}
              >
                <Checkbox
                  checked={active}
                  onCheckedChange={() => toggleType(value)}
                  className="data-[state=checked]:bg-cobalt data-[state=checked]:border-cobalt"
                />
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                    active ? "bg-cobalt text-primary-foreground" : "bg-gold/10 text-gold"
                  }`}
                >
                  <Icon size={14} strokeWidth={2.2} />
                </span>
                <span className="flex-1 text-sm font-medium text-foreground">
                  {label}
                </span>
              </label>
            );
          })}
        </div>
      </Section>

      {/* Presupuesto */}
      <Section title="Presupuesto máximo">
        <div className="px-1">
          <div className="flex items-baseline justify-between mb-3">
            <span className="font-heading text-xl font-extrabold text-cobalt tabular-nums">
              {formatBudget(budget)}
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase text-foreground/45">
              MXN
            </span>
          </div>
          <Slider
            min={BUDGET_MIN}
            max={BUDGET_MAX}
            step={BUDGET_STEP}
            value={[budget]}
            onValueChange={(v) => setBudget(v[0])}
            className="[&_[data-orientation=horizontal]]:bg-cobalt/10 [&_.bg-primary]:bg-gold [&_[role=slider]]:border-gold [&_[role=slider]]:bg-card [&_[role=slider]]:shadow-[0_4px_12px_-4px_rgba(184,134,11,0.55)] [&_[role=slider]]:h-5 [&_[role=slider]]:w-5"
          />
          <div className="flex justify-between mt-2 text-[10px] font-semibold tracking-wider uppercase text-foreground/40 tabular-nums">
            <span>$0</span>
            <span>10M+</span>
          </div>
        </div>
      </Section>

      {/* Apply CTA */}
      <button
        type="button"
        onClick={handleApply}
        className="group/cta mt-7 relative w-full inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-cobalt px-6 py-3.5 text-xs font-bold tracking-[0.2em] uppercase text-primary-foreground shadow-[0_14px_28px_-12px_rgba(15,23,42,0.55)] transition-all duration-300 hover:shadow-[0_20px_40px_-12px_rgba(28,55,140,0.65)] active:scale-[0.98]"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gold/35 to-transparent transition-transform duration-700 group-hover/cta:translate-x-full"
        />
        <span className="relative">Aplicar filtros</span>
        <ArrowUpRight
          size={14}
          strokeWidth={2.6}
          className="relative text-gold transition-transform duration-300 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5"
        />
      </button>
    </aside>
  );
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="mb-6">
    <p className="text-xs font-bold tracking-wide uppercase text-foreground/55 mb-3">
      {title}
    </p>
    {children}
  </div>
);

interface SelectFieldProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}

const SelectField = ({
  icon: Icon,
  value,
  onChange,
  options,
  disabled,
}: SelectFieldProps) => (
  <div
    className={`relative flex items-center gap-3 rounded-2xl border bg-background/40 px-4 py-3 transition-all duration-200 ${
      disabled
        ? "opacity-60 border-border"
        : "border-border hover:border-cobalt/30 focus-within:border-cobalt focus-within:bg-background"
    }`}
  >
    <Icon size={16} className="text-gold flex-shrink-0" />
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="flex-1 min-w-0 bg-transparent text-sm font-medium text-foreground outline-none appearance-none cursor-pointer pr-5 disabled:cursor-not-allowed"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
    <ChevronDown
      size={14}
      className="absolute right-4 text-foreground/40 pointer-events-none"
    />
  </div>
);

export default ResultsFilterPanel;
