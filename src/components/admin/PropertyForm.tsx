import { useState, useEffect, useRef } from "react";
import { Save, Loader2, Upload, Camera } from "lucide-react";
import { uploadImage } from "@/lib/uploadImage";
import GalleryUpload from "@/components/admin/GalleryUpload";
import type { Propiedad, GaleriaFoto } from "@/types";

type PropiedadForm = Omit<Propiedad, "id" | "fecha_publicacion">;

const emptyForm: PropiedadForm = {
  nombre: "",
  tipo: "casa",
  zona: "",
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
}

const PropertyForm = ({ initial, onSubmit, onCancel, loading }: PropertyFormProps) => {
  const [form, setForm] = useState<PropiedadForm>(emptyForm);
  const [precioDisplay, setPrecioDisplay] = useState("");
  const [uploadingMain, setUploadingMain] = useState(false);
  const mainFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initial) {
      const { id, fecha_publicacion, ...rest } = initial;
      setForm({ ...rest, galeria: rest.galeria || [] });
      setPrecioDisplay(formatNum(rest.precio));
    } else {
      setForm(emptyForm);
      setPrecioDisplay("");
    }
  }, [initial]);

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
    onSubmit(form);
  };

  const inputClass =
    "w-full border border-border/80 rounded-lg px-4 py-2.5 text-base sm:text-sm bg-white text-foreground outline-none focus:ring-2 focus:ring-cobalt/20 focus:border-cobalt/40 placeholder:text-muted-foreground/50 transition-all";
  const labelClass = "block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section: Info básica */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1 bg-border/60" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Información</span>
          <div className="h-px flex-1 bg-border/60" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nombre de la propiedad *</label>
            <input
              required
              value={form.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              placeholder="Casa Residencial Los Pinos"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Tipo *</label>
            <select
              value={form.tipo}
              onChange={(e) => set("tipo", e.target.value)}
              className={inputClass + " appearance-none cursor-pointer"}
            >
              <option value="casa">Casa</option>
              <option value="departamento">Departamento</option>
              <option value="local">Local</option>
              <option value="terreno">Terreno</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Tipo de oferta *</label>
            <select
              value={form.tipo_oferta || ""}
              onChange={(e) => set("tipo_oferta", e.target.value)}
              className={inputClass + " appearance-none cursor-pointer"}
            >
              <option value="VENTA">Venta</option>
              <option value="RENTA">Renta</option>
              <option value="RENTA Y VENTA">Renta y Venta</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Zona *</label>
            <input
              required
              value={form.zona}
              onChange={(e) => set("zona", e.target.value)}
              placeholder="Tlaxcala Centro"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Dirección</label>
            <input
              value={form.direccion || ""}
              onChange={(e) => set("direccion", e.target.value)}
              placeholder="Av. Juárez 145, Col. Centro"
              className={inputClass}
            />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Precio — formatted display, raw number stored */}
          <div className="sm:col-span-2 lg:col-span-1">
            <label className={labelClass}>Precio (MXN) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/60 font-medium">$</span>
              <input
                required
                type="text"
                inputMode="numeric"
                value={precioDisplay}
                onChange={(e) => handlePrecioChange(e.target.value)}
                placeholder="1,500,000"
                className={inputClass + " pl-7 tabular-nums"}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Recámaras</label>
            <input
              type="number"
              min={0}
              value={form.recamaras}
              onChange={(e) => set("recamaras", Number(e.target.value))}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Baños</label>
            <input
              type="number"
              min={0}
              value={form.banos}
              onChange={(e) => set("banos", Number(e.target.value))}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Metros²</label>
            <input
              type="number"
              min={0}
              value={form.metros_cuadrados || ""}
              onChange={(e) => set("metros_cuadrados", Number(e.target.value))}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className="flex items-center gap-3 bg-muted/40 rounded-lg px-4 py-3">
            <input
              type="checkbox"
              id="acepta_credito"
              checked={form.acepta_credito}
              onChange={(e) => set("acepta_credito", e.target.checked)}
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
              return (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => {
                    const current = (form.tipos_credito || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
                    const next = selected ? current.filter((t) => t !== tipo) : [...current, tipo];
                    set("tipos_credito", next.join(", "));
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                    selected
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
              return (
                <button
                  type="button"
                  onClick={() => {
                    const current = (form.tipos_credito || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
                    const next = isContado ? current.filter((t) => t !== "contado") : [...current, "contado"];
                    set("tipos_credito", next.join(", "));
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold border-2 transition-all duration-200 ${
                    isContado
                      ? "bg-emerald-500/10 text-emerald-700 border-emerald-400"
                      : "bg-white text-emerald-700 border-emerald-300/50 hover:bg-emerald-50"
                  }`}
                >
                  contado
                </button>
              );
            })()}
          </div>
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
          <div className="sm:col-span-2">
            <textarea
              rows={3}
              value={form.descripcion || ""}
              onChange={(e) => set("descripcion", e.target.value)}
              placeholder="Describe la propiedad..."
              className={inputClass + " resize-none"}
            />
          </div>
          <div>
            <label className={labelClass}>Asesor asignado</label>
            <input
              value={form.asesor_asignado || ""}
              onChange={(e) => set("asesor_asignado", e.target.value)}
              placeholder="Manuel Díaz"
              className={inputClass}
            />
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
      <div className="flex gap-3 pt-4 border-t border-border/60">
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
    </form>
  );
};

export default PropertyForm;
