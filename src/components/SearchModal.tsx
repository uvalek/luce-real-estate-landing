import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Search,
  MapPin,
  Home,
  DollarSign,
  KeyRound,
  ArrowRight,
  Sparkles,
} from "lucide-react";

/* ── municipality data ── */
const municipiosPuebla = [
  "Heroica Puebla de Zaragoza", "Cholula", "Atlixco", "Tehuacán",
  "San Martín Texmelucan", "Zacatlán", "Cuetzalan",
  "Izúcar de Matamoros", "Huejotzingo", "Amozoc",
];
const municipiosTlaxcala = [
  "Tlaxcala de Xicohténcatl", "Apizaco", "Huamantla",
  "Santa Ana Chiautempan", "Zacatelco", "Calpulalpan",
  "Contla de Juan Cuamatzi", "Papalotla de Xicohténcatl",
  "Chiautempan", "Tlaxco",
];

const formatBudget = (v: string) => {
  const d = v.replace(/[^0-9]/g, "");
  return d ? Number(d).toLocaleString("es-MX") : "";
};

/* ── Quick-pick chips ── */
const quickPicks = [
  { label: "Casas en Puebla", state: "puebla", type: "casa" },
  { label: "Depas en Tlaxcala", state: "tlaxcala", type: "departamento" },
  { label: "Terrenos", state: "", type: "terreno" },
  { label: "Renta", state: "", type: "", listing: "renta" },
];

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

const SearchModal = ({ open, onClose }: SearchModalProps) => {
  const navigate = useNavigate();
  const backdropRef = useRef<HTMLDivElement>(null);

  /* ── animation state ── */
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      document.body.style.overflow = "hidden";
      // trigger enter animation on next frame
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimateIn(true)));
    } else {
      setAnimateIn(false);
      const t = setTimeout(() => {
        setVisible(false);
        document.body.style.overflow = "";
      }, 350); // matches CSS transition duration
      return () => clearTimeout(t);
    }
  }, [open]);

  /* ── filters ── */
  const [state, setState] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [budget, setBudget] = useState("");
  const [listingType, setListingType] = useState("");

  /* ── step tracker (visual progress) ── */
  const filledCount = [state, municipality, propertyType, budget, listingType].filter(Boolean).length;

  const municipios = state === "puebla" ? municipiosPuebla : state === "tlaxcala" ? municipiosTlaxcala : [];

  const handleStateChange = (v: string) => { setState(v); setMunicipality(""); };

  const handleSearch = () => {
    const p = new URLSearchParams();
    if (state) p.set("estado", state);
    if (municipality) p.set("municipio", municipality);
    if (propertyType) p.set("tipo", propertyType);
    if (budget) p.set("presupuesto", budget.replace(/[^0-9]/g, ""));
    if (listingType) p.set("oferta", listingType);
    onClose();
    navigate(`/resultados?${p.toString()}`);
  };

  const applyQuickPick = (pick: typeof quickPicks[0]) => {
    if (pick.state) setState(pick.state);
    if (pick.type) setPropertyType(pick.type);
    if (pick.listing) setListingType(pick.listing);
  };

  if (!visible) return null;

  const inputWrap =
    "group flex items-center gap-3 border-2 border-border rounded-xl px-4 py-3.5 transition-all duration-200 focus-within:border-cobalt focus-within:shadow-[0_0_0_3px_hsl(220_60%_15%/0.08)]";
  const selectClass =
    "text-base sm:text-sm text-foreground w-full bg-transparent outline-none appearance-none cursor-pointer placeholder:text-muted-foreground";

  return (
    <div
      ref={backdropRef}
      className={`fixed inset-0 z-[200] flex items-start justify-center transition-all duration-350 ${
        animateIn ? "bg-black/50 backdrop-blur-md" : "bg-black/0 backdrop-blur-none"
      }`}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div
        className={`relative w-full max-w-2xl mx-4 mt-[8vh] sm:mt-[12vh] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          animateIn
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-8 scale-95"
        }`}
      >
        {/* ── Glow ring behind the card ── */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-cobalt/20 via-transparent to-gold/20 blur-xl pointer-events-none" />

        {/* ── Card ── */}
        <div className="relative bg-card rounded-2xl shadow-2xl overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1 bg-gradient-to-r from-cobalt via-cobalt-light to-gold" />

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-cobalt/10 flex items-center justify-center">
                <Search size={18} className="text-cobalt" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-foreground leading-tight">
                  Encuentra tu propiedad ideal
                </h2>
                <p className="text-xs text-muted-foreground">
                  Completa los filtros para buscar
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Cerrar"
            >
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 px-6 pb-4 pt-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  i < filledCount ? "bg-cobalt" : "bg-border"
                }`}
              />
            ))}
          </div>

          {/* Quick picks */}
          <div className="px-6 pb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles size={12} className="text-gold" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Acceso rápido
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickPicks.map((pick) => (
                <button
                  key={pick.label}
                  onClick={() => applyQuickPick(pick)}
                  className="text-xs font-medium px-3 py-1.5 rounded-full border border-border bg-muted/50 text-foreground/70 hover:border-cobalt hover:text-cobalt hover:bg-cobalt/5 transition-all duration-200"
                >
                  {pick.label}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border mx-6" />

          {/* Form fields */}
          <div className="px-6 py-5 space-y-3">
            {/* Row 1: Estado + Municipio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={inputWrap}>
                <MapPin size={18} className="text-cobalt flex-shrink-0 transition-colors group-focus-within:text-cobalt" />
                <select value={state} onChange={(e) => handleStateChange(e.target.value)} className={selectClass}>
                  <option value="">Estado</option>
                  <option value="puebla">Puebla</option>
                  <option value="tlaxcala">Tlaxcala</option>
                </select>
              </div>

              <div className={`${inputWrap} ${!state ? "opacity-50" : ""}`}>
                <MapPin size={18} className="text-cobalt flex-shrink-0" />
                <select
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  disabled={!state}
                  className={`${selectClass} disabled:cursor-not-allowed`}
                >
                  <option value="">{state ? "Municipio" : "Elige estado primero"}</option>
                  {municipios.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Tipo + Oferta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={inputWrap}>
                <Home size={18} className="text-cobalt flex-shrink-0" />
                <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className={selectClass}>
                  <option value="">Tipo de Propiedad</option>
                  <option value="casa">Casa</option>
                  <option value="departamento">Departamento</option>
                  <option value="local">Local</option>
                  <option value="terreno">Terreno</option>
                </select>
              </div>

              <div className={inputWrap}>
                <KeyRound size={18} className="text-cobalt flex-shrink-0" />
                <select value={listingType} onChange={(e) => setListingType(e.target.value)} className={selectClass}>
                  <option value="">Renta o Venta</option>
                  <option value="venta">Venta</option>
                  <option value="renta">Renta</option>
                </select>
              </div>
            </div>

            {/* Row 3: Presupuesto */}
            <div className={inputWrap}>
              <DollarSign size={18} className="text-cobalt flex-shrink-0" />
              <span className="text-sm text-foreground/70">$</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Presupuesto máximo"
                value={budget}
                onChange={(e) => setBudget(formatBudget(e.target.value))}
                className={`${selectClass} placeholder:text-muted-foreground`}
              />
              {budget && (
                <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">MXN</span>
              )}
            </div>
          </div>

          {/* Footer / CTA */}
          <div className="px-6 pb-6 pt-1">
            <button
              onClick={handleSearch}
              className="group/btn relative w-full flex items-center justify-center gap-2.5 bg-cobalt text-white font-semibold text-sm py-4 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-cobalt/25 active:scale-[0.98]"
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
              <Search size={18} className="relative z-10" />
              <span className="relative z-10">Buscar Propiedades</span>
              <ArrowRight size={16} className="relative z-10 transition-transform duration-300 group-hover/btn:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
