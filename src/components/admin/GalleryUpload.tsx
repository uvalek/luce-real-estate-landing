import { useState, useRef } from "react";
import { Upload, X, Loader2, ImagePlus } from "lucide-react";
import { uploadImage } from "@/lib/uploadImage";
import type { GaleriaFoto } from "@/types";

const CATEGORIAS = [
  { value: "fachada", label: "Fachada" },
  { value: "sala", label: "Sala" },
  { value: "cocina", label: "Cocina" },
  { value: "recamara", label: "Recámara" },
  { value: "bano", label: "Baño" },
  { value: "comedor", label: "Comedor" },
  { value: "jardin", label: "Jardín" },
  { value: "cochera", label: "Cochera" },
  { value: "terraza", label: "Terraza" },
  { value: "patio", label: "Patio" },
  { value: "otro", label: "Otro" },
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

    // Reset input
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleRemove = (index: number) => {
    const updated = fotos.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-foreground">
        Galería de fotos
      </label>

      {/* Upload controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Categoría</label>
          <select
            value={selectedCategoria}
            onChange={(e) => setSelectedCategoria(e.target.value)}
            className="border border-border rounded px-3 py-2 text-sm bg-transparent text-foreground outline-none appearance-none cursor-pointer"
          >
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
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
            className="flex items-center gap-2 border-2 border-dashed border-border rounded px-4 py-2 text-sm text-muted-foreground hover:border-cobalt hover:text-cobalt transition-colors disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            {uploading ? "Subiendo..." : "Subir fotos"}
          </button>
        </div>
      </div>

      {/* Preview grid */}
      {fotos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {fotos.map((foto, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-border">
              <img
                src={foto.url}
                alt={foto.categoria}
                className="w-full h-24 object-cover"
              />
              <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 capitalize">
                {foto.categoria}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute top-1 right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-border rounded-lg text-muted-foreground">
          <ImagePlus size={32} className="mb-2" />
          <p className="text-sm">No hay fotos en la galería</p>
          <p className="text-xs mt-1">Selecciona una categoría y sube fotos</p>
        </div>
      )}
    </div>
  );
};

export default GalleryUpload;
