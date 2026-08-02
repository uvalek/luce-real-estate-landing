import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Sparkles,
  Search,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Instagram,
  FileText,
  ImageOff,
  History,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  MapPin,
  FileDown,
  ImageDown,
  type LucideIcon,
} from "lucide-react";
import { formatPrice } from "@/lib/formatPrice";
import { amenidadesLabels } from "@/data/amenidades";
import {
  generarContenido,
  listarPublicaciones,
  borrarPublicacion,
} from "@/lib/contenidoApi";
import { descargarFichaPdf } from "@/lib/propiedadPdf";
import { descargarImagenInstagram } from "@/lib/propiedadImagen";
import type { Propiedad, ContenidoGenerado, PublicacionGenerada } from "@/types";

interface ContenidoViewProps {
  /** Propiedades ya cargadas por el dashboard — no se vuelve a consultar. */
  properties: Propiedad[];
  advisorName: string;
  /** Abre el formulario de la propiedad para completar datos faltantes. */
  onEditProperty: (p: Propiedad) => void;
}

/** Datos que hacen la diferencia en el contenido generado. */
const datosFaltantes = (p: Propiedad): string[] => {
  const faltan: string[] = [];
  if (!(p.descripcion || "").trim()) faltan.push("qué destaca de la propiedad");
  if (!p.galeria?.some((f) => f.categoria === "portada")) faltan.push("foto de portada");
  if (!(p.amenidades || []).length) faltan.push("amenidades");
  if (!(p.asesor_telefono || "").trim()) faltan.push("teléfono del asesor");
  if (!(p.asesor_email || "").trim()) faltan.push("email del asesor");
  return faltan;
};

const portadaDe = (p: Propiedad): string | null =>
  p.galeria?.find((f) => f.categoria === "portada")?.url ?? null;

const fechaCorta = (iso: string): string =>
  new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/* ── Botón de descarga (PDF o imagen) ────────────────────────────────────── */
const DescargaButton = ({
  label,
  labelBusy,
  icon: Icon,
  onDownload,
  variant = "solid",
}: {
  label: string;
  labelBusy: string;
  icon: LucideIcon;
  onDownload: () => Promise<unknown>;
  variant?: "solid" | "outline" | "ghost";
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const descargar = async () => {
    setBusy(true);
    setError(null);
    try {
      await onDownload();
    } catch (err) {
      setError((err as Error).message || "No se pudo crear el archivo.");
    }
    setBusy(false);
  };

  const estilos = {
    solid:
      "bg-gold text-cobalt shadow-sm hover:brightness-105 px-5 py-2.5 border border-transparent",
    outline:
      "bg-white/10 text-white border border-white/35 hover:bg-white/20 px-5 py-2.5",
    ghost:
      "bg-white text-cobalt border border-border/70 hover:bg-muted/60 px-3.5 py-2",
  }[variant];

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={descargar}
        disabled={busy}
        className={`flex items-center gap-2 rounded-xl text-xs font-bold transition-all duration-200 disabled:opacity-70 ${estilos}`}
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} strokeWidth={2.4} />}
        {busy ? labelBusy : label}
      </button>
      {error && <span className="text-[11px] font-medium text-red-400">{error}</span>}
    </div>
  );
};

/* ── Botón de copiar al portapapeles ─────────────────────────────────────── */
const CopyButton = ({ text, label = "Copiar" }: { text: string; label?: string }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Tu navegador no permitió copiar. Selecciona el texto y usa Ctrl+C.");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 ${
        copied
          ? "bg-emerald-500 text-white"
          : "bg-cobalt text-white hover:bg-cobalt-light shadow-sm"
      }`}
    >
      {copied ? <Check size={14} strokeWidth={2.6} /> : <Copy size={14} strokeWidth={2.4} />}
      {copied ? "¡Copiado!" : label}
    </button>
  );
};

const ContenidoView = ({ properties, advisorName, onEditProperty }: ContenidoViewProps) => {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tono, setTono] = useState<"profesional" | "cercano">("profesional");

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contenido, setContenido] = useState<ContenidoGenerado | null>(null);

  const [historial, setHistorial] = useState<PublicacionGenerada[]>([]);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const selected = useMemo(
    () => properties.find((p) => p.id === selectedId) ?? null,
    [properties, selectedId],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter((p) =>
      [p.nombre, p.municipio, p.estado, p.zona, p.direccion]
        .filter(Boolean)
        .some((campo) => (campo as string).toLowerCase().includes(q)),
    );
  }, [properties, search]);

  const cargarHistorial = useCallback(async (propiedadId: number) => {
    try {
      setHistorial(await listarPublicaciones(propiedadId));
    } catch {
      // El historial es un extra: si falla, la herramienta sigue sirviendo.
      setHistorial([]);
    }
  }, []);

  // Al cambiar de propiedad se limpia el resultado anterior y se trae su historial.
  useEffect(() => {
    setContenido(null);
    setError(null);
    setExpandedId(null);
    if (selectedId) cargarHistorial(selectedId);
    else setHistorial([]);
  }, [selectedId, cargarHistorial]);

  const handleGenerar = async () => {
    if (!selected) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await generarContenido(selected.id, tono);
      setContenido(result);
      cargarHistorial(selected.id);
    } catch (err) {
      setError((err as Error).message);
    }
    setGenerating(false);
  };

  const handleBorrar = async (id: number) => {
    try {
      await borrarPublicacion(id);
      setHistorial((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      alert(`No se pudo borrar: ${(err as Error).message}`);
    }
  };

  const faltantes = selected ? datosFaltantes(selected) : [];

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cobalt to-cobalt-light text-white shadow-[0_10px_24px_-10px_rgba(28,55,140,0.6)]">
          <Sparkles size={20} strokeWidth={2.1} />
        </span>
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-gold">Marketing</p>
          <h2 className="font-heading text-xl md:text-2xl font-bold text-cobalt leading-tight">
            Contenido para Redes
          </h2>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-6 max-w-2xl leading-relaxed">
        Elige una propiedad y la IA redacta una descripción profesional y un copy listo
        para Instagram con hashtags. Usa solo los datos que están guardados en la
        propiedad: mientras más completa esté, mejor sale el texto.
      </p>

      {/* ── Paso 1: elegir propiedad ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/70 bg-white p-4 sm:p-5 mb-5 shadow-[0_6px_20px_-14px_rgba(15,23,42,0.25)]">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cobalt/10 font-heading text-xs font-extrabold text-cobalt">
            1
          </span>
          <h3 className="text-sm font-bold text-foreground">Elige la propiedad</h3>
          {selected && (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="ml-auto text-xs font-semibold text-cobalt hover:underline"
            >
              Cambiar
            </button>
          )}
        </div>

        {selected ? (
          <div className="flex items-center gap-4 rounded-2xl border border-cobalt/25 bg-cobalt/[0.04] p-3">
            {portadaDe(selected) ? (
              <img
                src={portadaDe(selected) as string}
                alt={selected.nombre}
                className="h-20 w-20 rounded-xl object-cover flex-shrink-0"
              />
            ) : (
              <div className="flex h-20 w-20 flex-col items-center justify-center rounded-xl bg-muted text-muted-foreground/50 flex-shrink-0">
                <ImageOff size={20} />
                <span className="mt-1 text-[9px] font-semibold uppercase">Sin foto</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-heading text-base font-bold text-cobalt truncate">
                {selected.nombre}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 truncate">
                <MapPin size={12} className="flex-shrink-0" />
                {[selected.municipio, selected.estado].filter(Boolean).join(", ") || "Sin ubicación"}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="font-heading text-sm font-extrabold text-gold tabular-nums">
                  {formatPrice(selected.precio)}
                </span>
                <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cobalt border border-cobalt/15">
                  {selected.tipo_oferta || "—"}
                </span>
                <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground border border-border/60">
                  {selected.tipo}
                </span>
              </div>
              {(selected.amenidades || []).length > 0 && (
                <p className="mt-1.5 text-[11px] text-muted-foreground/80 truncate">
                  {amenidadesLabels(selected.amenidades).join(" · ")}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-white px-3.5 mb-3 focus-within:border-cobalt/50">
              <Search size={15} className="text-muted-foreground/60 flex-shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, municipio o dirección..."
                className="flex-1 min-w-0 bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground/50"
              />
            </div>

            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No hay propiedades que coincidan con la búsqueda.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[26rem] overflow-y-auto pr-1">
                {filtered.map((p) => {
                  const portada = portadaDe(p);
                  const faltan = datosFaltantes(p).length;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      className="group flex items-center gap-3 rounded-xl border border-border/70 bg-white p-2.5 text-left transition-all duration-200 hover:border-cobalt/40 hover:shadow-md"
                    >
                      {portada ? (
                        <img
                          src={portada}
                          alt={p.nombre}
                          className="h-14 w-14 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted text-muted-foreground/40 flex-shrink-0">
                          <ImageOff size={16} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground truncate group-hover:text-cobalt">
                          {p.nombre}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {[p.municipio, p.estado].filter(Boolean).join(", ") || "—"}
                        </p>
                        <p className="text-[11px] font-bold text-gold tabular-nums mt-0.5">
                          {formatPrice(p.precio)}
                        </p>
                      </div>
                      {faltan > 0 && (
                        <span
                          title={`Faltan ${faltan} datos para un mejor contenido`}
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 flex-shrink-0"
                        >
                          {faltan}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Paso 2: generar ──────────────────────────────────────────────── */}
      {selected && (
        <div className="rounded-2xl border border-border/70 bg-white p-4 sm:p-5 mb-5 shadow-[0_6px_20px_-14px_rgba(15,23,42,0.25)]">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cobalt/10 font-heading text-xs font-extrabold text-cobalt">
              2
            </span>
            <h3 className="text-sm font-bold text-foreground">Genera el contenido</h3>
          </div>

          {/* Aviso de datos faltantes */}
          {faltantes.length > 0 && (
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3">
              <AlertTriangle size={17} className="text-amber-600 flex-shrink-0" />
              <p className="flex-1 text-xs text-amber-900/85 leading-relaxed">
                Esta propiedad no tiene <strong className="font-bold">{faltantes.join(", ")}</strong>.
                Puedes generar el contenido igual, pero saldrá más completo si lo llenas primero.
              </p>
              <button
                type="button"
                onClick={() => onEditProperty(selected)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-400/70 bg-white px-3.5 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors flex-shrink-0"
              >
                <Pencil size={13} />
                Completar propiedad
              </button>
            </div>
          )}

          {/* Tono */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-foreground/70 mb-2">Tono del texto</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: "profesional", label: "Profesional y elegante" },
                  { value: "cercano", label: "Cercano y conversacional" },
                ] as const
              ).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTono(value)}
                  className={`rounded-lg border px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                    tono === value
                      ? "bg-cobalt/10 text-cobalt border-cobalt/30"
                      : "bg-white text-muted-foreground border-border/60 hover:bg-muted/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleGenerar}
              disabled={generating}
              className="flex items-center gap-2 rounded-xl bg-cobalt px-6 py-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-cobalt-light disabled:opacity-70"
            >
              {generating ? (
                <Loader2 size={15} className="animate-spin" />
              ) : contenido ? (
                <RefreshCw size={15} />
              ) : (
                <Sparkles size={15} />
              )}
              {generating
                ? "Generando..."
                : contenido
                  ? "Generar otra versión"
                  : "Generar contenido"}
            </button>
            {generating && (
              <span className="text-xs text-muted-foreground">
                Tarda unos segundos. No cierres esta pantalla.
              </span>
            )}
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-300/70 bg-red-50 px-4 py-3">
              <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-px" />
              <p className="text-xs text-red-700/90 leading-relaxed">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Paso 3: resultados ───────────────────────────────────────────── */}
      {contenido && selected && (
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-gold/40 bg-gradient-to-r from-cobalt to-cobalt-light p-4 sm:p-5 shadow-[0_10px_28px_-18px_rgba(15,31,61,0.7)]">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/20 text-gold flex-shrink-0">
            <FileDown size={19} strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">Tus archivos están listos</p>
            <p className="text-xs text-white/65 leading-relaxed mt-0.5">
              La <strong className="font-semibold text-white/85">ficha PDF</strong> para
              mandar por WhatsApp o correo, y la{" "}
              <strong className="font-semibold text-white/85">imagen cuadrada</strong> de
              1080 × 1080 lista para subir a Instagram.
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-2.5 flex-shrink-0">
            <DescargaButton
              label="Descargar PDF"
              labelBusy="Armando PDF..."
              icon={FileDown}
              onDownload={() =>
                descargarFichaPdf(selected, { descripcion: contenido.descripcion })
              }
            />
            <DescargaButton
              label="Imagen para Instagram"
              labelBusy="Creando imagen..."
              icon={ImageDown}
              variant="outline"
              onDownload={() => descargarImagenInstagram(selected)}
            />
          </div>
        </div>
      )}

      {contenido && selected && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          {/* Descripción */}
          <div className="rounded-2xl border border-border/70 bg-white p-4 sm:p-5 shadow-[0_6px_20px_-14px_rgba(15,23,42,0.25)]">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cobalt/10 text-cobalt">
                <FileText size={16} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground">Descripción profesional</h3>
                <p className="text-[11px] text-muted-foreground">
                  Para portales, WhatsApp y presentaciones
                </p>
              </div>
              <div className="ml-auto flex-shrink-0">
                <CopyButton text={contenido.descripcion} />
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/25 p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {contenido.descripcion}
              </p>
            </div>
          </div>

          {/* Copy de Instagram */}
          <div className="rounded-2xl border border-border/70 bg-white p-4 sm:p-5 shadow-[0_6px_20px_-14px_rgba(15,23,42,0.25)]">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-amber-400 text-white">
                <Instagram size={16} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground">Copy para Instagram</h3>
                <p className="text-[11px] text-muted-foreground">
                  {contenido.hashtags.length} hashtags incluidos
                </p>
              </div>
              <div className="ml-auto flex-shrink-0">
                <CopyButton text={contenido.copy_instagram} label="Copiar post" />
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/25 p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {contenido.copy_instagram}
              </p>
            </div>
            {contenido.hashtags.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Hashtags
                  </p>
                  <div className="ml-auto">
                    <CopyButton text={contenido.hashtags.join(" ")} label="Solo hashtags" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {contenido.hashtags.map((h) => (
                    <span
                      key={h}
                      className="rounded-full bg-cobalt/[0.07] px-2.5 py-1 text-[11px] font-semibold text-cobalt"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Historial ────────────────────────────────────────────────────── */}
      {selected && historial.length > 0 && (
        <div className="rounded-2xl border border-border/70 bg-white p-4 sm:p-5 shadow-[0_6px_20px_-14px_rgba(15,23,42,0.25)]">
          <button
            type="button"
            onClick={() => setHistorialOpen((v) => !v)}
            className="flex w-full items-center gap-2.5"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <History size={15} strokeWidth={2.2} />
            </span>
            <h3 className="text-sm font-bold text-foreground">
              Contenido generado antes
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground tabular-nums">
                {historial.length}
              </span>
            </h3>
            <span className="ml-auto text-muted-foreground">
              {historialOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>

          {historialOpen && (
            <div className="mt-4 space-y-2.5">
              {historial.map((h) => {
                const abierto = expandedId === h.id;
                return (
                  <div key={h.id} className="rounded-xl border border-border/60 overflow-hidden">
                    <div className="flex items-center gap-3 bg-muted/30 px-3.5 py-2.5">
                      <span className="text-xs font-semibold text-foreground/80">
                        {fechaCorta(h.created_at)}
                      </span>
                      {h.asesor && (
                        <span className="text-[11px] text-muted-foreground truncate">
                          · {h.asesor}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setExpandedId(abierto ? null : h.id)}
                        className="ml-auto text-xs font-semibold text-cobalt hover:underline flex-shrink-0"
                      >
                        {abierto ? "Ocultar" : "Ver"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBorrar(h.id)}
                        aria-label="Borrar del historial"
                        className="text-muted-foreground/50 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {abierto && (
                      <div className="space-y-4 p-4">
                        {h.descripcion_generada && (
                          <div className="flex justify-end">
                            <DescargaButton
                              label="Descargar PDF"
                              labelBusy="Armando PDF..."
                              icon={FileDown}
                              variant="ghost"
                              onDownload={() =>
                                descargarFichaPdf(selected, {
                                  descripcion: h.descripcion_generada as string,
                                })
                              }
                            />
                          </div>
                        )}
                        {h.descripcion_generada && (
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Descripción
                              </p>
                              <div className="ml-auto">
                                <CopyButton text={h.descripcion_generada} />
                              </div>
                            </div>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                              {h.descripcion_generada}
                            </p>
                          </div>
                        )}
                        {h.copy_instagram && (
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Copy de Instagram
                              </p>
                              <div className="ml-auto">
                                <CopyButton text={h.copy_instagram} label="Copiar post" />
                              </div>
                            </div>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                              {h.copy_instagram}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Estado vacío cuando no hay propiedades */}
      {properties.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/80 bg-white/60 py-12 text-center">
          <Sparkles size={28} className="mx-auto text-muted-foreground/40" />
          <p className="mt-3 text-sm font-semibold text-foreground/70">
            Aún no hay propiedades
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Crea una propiedad en "Gestión de Propiedades" y vuelve aquí, {advisorName}.
          </p>
        </div>
      )}
    </div>
  );
};

export default ContenidoView;
