import { useState, useEffect, useRef } from "react";
import { Save, Loader2, Upload } from "lucide-react";
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

interface PropertyFormProps {
  initial?: Propiedad | null;
  onSubmit: (data: PropiedadForm) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

const PropertyForm = ({ initial, onSubmit, onCancel, loading }: PropertyFormProps) => {
  const [form, setForm] = useState<PropiedadForm>(emptyForm);
  const [uploadingMain, setUploadingMain] = useState(false);
  const mainFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initial) {
      const { id, fecha_publicacion, ...rest } = initial;
      setForm({ ...rest, galeria: rest.galeria || [] });
    } else {
      setForm(emptyForm);
    }
  }, [initial]);

  const set = (field: keyof PropiedadForm, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const portadaUrl = form.galeria?.find((f) => f.categoria === "portada")?.url || null;

  const handleMainPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMain(true);
    try {
      const url = await uploadImage(file, "portada", initial?.id);
      // Replace existing portada or add new one at the beginning
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
    "w-full border border-border rounded px-4 py-2.5 text-base sm:text-sm bg-transparent text-foreground outline-none focus:ring-2 focus:ring-cobalt/30 placeholder:text-muted-foreground";
  const labelClass = "block text-sm font-medium text-foreground mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Nombre */}
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

        {/* Tipo */}
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

        {/* Tipo oferta */}
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

        {/* Zona */}
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

        {/* Dirección */}
        <div>
          <label className={labelClass}>Dirección</label>
          <input
            value={form.direccion || ""}
            onChange={(e) => set("direccion", e.target.value)}
            placeholder="Av. Juárez 145, Col. Centro"
            className={inputClass}
          />
        </div>

        {/* Precio */}
        <div>
          <label className={labelClass}>Precio (MXN) *</label>
          <input
            required
            type="number"
            min={0}
            value={form.precio || ""}
            onChange={(e) => set("precio", Number(e.target.value))}
            placeholder="1500000"
            className={inputClass}
          />
        </div>

        {/* Recámaras */}
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

        {/* Baños */}
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

        {/* Metros cuadrados */}
        <div>
          <label className={labelClass}>Metros cuadrados</label>
          <input
            type="number"
            min={0}
            value={form.metros_cuadrados || ""}
            onChange={(e) => set("metros_cuadrados", Number(e.target.value))}
            className={inputClass}
          />
        </div>

        {/* Acepta crédito */}
        <div className="flex items-center gap-3 pt-6">
          <input
            type="checkbox"
            id="acepta_credito"
            checked={form.acepta_credito}
            onChange={(e) => set("acepta_credito", e.target.checked)}
            className="w-4 h-4 accent-cobalt"
          />
          <label htmlFor="acepta_credito" className="text-sm font-medium text-foreground">
            Acepta crédito
          </label>
        </div>

        {/* Disponible */}
        <div className="flex items-center gap-3 pt-6">
          <input
            type="checkbox"
            id="disponible"
            checked={form.disponible}
            onChange={(e) => set("disponible", e.target.checked)}
            className="w-4 h-4 accent-cobalt"
          />
          <label htmlFor="disponible" className="text-sm font-medium text-foreground">
            Disponible
          </label>
        </div>

        {/* Tipos de crédito */}
        <div className="sm:col-span-2">
          <label className={labelClass}>Tipos de crédito</label>
          <input
            value={form.tipos_credito || ""}
            onChange={(e) => set("tipos_credito", e.target.value)}
            placeholder="bancario, infonavit, fovissste, contado"
            className={inputClass}
          />
        </div>

        {/* Foto principal — upload */}
        <div className="sm:col-span-2">
          <label className={labelClass}>Foto principal (portada)</label>
          <div className="flex items-center gap-4">
            {portadaUrl && (
              <img
                src={portadaUrl}
                alt="Portada"
                className="w-20 h-20 rounded object-cover border border-border"
              />
            )}
            <div className="flex-1">
              <input
                ref={mainFileRef}
                type="file"
                accept="image/*"
                onChange={handleMainPhotoUpload}
                className="hidden"
                id="main-photo-upload"
              />
              <button
                type="button"
                disabled={uploadingMain}
                onClick={() => mainFileRef.current?.click()}
                className="flex items-center gap-2 border-2 border-dashed border-border rounded px-4 py-2 text-sm text-muted-foreground hover:border-cobalt hover:text-cobalt transition-colors disabled:opacity-60"
              >
                {uploadingMain ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )}
                {uploadingMain ? "Subiendo..." : portadaUrl ? "Cambiar foto" : "Subir foto principal"}
              </button>
              {portadaUrl && (
                <p className="text-xs text-muted-foreground mt-1 truncate max-w-md">
                  {portadaUrl}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div className="sm:col-span-2">
          <label className={labelClass}>Descripción</label>
          <textarea
            rows={3}
            value={form.descripcion || ""}
            onChange={(e) => set("descripcion", e.target.value)}
            placeholder="Describe la propiedad..."
            className={inputClass + " resize-none"}
          />
        </div>

        {/* Asesor */}
        <div>
          <label className={labelClass}>Asesor asignado</label>
          <input
            value={form.asesor_asignado || ""}
            onChange={(e) => set("asesor_asignado", e.target.value)}
            placeholder="Manuel Díaz"
            className={inputClass}
          />
        </div>

        {/* Observaciones */}
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

      {/* Galería de fotos */}
      <div className="border-t border-border pt-5">
        <GalleryUpload
          fotos={form.galeria || []}
          onChange={(fotos: GaleriaFoto[]) => set("galeria", fotos)}
          propiedadId={initial?.id}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-cobalt text-primary-foreground font-semibold text-sm px-6 py-2.5 rounded hover:bg-cobalt-light transition-colors disabled:opacity-70"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {initial ? "Guardar Cambios" : "Crear Propiedad"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2.5"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};

export default PropertyForm;
