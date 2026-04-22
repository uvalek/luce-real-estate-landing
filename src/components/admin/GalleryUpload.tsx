import { useState, useRef } from "react";
import {
  Upload,
  X,
  Loader2,
  ImagePlus,
  Home,
  UtensilsCrossed,
  BedDouble,
  Bath,
  Sofa,
  TreePine,
  Car,
  Sun,
  Fence,
  MoreHorizontal,
  Armchair,
  Check,
  Camera,
  ArrowRight,
} from "lucide-react";
import { uploadImage } from "@/lib/uploadImage";
import type { GaleriaFoto } from "@/types";

const CATEGORIAS = [
  { value: "fachada",  label: "Fachada",  icon: Home,              solid: "bg-blue-500",    soft: "bg-blue-50 text-blue-700 border-blue-200",       ring: "ring-blue-400/50"   },
  { value: "sala",     label: "Sala",     icon: Sofa,              solid: "bg-purple-500",  soft: "bg-purple-50 text-purple-700 border-purple-200", ring: "ring-purple-400/50" },
  { value: "cocina",   label: "Cocina",   icon: UtensilsCrossed,   solid: "bg-orange-500",  soft: "bg-orange-50 text-orange-700 border-orange-200", ring: "ring-orange-400/50" },
  { value: "recamara", label: "Recámara", icon: BedDouble,         solid: "bg-indigo-500",  soft: "bg-indigo-50 text-indigo-700 border-indigo-200", ring: "ring-indigo-400/50" },
  { value: "bano",     label: "Baño",     icon: Bath,              solid: "bg-cyan-500",    soft: "bg-cyan-50 text-cyan-700 border-cyan-200",       ring: "ring-cyan-400/50"   },
  { value: "comedor",  label: "Comedor",  icon: Armchair,          solid: "bg-amber-500",   soft: "bg-amber-50 text-amber-800 border-amber-200",    ring: "ring-amber-400/50"  },
  { value: "jardin",   label: "Jardín",   icon: TreePine,          solid: "bg-emerald-500", soft: "bg-emerald-50 text-emerald-700 border-emerald-200", ring: "ring-emerald-400/50" },
  { value: "cochera",  label: "Cochera",  icon: Car,               solid: "bg-slate-500",   soft: "bg-slate-50 text-slate-700 border-slate-200",    ring: "ring-slate-400/50"  },
  { value: "terraza",  label: "Terraza",  icon: Sun,               solid: "bg-yellow-500",  soft: "bg-yellow-50 text-yellow-800 border-yellow-200", ring: "ring-yellow-400/50" },
  { value: "patio",    label: "Patio",    icon: Fence,             solid: "bg-lime-500",    soft: "bg-lime-50 text-lime-800 border-lime-200",       ring: "ring-lime-400/50"   },
  { value: "otro",     label: "Otro",     icon: MoreHorizontal,    solid: "bg-gray-500",    soft: "bg-gray-50 text-gray-700 border-gray-200",       ring: "ring-gray-400/50"   },
];

interface GalleryUploadProps {
  fotos: GaleriaFoto[];
  onChange: (fotos: GaleriaFoto[]) => void;
  propiedadId?: number;
}

const GalleryUpload = ({ fotos, onChange, propiedadId }: GalleryUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState("fachada");
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedCat = CATEGORIAS.find((c) => c.value === selectedCategoria) || CATEGORIAS[0];
  const SelectedIcon = selectedCat.icon;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newFotos: GaleriaFoto[] = [...fotos];

    for (const file of Array.from(files)) {
      try {
        const url = await uploadImage(file, selectedCategoria, propiedadId);
        newFotos.push({ url, categoria: selectedCategoria });
      } catch (err) {
        console.error(err);
        alert(`Error al subir ${file.name}: ${(err as Error).message}`);
      }
    }

    onChange(newFotos);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleRemove = (index: number) => {
    const updated = fotos.filter((_, i) => i !== index);
    onChange(updated);
  };

  // Group photos by category for organized display
  const grouped = CATEGORIAS.map((cat) => ({
    ...cat,
    photos: fotos
      .map((f, idx) => ({ ...f, originalIndex: idx }))
      .filter((f) => f.categoria === cat.value),
  })).filter((g) => g.photos.length > 0);

  const totalFotos = fotos.length;

  return (
    <div className="space-y-6">
      {/* ── STEP 1: Category picker ─────────────────────────────── */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-white to-muted/30 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-cobalt text-white text-[11px] font-bold">1</div>
          <h4 className="text-sm font-bold text-foreground">Elige la categoría</h4>
          <span className="ml-auto text-[10px] text-muted-foreground/60 font-medium">
            {totalFotos} foto{totalFotos !== 1 ? "s" : ""} en galería
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {CATEGORIAS.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategoria === cat.value;
            const count = fotos.filter((f) => f.categoria === cat.value).length;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setSelectedCategoria(cat.value)}
                className={`relative flex flex-col items-center justify-center gap-1.5 px-2 py-3.5 rounded-xl border-2 transition-all duration-200 ${
                  isActive
                    ? `${cat.soft} border-current shadow-md ring-4 ${cat.ring} scale-[1.03]`
                    : "bg-white text-muted-foreground border-border/50 hover:border-border hover:bg-muted/30"
                }`}
              >
                <Icon size={20} />
                <span className="text-[11px] font-bold leading-tight">{cat.label}</span>
                {count > 0 && (
                  <span
                    className={`absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center shadow-sm ${
                      isActive ? `${cat.solid} text-white` : "bg-foreground/80 text-white"
                    }`}
                  >
                    {count}
                  </span>
                )}
                {isActive && (
                  <span className={`absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full ${cat.solid} text-white flex items-center justify-center shadow-sm`}>
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── STEP 2: Confirmation banner + Upload ─────────────────── */}
      <div className="rounded-2xl border border-border/60 overflow-hidden">
        {/* Banner — impossible to miss what category you're about to upload to */}
        <div className={`relative ${selectedCat.solid} text-white px-5 py-4 flex items-center gap-4`}>
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm ring-2 ring-white/30">
            <SelectedIcon size={24} strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Subiendo como</p>
            <p className="text-xl font-heading font-bold leading-tight">{selectedCat.label}</p>
          </div>
          <ArrowRight size={20} className="text-white/60 flex-shrink-0 hidden sm:block" />
        </div>

        {/* Drop zone */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          className="hidden"
          id="gallery-upload"
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-muted/40 px-6 py-6 transition-all duration-200 disabled:opacity-60 group"
        >
          {uploading ? (
            <>
              <Loader2 size={22} className="animate-spin text-cobalt" />
              <span className="text-sm font-semibold text-foreground">Subiendo fotos de {selectedCat.label}...</span>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-cobalt group-hover:text-white transition-colors">
                <Upload size={18} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-foreground">Haz clic para seleccionar fotos</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                  Se guardarán todas como <span className="font-semibold text-foreground/80">"{selectedCat.label}"</span> — puedes subir varias a la vez
                </p>
              </div>
            </>
          )}
        </button>
      </div>

      {/* ── Gallery grid, grouped by category ───────────────────── */}
      {grouped.length > 0 ? (
        <div className="space-y-5">
          {grouped.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.value} className="rounded-xl border border-border/50 bg-white overflow-hidden">
                <div className={`flex items-center gap-3 px-4 py-2.5 border-b border-border/40 ${group.soft}`}>
                  <div className={`w-7 h-7 rounded-lg ${group.solid} text-white flex items-center justify-center`}>
                    <Icon size={14} />
                  </div>
                  <h5 className="text-sm font-bold">{group.label}</h5>
                  <span className="text-[11px] opacity-70 font-semibold">
                    {group.photos.length} foto{group.photos.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 p-3">
                  {group.photos.map((foto) => (
                    <div
                      key={foto.originalIndex}
                      className="relative group rounded-lg overflow-hidden border border-border/40 aspect-square bg-muted"
                    >
                      <img
                        src={foto.url}
                        alt={foto.categoria}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <button
                        type="button"
                        onClick={() => handleRemove(foto.originalIndex)}
                        className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200"
                        aria-label="Eliminar foto"
                      >
                        <X size={11} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-14 border-2 border-dashed border-border/50 rounded-2xl text-muted-foreground/50 bg-muted/10">
          <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center mb-3">
            <ImagePlus size={26} />
          </div>
          <p className="text-sm font-semibold text-foreground/70">La galería está vacía</p>
          <p className="text-xs mt-1">Selecciona una categoría arriba y sube tus primeras fotos</p>
        </div>
      )}

      {/* Helper tip */}
      <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50/60 border border-amber-200/60 rounded-lg">
        <Camera size={14} className="text-amber-700 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-amber-900/80 leading-relaxed">
          <span className="font-semibold">Tip:</span> Antes de arrastrar o seleccionar una foto, verifica que la <span className="font-semibold">categoría resaltada arriba</span> sea la correcta. Puedes cambiar de categoría y seguir agregando fotos en la misma sesión.
        </p>
      </div>
    </div>
  );
};

export default GalleryUpload;
