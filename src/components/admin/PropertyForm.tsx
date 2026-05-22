import { useState, useEffect, useRef } from "react";
import {
  Save,
  Loader2,
  Upload,
  Camera,
  Home,
  Building2,
  Store,
  Trees,
  MapPin,
  Navigation,
  BedDouble,
  Bath,
  Ruler,
  Tag,
  Minus,
  Plus,
  AlertCircle,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { uploadImage } from "@/lib/uploadImage";
import GalleryUpload from "@/components/admin/GalleryUpload";
import { MUNICIPIOS_POR_ESTADO, MUNICIPIOS_PUEBLA_PRINCIPALES } from "@/data/municipios";
import type { Propiedad, GaleriaFoto } from "@/types";

const TIPO_OPTIONS = [
  { value: "casa", label: "Casa", icon: Home },
  { value: "departamento", label: "Depto.", icon: Building2 },
  { value: "local", label: "Local", icon: Store },
  { value: "terreno", label: "Terreno", icon: Trees },
] as const;

const OFERTA_OPTIONS = [
  { value: "VENTA", label: "Venta" },
  { value: "RENTA", label: "Renta" },
  { value: "RENTA Y VENTA", label: "Renta y Venta" },
] as const;

type PropiedadForm = Omit<Propiedad, "id" | "fecha_publicacion">;

const emptyForm: PropiedadForm = {
  nombre: "",
  tipo: "casa",
  estado: "",
  municipio: "",
  zona: "",
  codigo_postal: "",
  direccion: "",
  precio: 0,
  recamaras: 0,
  banos: 0,
  metros_cuadrados: 0,
  acepta_credito: true,
  tipos_credito: "",
  descripcion: "",
  disponible: true,
  asesor_asignado: "",
  observaciones: "",
  tipo_oferta: "VENTA",
  galeria: [],
};

/** Format number with commas for display */
const formatNum = (n: number): string => {
  if (!n) return "";
  return n.toLocaleString("es-MX");
};

/** Strip commas and non-digits, return pure number */
const parseNum = (s: string): number => {
  const digits = s.replace(/[^0-9]/g, "");
  return digits ? parseInt(digits, 10) : 0;
};

interface PropertyFormProps {
  initial?: Propiedad | null;
  onSubmit: (data: PropiedadForm) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  /** Full name of the signed-in admin — auto-assigned as asesor on new properties. */
  advisorName?: string;
}

const PropertyForm = ({ initial, onSubmit, onCancel, loading, advisorName }: PropertyFormProps) => {
  const [form, setForm] = useState<PropiedadForm>(emptyForm);
  const [precioDisplay, setPrecioDisplay] = useState("");
  const [uploadingMain, setUploadingMain] = useState(false);
  const mainFileRef = useRef<HTMLInputElement>(null);

  // Required-field validation. `errors` holds the keys still missing.
  const [errors, setErrors] = useState<string[]>([]);
  // Puebla has 217 municipios — show only the main ones until expanded.
  const [showAllMunicipios, setShowAllMunicipios] = useState(false);
  const nombreRef = useRef<HTMLDivElement>(null);
  const estadoRef = useRef<HTMLDivElement>(null);
  const municipioRef = useRef<HTMLDivElement>(null);
  const direccionRef = useRef<HTMLDivElement>(null);
  const precioRef = useRef<HTMLDivElement>(null);
  const superficieRef = useRef<HTMLDivElement>(null);
  const descripcionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initial) {
      const { id, fecha_publicacion, ...rest } = initial;
      setForm({ ...rest, galeria: rest.galeria || [] });
      setPrecioDisplay(formatNum(rest.precio));
    } else {
      // New property: the asesor is auto-assigned to the creator.
      setForm({ ...emptyForm, asesor_asignado: advisorName || "" });
      setPrecioDisplay("");
    }
  }, [initial, advisorName]);

  const set = (field: keyof PropiedadForm, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePrecioChange = (raw: string) => {
    const num = parseNum(raw);
    set("precio", num);
    setPrecioDisplay(num ? formatNum(num) : "");
  };

  const portadaUrl = form.galeria?.find((f) => f.categoria === "portada")?.url || null;

  const handleMainPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMain(true);
    try {
      const url = await uploadImage(file, "portada", initial?.id);
      const sinPortada = (form.galeria || []).filter((f) => f.categoria !== "portada");
      set("galeria", [{ url, categoria: "portada" }, ...sinPortada]);
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
    }
    setUploadingMain(false);
    if (mainFileRef.current) mainFileRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields, top-to-bottom.
    const missing: string[] = [];
    if (!form.nombre.trim()) missing.push("nombre");
    if (!form.estado.trim()) missing.push("estado");
    if (!form.municipio.trim()) missing.push("municipio");
    if (!(form.direccion || "").trim()) missing.push("direccion");
    if (!form.precio || form.precio <= 0) missing.push("precio");
    if (!form.metros_cuadrados || form.metros_cuadrados <= 0)
      missing.push("superficie");
    if (!(form.descripcion || "").trim()) missing.push("descripcion");

    if (missing.length > 0) {
      setErrors(missing);
      // Scroll to the first missing field (document order).
      const refs: Record<string, React.RefObject<HTMLDivElement>> = {
        nombre: nombreRef,
        estado: estadoRef,
        municipio: municipioRef,
        direccion: direccionRef,
        precio: precioRef,
        superficie: superficieRef,
        descripcion: descripcionRef,
      };
      const order = ["nombre", "estado", "municipio", "direccion", "precio", "superficie", "descripcion"];
      const first = order.find((f) => missing.includes(f));
      if (first) {
        refs[first]?.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
      return;
    }

    setErrors([]);
    onSubmit(form);
  };

  // Clear a field's error as soon as the admin starts fixing it.
  const clearError = (field: string) =>
    setErrors((prev) => prev.filter((f) => f !== field));

  const hasError = (field: string) => errors.includes(field);

  // Municipios for the chosen estado. Puebla (217) shows only its main
  // municipios until the admin expands the full list.
  const isPuebla = form.estado === "Puebla";
  const fullMunicipioList = MUNICIPIOS_POR_ESTADO[form.estado] || [];
  const municipioList =
    isPuebla && !showAllMunicipios ? MUNICIPIOS_PUEBLA_PRINCIPALES : fullMunicipioList;
  // If an existing property has a municipio outside the shown list
  // (legacy data, or a non-main Puebla municipio), keep it as an option
  // so editing never drops it.
  const municipioOptions =
    form.municipio && !municipioList.includes(form.municipio)
      ? [form.municipio, ...municipioList]
      : municipioList;

  // Legacy plain input (still used by Descripción / Asesor / Observaciones).
  const inputClass =
    "w-full border border-border/80 rounded-lg px-4 py-2.5 text-base sm:text-sm bg-white text-foreground outline-none focus:ring-2 focus:ring-cobalt/20 focus:border-cobalt/40 placeholder:text-muted-foreground/50 transition-all";
  const labelClass = "block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide";

  // Refined editorial field styling for the main property fields.
  const fieldLabel = "block text-sm font-semibold text-foreground/75 mb-2 ml-1";
  const fieldBox =
    "flex items-center gap-3 rounded-2xl border border-border/70 bg-white px-4 transition-all duration-200 hover:border-cobalt/30 focus-within:border-cobalt/55 focus-within:ring-4 focus-within:ring-gold/10";
  const bareInput =
    "flex-1 min-w-0 bg-transparent py-3 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/50 placeholder:font-normal";

  // Red highlight applied to the field shell when it's missing on submit.
  const errorBoxClass =
    "border-red-400 ring-4 ring-red-500/10 focus-within:border-red-400 focus-within:ring-red-500/15";
  const RequiredMark = () => <span className="text-red-500">*</span>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section: Info básica */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1 bg-border/60" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Información</span>
          <div className="h-px flex-1 bg-border/60" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
          {/* Nombre */}
          <div className="sm:col-span-2" ref={nombreRef}>
            <label className={fieldLabel}>
              Nombre de la propiedad <RequiredMark />
            </label>
            <div className={`${fieldBox} ${hasError("nombre") ? errorBoxClass : ""}`}>
              <Home size={16} className={hasError("nombre") ? "text-red-400 flex-shrink-0" : "text-gold flex-shrink-0"} />
              <input
                value={form.nombre}
                onChange={(e) => { set("nombre", e.target.value); clearError("nombre"); }}
                placeholder="Casa Residencial Los Pinos"
                className={bareInput}
              />
            </div>
            {hasError("nombre") && (
              <p className="mt-1.5 ml-1 text-xs font-medium text-red-500">Este campo es obligatorio.</p>
            )}
          </div>

          {/* Tipo — segmented selector with icons */}
          <div className="sm:col-span-2">
            <label className={fieldLabel}>Tipo de propiedad *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TIPO_OPTIONS.map(({ value, label, icon: Icon }) => {
                const activo = form.tipo === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set("tipo", value)}
                    className={`flex flex-col items-center gap-2 rounded-2xl border px-3 py-3 transition-all duration-200 ${
                      activo
                        ? "border-cobalt bg-cobalt/5 shadow-[0_6px_18px_-10px_rgba(28,55,140,0.45)]"
                        : "border-border/70 hover:border-cobalt/30 bg-white"
                    }`}
                  >
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                        activo ? "bg-cobalt text-white" : "text-gold"
                      }`}
                    >
                      <Icon size={22} strokeWidth={2.1} />
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        activo ? "text-cobalt" : "text-foreground/65"
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tipo de oferta — segmented pills */}
          <div className="sm:col-span-2">
            <label className={fieldLabel}>Tipo de oferta *</label>
            <div className="grid grid-cols-3 gap-2">
              {OFERTA_OPTIONS.map(({ value, label }) => {
                const activo = (form.tipo_oferta || "") === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set("tipo_oferta", value)}
                    className={`flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-3 text-xs font-bold uppercase tracking-wide transition-all duration-200 ${
                      activo
                        ? "border-cobalt bg-cobalt text-white shadow-[0_8px_20px_-10px_rgba(28,55,140,0.55)]"
                        : "border-border/70 bg-white text-foreground/55 hover:border-cobalt/30 hover:text-cobalt"
                    }`}
                  >
                    {activo && <Tag size={12} className="text-gold" />}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Estado */}
          <div ref={estadoRef}>
            <label className={fieldLabel}>
              Estado <RequiredMark />
            </label>
            <div className={`${fieldBox} ${hasError("estado") ? errorBoxClass : ""}`}>
              <MapPin size={16} className={hasError("estado") ? "text-red-400 flex-shrink-0" : "text-gold flex-shrink-0"} />
              <select
                value={form.estado}
                onChange={(e) => {
                  // Changing the state resets the municipio (it no longer belongs).
                  setForm((prev) => ({ ...prev, estado: e.target.value, municipio: "" }));
                  setShowAllMunicipios(false);
                  clearError("estado");
                }}
                className={`${bareInput} cursor-pointer appearance-none pr-5 ${form.estado ? "" : "text-muted-foreground/50"}`}
              >
                <option value="">Selecciona un estado</option>
                <option value="Tlaxcala">Tlaxcala</option>
                <option value="Puebla">Puebla</option>
              </select>
            </div>
            {hasError("estado") && (
              <p className="mt-1.5 ml-1 text-xs font-medium text-red-500">Selecciona un estado.</p>
            )}
          </div>

          {/* Municipio — selector dependiente del estado */}
          <div ref={municipioRef}>
            <label className={fieldLabel}>
              Municipio <RequiredMark />
            </label>
            <div className={`${fieldBox} ${hasError("municipio") ? errorBoxClass : ""} ${!form.estado ? "opacity-60" : ""}`}>
              <MapPin size={16} className={hasError("municipio") ? "text-red-400 flex-shrink-0" : "text-gold flex-shrink-0"} />
              <select
                value={form.municipio}
                disabled={!form.estado}
                onChange={(e) => { set("municipio", e.target.value); clearError("municipio"); }}
                className={`${bareInput} cursor-pointer appearance-none pr-5 disabled:cursor-not-allowed ${form.municipio ? "" : "text-muted-foreground/50"}`}
              >
                <option value="">
                  {form.estado ? "Selecciona un municipio" : "Elige un estado primero"}
                </option>
                {municipioOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            {hasError("municipio") && (
              <p className="mt-1.5 ml-1 text-xs font-medium text-red-500">Selecciona un municipio.</p>
            )}
            {/* Puebla: toggle between main municipios and the full 217 list */}
            {isPuebla && (
              <button
                type="button"
                onClick={() => setShowAllMunicipios((v) => !v)}
                className="mt-2 ml-1 text-xs font-semibold text-cobalt hover:text-cobalt-light underline underline-offset-2 transition-colors"
              >
                {showAllMunicipios
                  ? "Ver solo los municipios principales"
                  : `Ver todos los municipios (${fullMunicipioList.length})`}
              </button>
            )}
          </div>

          {/* Zona / Comunidad */}
          <div>
            <label className={fieldLabel}>Zona o comunidad</label>
            <div className={fieldBox}>
              <MapPin size={16} className="text-gold flex-shrink-0" />
              <input
                value={form.zona}
                onChange={(e) => set("zona", e.target.value)}
                placeholder="Col. Centro, Barrio San José…"
                className={bareInput}
              />
            </div>
          </div>

          {/* Código postal */}
          <div>
            <label className={fieldLabel}>Código postal</label>
            <div className={fieldBox}>
              <MapPin size={16} className="text-gold flex-shrink-0" />
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={form.codigo_postal || ""}
                onChange={(e) =>
                  set("codigo_postal", e.target.value.replace(/[^0-9]/g, ""))
                }
                placeholder="90000"
                className={`${bareInput} tabular-nums`}
              />
            </div>
          </div>

          {/* Dirección */}
          <div ref={direccionRef}>
            <label className={fieldLabel}>
              Dirección <RequiredMark />
            </label>
            <div className={`${fieldBox} ${hasError("direccion") ? errorBoxClass : ""}`}>
              <Navigation size={16} className={hasError("direccion") ? "text-red-400 flex-shrink-0" : "text-gold flex-shrink-0"} />
              <input
                value={form.direccion || ""}
                onChange={(e) => { set("direccion", e.target.value); clearError("direccion"); }}
                placeholder="Av. Juárez 145, Col. Centro"
                className={bareInput}
              />
            </div>
            {hasError("direccion") && (
              <p className="mt-1.5 ml-1 text-xs font-medium text-red-500">Este campo es obligatorio.</p>
            )}
          </div>
        </div>
      </div>

      {/* Section: Detalles */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1 bg-border/60" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Detalles</span>
          <div className="h-px flex-1 bg-border/60" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
          {/* Precio — formatted display, raw number stored */}
          <div className="sm:col-span-2" ref={precioRef}>
            <label className={fieldLabel}>
              Precio (MXN) <RequiredMark />
            </label>
            <div className={`${fieldBox} ${hasError("precio") ? errorBoxClass : ""}`}>
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg font-heading text-base font-bold flex-shrink-0 ${hasError("precio") ? "bg-red-500/10 text-red-400" : "bg-gold/10 text-gold"}`}>
                $
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={precioDisplay}
                onChange={(e) => { handlePrecioChange(e.target.value); clearError("precio"); }}
                placeholder="1,500,000"
                className={`${bareInput} tabular-nums text-base font-semibold`}
              />
              {precioDisplay && (
                <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/50 flex-shrink-0">
                  MXN
                </span>
              )}
            </div>
            {hasError("precio") && (
              <p className="mt-1.5 ml-1 text-xs font-medium text-red-500">Ingresa un precio válido.</p>
            )}
          </div>

          {/* Recámaras — stepper */}
          <Stepper
            label="Recámaras"
            icon={BedDouble}
            value={form.recamaras}
            onChange={(v) => set("recamaras", v)}
          />

          {/* Baños — stepper */}
          <Stepper
            label="Baños"
            icon={Bath}
            value={form.banos}
            onChange={(v) => set("banos", v)}
          />

          {/* Metros² */}
          <div className="sm:col-span-2" ref={superficieRef}>
            <label className={fieldLabel}>
              Superficie <RequiredMark />
            </label>
            <div className={`${fieldBox} ${hasError("superficie") ? errorBoxClass : ""}`}>
              <Ruler size={16} className={hasError("superficie") ? "text-red-400 flex-shrink-0" : "text-gold flex-shrink-0"} />
              <input
                type="text"
                inputMode="numeric"
                value={form.metros_cuadrados || ""}
                onChange={(e) => {
                  set("metros_cuadrados", parseNum(e.target.value));
                  clearError("superficie");
                }}
                placeholder="120"
                className={`${bareInput} tabular-nums`}
              />
              <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/50 flex-shrink-0">
                m²
              </span>
            </div>
            {hasError("superficie") && (
              <p className="mt-1.5 ml-1 text-xs font-medium text-red-500">Ingresa la superficie en m².</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className="flex items-center gap-3 bg-muted/40 rounded-lg px-4 py-3">
            <input
              type="checkbox"
              id="acepta_credito"
              checked={form.acepta_credito}
              onChange={(e) => {
                const checked = e.target.checked;
                setForm((prev) => ({
                  ...prev,
                  acepta_credito: checked,
                  // Without credit the property is cash-only — force "contado".
                  tipos_credito: checked ? prev.tipos_credito : "contado",
                }));
              }}
              className="w-4 h-4 accent-cobalt rounded"
            />
            <label htmlFor="acepta_credito" className="text-sm text-foreground">
              Acepta crédito
            </label>
          </div>
          <div className="flex items-center gap-3 bg-muted/40 rounded-lg px-4 py-3">
            <input
              type="checkbox"
              id="disponible"
              checked={form.disponible}
              onChange={(e) => set("disponible", e.target.checked)}
              className="w-4 h-4 accent-emerald-600 rounded"
            />
            <label htmlFor="disponible" className="text-sm text-foreground">
              Disponible
            </label>
          </div>
        </div>

        <div className="mt-4">
          <label className={labelClass}>Tipos de crédito</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {["bancario", "infonavit", "fovissste"].map((tipo) => {
              const selected = (form.tipos_credito || "").split(",").map((s) => s.trim().toLowerCase()).includes(tipo);
              const disabled = !form.acepta_credito;
              return (
                <button
                  key={tipo}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    const current = (form.tipos_credito || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
                    const next = selected ? current.filter((t) => t !== tipo) : [...current, tipo];
                    set("tipos_credito", next.join(", "));
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                    disabled
                      ? "bg-muted/40 text-muted-foreground/40 border-border/40 cursor-not-allowed"
                      : selected
                        ? "bg-cobalt/10 text-cobalt border-cobalt/30"
                        : "bg-white text-muted-foreground border-border/60 hover:bg-muted/50"
                  }`}
                >
                  {tipo}
                </button>
              );
            })}
            {(() => {
              const isContado = (form.tipos_credito || "").split(",").map((s) => s.trim().toLowerCase()).includes("contado");
              const cashOnly = !form.acepta_credito;
              return (
                <button
                  type="button"
                  // When credit is off "contado" is locked on — it can't be toggled.
                  disabled={cashOnly}
                  onClick={() => {
                    const current = (form.tipos_credito || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
                    const next = isContado ? current.filter((t) => t !== "contado") : [...current, "contado"];
                    set("tipos_credito", next.join(", "));
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold border-2 transition-all duration-200 ${
                    isContado
                      ? "bg-emerald-500/10 text-emerald-700 border-emerald-400"
                      : "bg-white text-emerald-700 border-emerald-300/50 hover:bg-emerald-50"
                  } ${cashOnly ? "cursor-not-allowed" : ""}`}
                >
                  contado
                </button>
              );
            })()}
          </div>

          {/* Cash-only notice — shown when "Acepta crédito" is unchecked */}
          {!form.acepta_credito && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-300/60 bg-amber-50 px-3.5 py-3">
              <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-px" />
              <p className="text-xs text-amber-900/80 leading-relaxed">
                Esta propiedad estará disponible <strong className="font-bold">solo al contado</strong>.
                Las opciones de crédito (bancario, Infonavit, Fovissste) quedan deshabilitadas
                hasta que actives <strong className="font-bold">"Acepta crédito"</strong>.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Section: Foto principal */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1 bg-border/60" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Foto Portada</span>
          <div className="h-px flex-1 bg-border/60" />
        </div>

        <div className="flex items-center gap-4">
          {/* Preview */}
          <div
            onClick={() => mainFileRef.current?.click()}
            className="relative w-28 h-28 rounded-xl border-2 border-dashed border-border/80 overflow-hidden cursor-pointer hover:border-cobalt/40 transition-colors flex-shrink-0 group"
          >
            {portadaUrl ? (
              <>
                <img src={portadaUrl} alt="Portada" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={20} className="text-white" />
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/40">
                {uploadingMain ? (
                  <Loader2 size={22} className="animate-spin" />
                ) : (
                  <>
                    <Upload size={22} />
                    <span className="text-[9px] font-semibold mt-1 uppercase">Subir</span>
                  </>
                )}
              </div>
            )}
          </div>
          <input
            ref={mainFileRef}
            type="file"
            accept="image/*"
            onChange={handleMainPhotoUpload}
            className="hidden"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground/70 font-medium mb-1">
              {portadaUrl ? "Foto de portada cargada" : "Sin foto de portada"}
            </p>
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
              Esta imagen aparece como la foto principal en la tarjeta de la propiedad. Click en el recuadro para {portadaUrl ? "cambiarla" : "subirla"}.
            </p>
          </div>
        </div>
      </div>

      {/* Section: Descripción */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1 bg-border/60" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Descripción</span>
          <div className="h-px flex-1 bg-border/60" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2" ref={descripcionRef}>
            <label className={fieldLabel}>
              Descripción <RequiredMark />
            </label>
            <textarea
              rows={3}
              value={form.descripcion || ""}
              onChange={(e) => { set("descripcion", e.target.value); clearError("descripcion"); }}
              placeholder="Describe la propiedad..."
              className={`${inputClass} resize-none rounded-2xl ${
                hasError("descripcion")
                  ? "border-red-400 ring-4 ring-red-500/10 focus:ring-red-500/15 focus:border-red-400"
                  : ""
              }`}
            />
            {hasError("descripcion") && (
              <p className="mt-1.5 ml-1 text-xs font-medium text-red-500">Este campo es obligatorio.</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Asesor asignado</label>
            <div className="flex items-center gap-2 w-full border border-border/60 rounded-lg px-4 py-2.5 bg-muted/40">
              <Lock size={13} className="text-muted-foreground/50 flex-shrink-0" />
              <span className="text-sm font-medium text-foreground/80 truncate">
                {form.asesor_asignado || advisorName || "—"}
              </span>
              <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/50 flex-shrink-0">
                Automático
              </span>
            </div>
          </div>
          <div>
            <label className={labelClass}>Observaciones</label>
            <input
              value={form.observaciones || ""}
              onChange={(e) => set("observaciones", e.target.value)}
              placeholder="Notas internas..."
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Section: Galería */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1 bg-border/60" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Galería de Fotos</span>
          <div className="h-px flex-1 bg-border/60" />
        </div>
        <GalleryUpload
          fotos={(form.galeria || []).filter((f) => f.categoria !== "portada")}
          onChange={(fotos: GaleriaFoto[]) => {
            const portada = (form.galeria || []).filter((f) => f.categoria === "portada");
            set("galeria", [...portada, ...fotos]);
          }}
          propiedadId={initial?.id}
        />
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-border/60">
        {/* Missing-fields legend */}
        {errors.length > 0 && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-300/70 bg-red-50 px-4 py-3">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-px" />
            <p className="text-xs text-red-700/90 leading-relaxed">
              Faltan campos obligatorios por llenar. Revisa los campos marcados
              en rojo antes de {initial ? "guardar los cambios" : "crear la propiedad"}.
            </p>
          </div>
        )}
        <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-cobalt text-white font-semibold text-xs px-7 py-3 rounded-lg hover:bg-cobalt-light transition-colors disabled:opacity-70 shadow-sm"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {initial ? "Guardar Cambios" : "Crear Propiedad"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-5 py-3 rounded-lg hover:bg-muted"
        >
          Cancelar
        </button>
        </div>
      </div>
    </form>
  );
};

/* ── Stepper — friendly +/- control for integer counts ── */
interface StepperProps {
  label: string;
  icon: LucideIcon;
  value: number;
  onChange: (v: number) => void;
}

const Stepper = ({ label, icon: Icon, value, onChange }: StepperProps) => (
  <div>
    <label className="block text-sm font-semibold text-foreground/75 mb-2 ml-1">
      {label}
    </label>
    <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-white px-2.5 py-2 transition-all duration-200 hover:border-cobalt/30">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value <= 0}
        aria-label={`Quitar ${label.toLowerCase()}`}
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-foreground/70 transition-colors hover:bg-cobalt hover:text-white disabled:opacity-40 disabled:hover:bg-muted disabled:hover:text-foreground/70"
      >
        <Minus size={15} strokeWidth={2.6} />
      </button>
      <span className="flex items-center gap-2">
        <Icon size={16} className="text-gold" strokeWidth={2.2} />
        <span className="font-heading text-xl font-extrabold text-cobalt tabular-nums w-7 text-center">
          {value}
        </span>
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label={`Agregar ${label.toLowerCase()}`}
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-foreground/70 transition-colors hover:bg-cobalt hover:text-white"
      >
        <Plus size={15} strokeWidth={2.6} />
      </button>
    </div>
  </div>
);

export default PropertyForm;
