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
} from "lucide-react";
import { uploadImage } from "@/lib/uploadImage";
import type { GaleriaFoto } from "@/types";

const CATEGORIAS = [
  { value: "fachada", label: "Fachada", icon: Home, color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  { value: "sala", label: "Sala", icon: Sofa, color: "bg-purple-500/10 text-purple-600 border-purple-200" },
  { value: "cocina", label: "Cocina", icon: UtensilsCrossed, color: "bg-orange-500/10 text-orange-600 border-orange-200" },
  { value: "recamara", label: "Recámara", icon: BedDouble, color: "bg-indigo-500/10 text-indigo-600 border-indigo-200" },
  { value: "bano", label: "Baño", icon: Bath, color: "bg-cyan-500/10 text-cyan-600 border-cyan-200" },
  { value: "comedor", label: "Comedor", icon: Armchair, color: "bg-amber-500/10 text-amber-700 border-amber-200" },
  { value: "jardin", label: "Jardín", icon: TreePine, color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  { value: "cochera", label: "Cochera", icon: Car, color: "bg-slate-500/10 text-slate-600 border-slate-200" },
  { value: "terraza", label: "Terraza", icon: Sun, color: "bg-yellow-500/10 text-yellow-700 border-yellow-200" },
  { value: "patio", label: "Patio", icon: Fence, color: "bg-lime-500/10 text-lime-700 border-lime-200" },
  { value: "otro", label: "Otro", icon: MoreHorizontal, color: "bg-gray-500/10 text-gray-600 border-gray-200" },
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

  return (
    <div className="space-y-5">
      {/* Category selector — visual chips */}
      <div>
        <p className="text-xs font-semibold text-foreground/70 mb-3 uppercase tracking-wide">
          Selecciona categoría para subir
        </p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategoria === cat.value;
            const count = fotos.filter((f) => f.categoria === cat.value).length;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setSelectedCategoria(cat.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                  isActive
                    ? cat.color + " border-current shadow-sm scale-[1.02]"
                    : "bg-white text-muted-foreground border-border/60 hover:bg-muted/50"
                }`}
              >
                <Icon size={14} />
                {cat.label}
                {count > 0 && (
                  <span className={`ml-0.5 text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center ${
                    isActive ? "bg-white/60" : "bg-muted"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Upload zone — shows selected category context */}
      <div className="relative">
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
          className={`w-full flex items-center justify-center gap-3 border-2 border-dashed rounded-xl px-6 py-5 transition-all duration-200 disabled:opacity-60 ${selectedCat.color.replace("bg-", "hover:bg-")} hover:border-current border-border/60`}
        >
          {uploading ? (
            <Loader2 size={20} className="animate-spin text-cobalt" />
          ) : (
            <Upload size={20} className="text-muted-foreground" />
          )}
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">
              {uploading ? "Subiendo fotos..." : `Subir fotos de ${selectedCat.label}`}
            </p>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">
              Click para seleccionar archivos — se guardarán como "{selectedCat.label}"
            </p>
          </div>
        </button>
      </div>

      {/* Photos grouped by category */}
      {grouped.length > 0 ? (
        <div className="space-y-4">
          {grouped.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.value}>
                {/* Category header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-bold ${group.color}`}>
                    <Icon size={12} />
                    {group.label}
                  </div>
                  <span className="text-[10px] text-muted-foreground/50">
                    {group.photos.length} foto{group.photos.length > 1 ? "s" : ""}
                  </span>
                  <div className="h-px flex-1 bg-border/40" />
                </div>

                {/* Photo grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {group.photos.map((foto) => (
                    <div
                      key={foto.originalIndex}
                      className="relative group rounded-lg overflow-hidden border border-border/50 aspect-square"
                    >
                      <img
                        src={foto.url}
                        alt={foto.categoria}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemove(foto.originalIndex)}
                        className="absolute top-1 right-1 bg-black/70 hover:bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-border/50 rounded-xl text-muted-foreground/40">
          <ImagePlus size={36} className="mb-2" />
          <p className="text-sm font-medium">No hay fotos en la galería</p>
          <p className="text-xs mt-1">Selecciona una categoría arriba y sube fotos</p>
        </div>
      )}
    </div>
  );
};

export default GalleryUpload;
