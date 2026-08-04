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
}

const ETIQUETA_ESTADO: Record<string, string> = {
  "en cola": "En cola...",
  preparando: "Preparando la escena...",
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
const VideoReelPanel = ({ propiedad, publicacionId, videoPrevio }: VideoReelPanelProps) => {
  const [jobId, setJobId] = useState<string | null>(null);
  const [progreso, setProgreso] = useState<ProgresoRender | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [iniciando, setIniciando] = useState(false);
  const [url, setUrl] = useState<string | null>(videoPrevio ?? null);
  const timer = useRef<number | null>(null);

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
    <div className="rounded-2xl border border-border/70 bg-white p-4 sm:p-5 shadow-[0_6px_20px_-14px_rgba(15,23,42,0.25)]">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-cobalt text-white flex-shrink-0">
          <Film size={19} strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-foreground">Reel vertical para Instagram y TikTok</h3>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
            Un video de 1080 × 1920 con las fotos en movimiento, los datos animados y una
            pantalla final con tus datos de contacto. Dura entre 21 y 27 segundos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
          {url && !trabajando && (
            <a
              href={url}
              download
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl bg-cobalt px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-cobalt-light"
            >
              <Download size={14} strokeWidth={2.4} />
              Descargar video
            </a>
          )}
          <button
            type="button"
            onClick={generar}
            disabled={trabajando || !disponible}
            title={disponible ? undefined : "El servicio de video no está configurado"}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all duration-200 disabled:opacity-60 ${
              url
                ? "border border-border/70 bg-white text-cobalt hover:bg-muted/60"
                : "bg-gold text-cobalt shadow-sm hover:brightness-105"
            }`}
          >
            {trabajando ? (
              <Loader2 size={14} className="animate-spin" />
            ) : url ? (
              <RefreshCw size={14} strokeWidth={2.4} />
            ) : (
              <Film size={14} strokeWidth={2.4} />
            )}
            {trabajando ? "Generando..." : url ? "Generar de nuevo" : "Generar Video"}
          </button>
        </div>
      </div>

      {/* Barra de progreso */}
      {trabajando && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-cobalt">
              {ETIQUETA_ESTADO[progreso?.estado ?? "en cola"] ?? "Trabajando..."}
            </span>
            <span className="text-xs font-bold text-muted-foreground tabular-nums">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cobalt to-gold transition-all duration-500"
              style={{ width: `${Math.max(pct, 4)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Puede tardar un par de minutos. Puedes seguir usando el dashboard, pero no
            cierres esta pantalla.
          </p>
        </div>
      )}

      {!disponible && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3">
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
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-300/70 bg-red-50 px-4 py-3">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-px" />
          <p className="text-xs text-red-700/90 leading-relaxed">{error}</p>
        </div>
      )}

      {url && !trabajando && (
        <div className="mt-4 flex justify-center">
          <video
            src={url}
            controls
            playsInline
            className="max-h-[26rem] rounded-xl border border-border/60 bg-black"
          />
        </div>
      )}
    </div>
  );
};

export default VideoReelPanel;
