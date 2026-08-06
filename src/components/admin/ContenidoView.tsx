import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  ImageOff,
  ChevronDown,
  Pencil,
  Trash2,
  FileDown,
  ImageDown,
  ArrowLeft,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { formatPrice } from "@/lib/formatPrice";
import { amenidadesLabels } from "@/data/amenidades";
import {
  generarContenido,
  listarPublicaciones,
  borrarPublicacion,
  guardarLaminas,
  descargarLaminasGuardadas,
  type TonoContenido,
} from "@/lib/contenidoApi";
import VideoReelPanel from "@/components/admin/VideoReelPanel";
import { descargarFichaPdf } from "@/lib/propiedadPdf";
import { descargarCarruselInstagram } from "@/lib/propiedadImagen";
import type {
  Propiedad,
  ContenidoGenerado,
  LaminaGuardada,
  PublicacionGenerada,
} from "@/types";

interface ContenidoViewProps {
  /** Propiedades ya cargadas por el dashboard — no se vuelve a consultar. */
  properties: Propiedad[];
  advisorName: string;
  /** Abre el formulario de la propiedad para completar datos faltantes. */
  onEditProperty: (p: Propiedad) => void;
}

const TONOS: { value: TonoContenido; nombre: string; pie: string }[] = [
  { value: "profesional", nombre: "Profesional", pie: "Sobrio y con oficio" },
  { value: "cercano", nombre: "Cercano", pie: "De tú a tú" },
  { value: "lujo", nombre: "Lujo", pie: "Aspiracional y exclusivo" },
  { value: "directo", nombre: "Directo", pie: "Al grano, con urgencia" },
];

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

/* ── Piezas del sistema visual ───────────────────────────────────────────── */

/**
 * Encabezado de sección al estilo editorial: número, rótulo en versalitas y un
 * filete que se lleva el resto del ancho. Sustituye a las tarjetas: la
 * jerarquía la hacen la tipografía y el aire, no las cajas.
 */
const Rubrica = ({
  numero,
  titulo,
  accion,
}: {
  numero: string;
  titulo: string;
  accion?: React.ReactNode;
}) => (
  <div className="flex items-center gap-4 mb-6">
    <span className="font-heading text-[11px] font-extrabold text-gold tabular-nums">
      {numero}
    </span>
    <h3 className="font-heading text-[11px] font-extrabold uppercase text-cobalt/60 whitespace-nowrap">
      {titulo}
    </h3>
    <span aria-hidden className="h-px flex-1 bg-cobalt/10" />
    {accion}
  </div>
);

const botonBase =
  "inline-flex items-center gap-2 text-[11px] font-bold uppercase transition-colors duration-200 disabled:opacity-50";

/** Acción secundaria: sin caja, subrayado al pasar el cursor. */
const AccionTexto = ({
  label,
  labelBusy,
  icon: Icon,
  onDownload,
}: {
  label: string;
  labelBusy: string;
  icon: LucideIcon;
  onDownload: () => Promise<unknown>;
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ejecutar = async () => {
    setBusy(true);
    setError(null);
    try {
      await onDownload();
    } catch (e) {
      setError((e as Error).message || "No se pudo crear el archivo.");
    }
    setBusy(false);
  };

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button
        type="button"
        onClick={ejecutar}
        disabled={busy}
        className={`${botonBase} text-cobalt/75 hover:text-cobalt`}
      >
        {busy ? (
          <Loader2 size={13} className="animate-spin text-gold" />
        ) : (
          <Icon size={13} strokeWidth={2.4} className="text-gold" />
        )}
        <span className="border-b border-transparent pb-px hover:border-gold">
          {busy ? labelBusy : label}
        </span>
      </button>
      {error && <span className="text-[10px] font-medium text-red-500">{error}</span>}
    </span>
  );
};

const CopiarTexto = ({ text, label = "Copiar" }: { text: string; label?: string }) => {
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
      className={`${botonBase} ${copied ? "text-emerald-600" : "text-cobalt/60 hover:text-cobalt"}`}
    >
      {copied ? <Check size={13} strokeWidth={2.8} /> : <Copy size={13} strokeWidth={2.4} />}
      {copied ? "Copiado" : label}
    </button>
  );
};

/* ── Vista ───────────────────────────────────────────────────────────────── */

const ContenidoView = ({ properties, advisorName, onEditProperty }: ContenidoViewProps) => {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tono, setTono] = useState<TonoContenido>("profesional");

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contenido, setContenido] = useState<ContenidoGenerado | null>(null);

  const [historial, setHistorial] = useState<PublicacionGenerada[]>([]);
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
  const laminasEstimadas = selected
    ? Math.min(2 + (selected.galeria ?? []).filter((f) => f.categoria !== "portada").length, 10)
    : 0;

  return (
    // Lienzo propio, cálido: separa esta herramienta del gris del resto del
    // panel sin necesidad de encerrar cada bloque en una tarjeta.
    <div className="relative -mx-4 lg:-mx-8 -mt-6 lg:-mt-8 -mb-6 lg:-mb-8 min-h-screen bg-[#FBFAF7] px-4 lg:px-10 pt-6 lg:pt-8 pb-16">
      {/* Volver: arriba a la izquierda, sin caja */}
      {selected && (
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className="group mb-7 inline-flex items-center gap-3 text-cobalt/70 transition-colors hover:text-cobalt"
        >
          <ArrowLeft
            size={22}
            strokeWidth={2.2}
            className="transition-transform duration-300 group-hover:-translate-x-1"
          />
          <span className="font-heading text-sm font-bold uppercase">
            Todas las propiedades
          </span>
        </button>
      )}

      {/* Encabezado */}
      <header className="mb-10 max-w-3xl">
        <p className="font-heading text-[11px] font-extrabold uppercase text-gold">
          Marketing
        </p>
        <h2 className="mt-3 font-heading text-4xl md:text-[2.9rem] font-extrabold leading-[1.02] text-cobalt">
          Contenido para Redes
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-cobalt/55">
          Elige una propiedad y la IA redacta la descripción y el copy de Instagram.
          De ahí salen también la ficha PDF, el carrusel y el reel, todos con los datos
          que estén guardados en la propiedad.
        </p>
      </header>

      {/* ── 01 · Propiedad ──────────────────────────────────────────────── */}
      {!selected && (
        <section className="mb-14">
          <Rubrica numero="01" titulo="Elige la propiedad" />

          <div className="mb-8 flex items-center gap-3 border-b border-cobalt/15 pb-3 focus-within:border-gold transition-colors">
            <Search size={18} className="text-cobalt/35" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, municipio o dirección"
              className="w-full bg-transparent text-base text-cobalt outline-none placeholder:text-cobalt/30"
            />
            {search && (
              <span className="font-heading text-xs font-bold tabular-nums text-cobalt/40">
                {filtered.length}
              </span>
            )}
          </div>

          {filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-cobalt/45">
              Ninguna propiedad coincide con la búsqueda.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-8">
              {filtered.map((p, i) => {
                const portada = portadaDe(p);
                const faltan = datosFaltantes(p).length;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    style={{ animationDelay: `${Math.min(i, 11) * 45}ms` }}
                    className="group animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards duration-500 text-left"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden rounded-[3px] bg-cobalt/[0.06]">
                      {portada ? (
                        <img
                          src={portada}
                          alt={p.nombre}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-cobalt/20">
                          <ImageOff size={26} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-cobalt/90 via-cobalt/15 to-transparent opacity-90" />

                      {faltan > 0 && (
                        <span
                          title={`Faltan ${faltan} datos para un mejor contenido`}
                          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 font-heading text-[11px] font-extrabold text-cobalt shadow-sm"
                        >
                          {faltan}
                        </span>
                      )}

                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <p className="text-[10px] font-bold uppercase text-gold/95 truncate">
                          {[p.municipio, p.estado].filter(Boolean).join(", ") || "—"}
                        </p>
                        <p className="mt-1 font-heading text-[13px] font-bold leading-tight text-white line-clamp-2">
                          {p.nombre}
                        </p>
                        <p className="mt-1.5 font-heading text-lg font-extrabold tabular-nums text-white">
                          {formatPrice(p.precio)}
                        </p>
                      </div>

                      {/* Filete dorado que se dibuja al pasar el cursor */}
                      <span className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 bg-gold transition-transform duration-500 group-hover:scale-x-100" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {selected && (
        <>
          {/* Ficha de la propiedad elegida, a sangre */}
          <section className="mb-12">
            <div className="relative -mx-4 lg:-mx-10 h-[300px] md:h-[360px] overflow-hidden bg-cobalt">
              {portadaDe(selected) ? (
                <img
                  src={portadaDe(selected) as string}
                  alt={selected.nombre}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-cobalt-light to-cobalt" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-cobalt via-cobalt/60 to-cobalt/10" />

              <div className="absolute inset-x-0 bottom-0 px-4 lg:px-10 pb-8">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-gold px-4 py-1.5 font-heading text-[10px] font-extrabold uppercase text-cobalt">
                    {selected.tipo_oferta || "Disponible"}
                  </span>
                  <span className="font-heading text-[10px] font-bold uppercase text-white/60">
                    {selected.tipo}
                  </span>
                </div>
                <h3 className="mt-3 font-heading text-2xl md:text-4xl font-extrabold leading-[1.05] text-white">
                  {selected.nombre}
                </h3>
                <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
                  <p className="font-heading text-xl md:text-2xl font-extrabold tabular-nums text-gold">
                    {formatPrice(selected.precio)}
                  </p>
                  <p className="text-xs font-semibold uppercase text-white/70">
                    {[selected.municipio, selected.estado].filter(Boolean).join(", ") ||
                      "Sin ubicación"}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[11px] font-semibold uppercase text-white/55">
                  {selected.recamaras > 0 && <span>{selected.recamaras} recámaras</span>}
                  {selected.banos > 0 && <span>{selected.banos} baños</span>}
                  {selected.metros_cuadrados > 0 && <span>{selected.metros_cuadrados} m² const.</span>}
                  {selected.metros_terreno > 0 && <span>{selected.metros_terreno} m² terreno</span>}
                  {selected.estacionamientos > 0 && <span>{selected.estacionamientos} autos</span>}
                </div>
              </div>
            </div>

            {(selected.amenidades || []).length > 0 && (
              <p className="mt-4 text-[11px] font-semibold uppercase text-cobalt/40">
                {amenidadesLabels(selected.amenidades).join("  ·  ")}
              </p>
            )}

            {faltantes.length > 0 && (
              <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3 border-l-2 border-amber-400 bg-amber-50/70 px-5 py-4">
                <AlertTriangle size={17} className="text-amber-600 flex-shrink-0" />
                <p className="flex-1 text-xs leading-relaxed text-amber-900/85">
                  Esta propiedad no tiene <strong className="font-bold">{faltantes.join(", ")}</strong>.
                  Puedes generar igual, pero sale más completo si lo llenas.
                </p>
                <button
                  type="button"
                  onClick={() => onEditProperty(selected)}
                  className={`${botonBase} text-amber-800 hover:text-amber-950 flex-shrink-0`}
                >
                  <Pencil size={13} strokeWidth={2.4} />
                  <span className="border-b border-amber-400/60 pb-px">Completar</span>
                </button>
              </div>
            )}
          </section>

          {/* ── 02 · Tono y generación ────────────────────────────────── */}
          <section className="mb-14">
            <Rubrica numero="02" titulo="Tono del texto" />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-cobalt/10">
              {TONOS.map(({ value, nombre, pie }) => {
                const activo = tono === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTono(value)}
                    aria-pressed={activo}
                    className={`group relative px-5 py-6 text-left transition-colors duration-300 ${
                      activo ? "bg-cobalt" : "bg-[#FBFAF7] hover:bg-white"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`absolute inset-x-0 top-0 h-[3px] bg-gold transition-transform duration-300 origin-left ${
                        activo ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                      }`}
                    />
                    <p
                      className={`font-heading text-base font-extrabold ${
                        activo ? "text-white" : "text-cobalt"
                      }`}
                    >
                      {nombre}
                    </p>
                    <p
                      className={`mt-1 text-[11px] leading-snug ${
                        activo ? "text-white/60" : "text-cobalt/45"
                      }`}
                    >
                      {pie}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-6">
              <button
                type="button"
                onClick={handleGenerar}
                disabled={generating}
                className="group inline-flex items-center gap-3 bg-cobalt px-9 py-4 font-heading text-xs font-extrabold uppercase text-white transition-colors duration-300 hover:bg-cobalt-light disabled:opacity-60"
              >
                {generating ? (
                  <Loader2 size={16} className="animate-spin text-gold" />
                ) : contenido ? (
                  <RefreshCw size={16} className="text-gold transition-transform duration-500 group-hover:rotate-180" />
                ) : (
                  <Sparkles size={16} className="text-gold" />
                )}
                {generating ? "Generando" : contenido ? "Generar otra versión" : "Generar contenido"}
              </button>
              {generating && (
                <span className="text-xs text-cobalt/45">
                  Tarda unos segundos. No cierres esta pantalla.
                </span>
              )}
            </div>

            {error && (
              <div className="mt-5 flex items-start gap-3 border-l-2 border-red-400 bg-red-50/70 px-5 py-4">
                <AlertTriangle size={16} className="mt-px flex-shrink-0 text-red-500" />
                <p className="text-xs leading-relaxed text-red-700/90">{error}</p>
              </div>
            )}
          </section>

          {/* ── 03 · Resultados ───────────────────────────────────────── */}
          {contenido && (
            <section className="mb-14 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Rubrica numero="03" titulo="Listo para publicar" />

              {/* Descargas: barra de acciones, sin cajas */}
              <div className="mb-10 flex flex-wrap items-start gap-x-8 gap-y-3 border-y border-cobalt/10 py-4">
                <AccionTexto
                  label="Ficha PDF"
                  labelBusy="Armando PDF"
                  icon={FileDown}
                  onDownload={() =>
                    descargarFichaPdf(selected, { descripcion: contenido.descripcion })
                  }
                />
                <AccionTexto
                  label={`Carrusel · ${laminasEstimadas} imágenes`}
                  labelBusy="Creando imágenes"
                  icon={ImageDown}
                  onDownload={async () => {
                    const { laminas } = await descargarCarruselInstagram(selected);
                    if (contenido.publicacion_id) {
                      await guardarLaminas(contenido.publicacion_id, selected.id, laminas);
                      cargarHistorial(selected.id);
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10">
                <article>
                  <div className="mb-4 flex items-center justify-between gap-4 border-b border-cobalt/10 pb-2">
                    <h4 className="font-heading text-[11px] font-extrabold uppercase text-cobalt/60">
                      Descripción profesional
                    </h4>
                    <CopiarTexto text={contenido.descripcion} />
                  </div>
                  <p className="whitespace-pre-wrap text-[15px] leading-[1.85] text-cobalt/85">
                    {contenido.descripcion}
                  </p>
                </article>

                <article>
                  <div className="mb-4 flex items-center justify-between gap-4 border-b border-cobalt/10 pb-2">
                    <h4 className="font-heading text-[11px] font-extrabold uppercase text-cobalt/60">
                      Copy de Instagram
                    </h4>
                    <CopiarTexto text={contenido.copy_instagram} label="Copiar post" />
                  </div>
                  <p className="whitespace-pre-wrap text-[15px] leading-[1.85] text-cobalt/85">
                    {contenido.copy_instagram}
                  </p>

                  {contenido.hashtags.length > 0 && (
                    <div className="mt-6">
                      <div className="mb-3 flex items-center justify-between gap-4">
                        <p className="font-heading text-[10px] font-extrabold uppercase text-cobalt/40">
                          {contenido.hashtags.length} hashtags
                        </p>
                        <CopiarTexto text={contenido.hashtags.join(" ")} label="Solo hashtags" />
                      </div>
                      <p className="text-[13px] leading-[1.9] text-gold">
                        {contenido.hashtags.join("  ")}
                      </p>
                    </div>
                  )}
                </article>
              </div>

              <div className="mt-12 border-t border-cobalt/10 pt-8">
                <VideoReelPanel
                  propiedad={selected}
                  publicacionId={contenido.publicacion_id}
                  videoPrevio={
                    historial.find((h) => h.id === contenido.publicacion_id)?.video_url ?? null
                  }
                  onGenerado={() => cargarHistorial(selected.id)}
                />
              </div>
            </section>
          )}

          {/* ── 04 · Historial ────────────────────────────────────────── */}
          {historial.length > 0 && (
            <section>
              <Rubrica
                numero="04"
                titulo="Generado antes"
                accion={
                  <span className="font-heading text-[11px] font-extrabold tabular-nums text-cobalt/40">
                    {historial.length}
                  </span>
                }
              />

              <div className="divide-y divide-cobalt/10 border-y border-cobalt/10">
                {historial.map((h) => {
                  const abierto = expandedId === h.id;
                  return (
                    <div key={h.id}>
                      <div className="flex items-center gap-4 py-4">
                        <button
                          type="button"
                          onClick={() => setExpandedId(abierto ? null : h.id)}
                          className="flex flex-1 items-center gap-4 text-left"
                        >
                          <ChevronDown
                            size={15}
                            className={`text-cobalt/35 transition-transform duration-300 ${
                              abierto ? "rotate-180" : ""
                            }`}
                          />
                          <span className="font-heading text-xs font-bold tabular-nums text-cobalt/80">
                            {fechaCorta(h.created_at)}
                          </span>
                          {h.asesor && (
                            <span className="truncate text-[11px] text-cobalt/40">{h.asesor}</span>
                          )}
                          <span className="ml-auto flex items-center gap-4 text-[10px] font-bold uppercase text-cobalt/35">
                            {(h.imagenes || []).length > 0 && (
                              <span>{(h.imagenes as LaminaGuardada[]).length} imágenes</span>
                            )}
                            {h.video_url && <span className="text-gold">reel</span>}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBorrar(h.id)}
                          aria-label="Borrar del historial"
                          className="flex-shrink-0 text-cobalt/25 transition-colors hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {abierto && (
                        <div className="animate-in fade-in duration-300 pb-10 pl-9 pr-2">
                          <div className="mb-8 flex flex-wrap items-start gap-x-8 gap-y-3">
                            {h.descripcion_generada && (
                              <AccionTexto
                                label="Ficha PDF"
                                labelBusy="Armando PDF"
                                icon={FileDown}
                                onDownload={() =>
                                  descargarFichaPdf(selected, {
                                    descripcion: h.descripcion_generada as string,
                                  })
                                }
                              />
                            )}
                            {(h.imagenes || []).length > 0 ? (
                              <>
                                <AccionTexto
                                  label="Descargar carrusel"
                                  labelBusy="Preparando"
                                  icon={ImageDown}
                                  onDownload={() =>
                                    descargarLaminasGuardadas(
                                      h.imagenes as LaminaGuardada[],
                                      `LUCE-carrusel-${h.id}.zip`,
                                    )
                                  }
                                />
                                <AccionTexto
                                  label="Rehacer carrusel"
                                  labelBusy="Creando imágenes"
                                  icon={RefreshCw}
                                  onDownload={async () => {
                                    // Rehace las láminas con los datos actuales de
                                    // la propiedad, sin volver a generar el texto.
                                    const { laminas } = await descargarCarruselInstagram(selected);
                                    await guardarLaminas(h.id, selected.id, laminas);
                                    cargarHistorial(selected.id);
                                  }}
                                />
                              </>
                            ) : (
                              <AccionTexto
                                label="Generar carrusel"
                                labelBusy="Creando imágenes"
                                icon={ImageDown}
                                onDownload={async () => {
                                  const { laminas } = await descargarCarruselInstagram(selected);
                                  await guardarLaminas(h.id, selected.id, laminas);
                                  cargarHistorial(selected.id);
                                }}
                              />
                            )}
                          </div>

                          {(h.imagenes || []).length > 0 && (
                            <div className="mb-8 flex flex-wrap gap-2">
                              {(h.imagenes as LaminaGuardada[]).map((img, i) => (
                                <a
                                  key={img.url}
                                  href={img.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  title={img.nombre}
                                  className="group relative block h-20 w-20 overflow-hidden rounded-[2px]"
                                >
                                  <img
                                    src={img.url}
                                    alt={img.nombre}
                                    loading="lazy"
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                  />
                                  <span className="absolute bottom-0 left-0 bg-cobalt/85 px-1.5 py-0.5 font-heading text-[10px] font-bold text-white">
                                    {i + 1}
                                  </span>
                                </a>
                              ))}
                            </div>
                          )}

                          <div className="mb-8">
                            <p className="mb-3 font-heading text-[10px] font-extrabold uppercase text-cobalt/40">
                              Reel vertical
                            </p>
                            <VideoReelPanel
                              compacto
                              propiedad={selected}
                              publicacionId={h.id}
                              videoPrevio={h.video_url}
                              onGenerado={() => cargarHistorial(selected.id)}
                            />
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
                            {h.descripcion_generada && (
                              <div>
                                <div className="mb-3 flex items-center justify-between gap-4 border-b border-cobalt/10 pb-2">
                                  <p className="font-heading text-[10px] font-extrabold uppercase text-cobalt/40">
                                    Descripción
                                  </p>
                                  <CopiarTexto text={h.descripcion_generada} />
                                </div>
                                <p className="whitespace-pre-wrap text-[14px] leading-[1.8] text-cobalt/75">
                                  {h.descripcion_generada}
                                </p>
                              </div>
                            )}
                            {h.copy_instagram && (
                              <div>
                                <div className="mb-3 flex items-center justify-between gap-4 border-b border-cobalt/10 pb-2">
                                  <p className="font-heading text-[10px] font-extrabold uppercase text-cobalt/40">
                                    Copy de Instagram
                                  </p>
                                  <CopiarTexto text={h.copy_instagram} label="Copiar post" />
                                </div>
                                <p className="whitespace-pre-wrap text-[14px] leading-[1.8] text-cobalt/75">
                                  {h.copy_instagram}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {properties.length === 0 && (
        <div className="py-24 text-center">
          <Sparkles size={30} className="mx-auto text-cobalt/20" />
          <p className="mt-4 font-heading text-base font-bold text-cobalt/60">
            Aún no hay propiedades
          </p>
          <p className="mt-1 text-sm text-cobalt/40">
            Crea una en "Gestión de Propiedades" y vuelve aquí, {advisorName}.
          </p>
        </div>
      )}
    </div>
  );
};

export default ContenidoView;
