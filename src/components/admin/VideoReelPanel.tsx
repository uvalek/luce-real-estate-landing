import { useState, useEffect, useRef, useCallback } from "react";
import { Film, Loader2, AlertTriangle, Download, RefreshCw } from "lucide-react";
import {
  iniciarRender,
  consultarRender,
  videoDisponible,
  type ProgresoRender,
} from "@/lib/videoApi";
import type { Propiedad } from "@/types";

interface VideoReelPanelProps {
  propiedad: Propiedad;
  /** Fila del historial a la que se le cuelga el video, si hay. */
  publicacionId?: number | null;
  /** Video ya renderizado antes para esta publicación. */
  videoPrevio?: string | null;
  /** Sin el encabezado explicativo — para usarlo dentro del historial. */
  compacto?: boolean;
  /** Se llama al terminar, para refrescar el historial. */
  onGenerado?: () => void;
}

const ETIQUETA_ESTADO: Record<string, string> = {
  "en cola": "En cola...",
  preparando: "Preparando la escena...",
  "escribiendo el guion": "Escribiendo el guion de la voz...",
  "grabando la voz": "Grabando la narración...",
  renderizando: "Renderizando el video...",
  subiendo: "Guardando el video...",
  listo: "¡Listo!",
  error: "Falló",
};

/**
 * Botón de "Generar Video" con barra de progreso.
 *
 * El render tarda entre uno y varios minutos según la máquina, así que el
 * servicio responde de inmediato con un id y aquí se consulta el avance cada
 * segundo y medio.
 */
const VideoReelPanel = ({
  propiedad,
  publicacionId,
  videoPrevio,
  compacto = false,
  onGenerado,
}: VideoReelPanelProps) => {
  const [jobId, setJobId] = useState<string | null>(null);
  const [progreso, setProgreso] = useState<ProgresoRender | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [iniciando, setIniciando] = useState(false);
  const [url, setUrl] = useState<string | null>(videoPrevio ?? null);
  const timer = useRef<number | null>(null);
  // En una referencia y no en las dependencias del efecto: si no, cada render
  // del padre reiniciaría el sondeo y volvería a consultar de inmediato.
  const alTerminar = useRef(onGenerado);
  alTerminar.current = onGenerado;

  const disponible = videoDisponible();

  useEffect(() => {
    setUrl(videoPrevio ?? null);
    setJobId(null);
    setProgreso(null);
    setError(null);
  }, [propiedad.id, videoPrevio]);

  const detener = useCallback(() => {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => detener, [detener]);

  // Sondeo del avance mientras haya un trabajo vivo.
  useEffect(() => {
    if (!jobId) return;
    let cancelado = false;

    const consultar = async () => {
      try {
        const p = await consultarRender(jobId);
        if (cancelado) return;
        setProgreso(p);
        if (p.estado === "listo") {
          setUrl(p.url);
          setJobId(null);
          detener();
          alTerminar.current?.();
        } else if (p.estado === "error") {
          setError(p.error ?? "No se pudo generar el video.");
          setJobId(null);
          detener();
        }
      } catch (e) {
        if (cancelado) return;
        setError((e as Error).message);
        setJobId(null);
        detener();
      }
    };

    consultar();
    timer.current = window.setInterval(consultar, 1500);
    return () => {
      cancelado = true;
      detener();
    };
  }, [jobId, detener]);

  const generar = async () => {
    setIniciando(true);
    setError(null);
    setProgreso(null);
    try {
      setJobId(await iniciarRender(propiedad.id, publicacionId));
    } catch (e) {
      setError((e as Error).message);
    }
    setIniciando(false);
  };

  const trabajando = Boolean(jobId) || iniciando;
  const pct = progreso?.progreso ?? 0;

  return (
    <div>
      <div
        className={
          compacto
            ? "flex flex-wrap items-center gap-2.5"
            : "flex flex-col sm:flex-row sm:items-end gap-6"
        }
      >
        {!compacto && (
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-[11px] font-extrabold uppercase tracking-[0.24em] text-cobalt/60">
              Reel vertical
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-cobalt/55">
              Video de 1080 × 1920 para Instagram y TikTok: las fotos en movimiento, los
              datos animados, música de fondo y una narradora que cuenta la propiedad.
              Entre 21 y 27 segundos.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
          {url && !trabajando && (
            <a
              href={url}
              download
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-2 bg-cobalt font-heading text-[11px] font-extrabold uppercase tracking-[0.16em] text-white transition-colors hover:bg-cobalt-light ${
                compacto ? "px-4 py-2.5" : "px-6 py-3.5"
              }`}
            >
              <Download size={14} strokeWidth={2.4} className="text-gold" />
              Descargar video
            </a>
          )}
          <button
            type="button"
            onClick={generar}
            disabled={trabajando || !disponible}
            title={disponible ? undefined : "El servicio de video no está configurado"}
            className={`inline-flex items-center gap-2 font-heading text-[11px] font-extrabold uppercase tracking-[0.16em] transition-colors duration-200 disabled:opacity-50 ${
              compacto ? "px-4 py-2.5" : "px-6 py-3.5"
            } ${
              url || compacto
                ? "border border-cobalt/20 bg-transparent text-cobalt hover:border-gold hover:text-cobalt"
                : "bg-gold text-cobalt hover:brightness-105"
            }`}
          >
            {trabajando ? (
              <Loader2 size={14} className="animate-spin text-gold" />
            ) : url ? (
              <RefreshCw size={14} strokeWidth={2.4} className="text-gold" />
            ) : (
              <Film size={14} strokeWidth={2.4} className={url ? "text-gold" : undefined} />
            )}
            {trabajando ? "Generando" : url ? "Generar de nuevo" : "Generar Video"}
          </button>
        </div>
      </div>

      {/* Barra de progreso */}
      {trabajando && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-heading text-[11px] font-extrabold uppercase tracking-[0.16em] text-cobalt/70">
              {ETIQUETA_ESTADO[progreso?.estado ?? "en cola"] ?? "Trabajando"}
            </span>
            <span className="font-heading text-[11px] font-extrabold tabular-nums text-gold">
              {pct}%
            </span>
          </div>
          <div className="h-[3px] w-full overflow-hidden bg-cobalt/10">
            <div
              className="h-full bg-gold transition-all duration-500"
              style={{ width: `${Math.max(pct, 3)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-cobalt/45">
            Puede tardar un par de minutos. Puedes seguir usando el dashboard, pero no
            cierres esta pantalla.
          </p>
        </div>
      )}

      {/* El aviso de "no configurado" solo en el panel grande: en el historial
          se repetiría en cada entrada. */}
      {!disponible && !compacto && (
        <div className="mt-5 flex items-start gap-3 border-l-2 border-amber-400 bg-amber-50/70 px-5 py-4">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-px" />
          <p className="text-xs text-amber-900/85 leading-relaxed">
            El servicio de video todavía no está encendido. Renderizar necesita un servidor
            con Node (ni Vercel ni Supabase pueden hacerlo). Está en la carpeta{" "}
            <code className="font-mono font-semibold">video/</code> del proyecto; una vez
            corriendo, hay que poner su dirección en <code className="font-mono font-semibold">VITE_VIDEO_API_URL</code>.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-5 flex items-start gap-3 border-l-2 border-red-400 bg-red-50/70 px-5 py-4">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-px" />
          <p className="text-xs text-red-700/90 leading-relaxed">{error}</p>
        </div>
      )}

      {url && !trabajando && (
        <div className={`mt-4 flex ${compacto ? "justify-start" : "justify-center"}`}>
          <video
            src={url}
            controls
            playsInline
            className={`rounded-xl border border-border/60 bg-black ${
              compacto ? "max-h-64" : "max-h-[26rem]"
            }`}
          />
        </div>
      )}
    </div>
  );
};

export default VideoReelPanel;
