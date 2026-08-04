import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORES } from "../tema";

/**
 * Texto que aparece palabra por palabra, subiendo y desenfocándose.
 * Se usa para las frases (ubicación, títulos): el ojo lee de izquierda a
 * derecha y el escalonado acompaña esa lectura.
 */
export const TextoRevelado: React.FC<{
  texto: string;
  desde?: number;
  style?: React.CSSProperties;
  /** Frames de separación entre palabras. */
  escalon?: number;
}> = ({ texto, desde = 0, style, escalon = 3 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const palabras = texto.split(" ").filter(Boolean);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0 0.28em", ...style }}>
      {palabras.map((palabra, i) => {
        const entrada = spring({
          frame: frame - desde - i * escalon,
          fps,
          config: { damping: 200, mass: 0.6 },
          durationInFrames: 22,
        });
        return (
          <span
            key={`${palabra}-${i}`}
            style={{
              display: "inline-block",
              opacity: entrada,
              transform: `translateY(${(1 - entrada) * 36}px)`,
              filter: `blur(${(1 - entrada) * 7}px)`,
            }}
          >
            {palabra}
          </span>
        );
      })}
    </div>
  );
};

/**
 * Número que cuenta hacia arriba con separadores de miles.
 * A diferencia del texto, aquí lo que comunica es la magnitud: por eso sube
 * el valor en vez de sólo aparecer.
 */
export const NumeroAnimado: React.FC<{
  valor: number;
  desde?: number;
  duracion?: number;
  prefijo?: string;
  sufijo?: string;
  style?: React.CSSProperties;
}> = ({ valor, desde = 0, duracion = 32, prefijo = "", sufijo = "", style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const avance = spring({
    frame: frame - desde,
    fps,
    config: { damping: 200, mass: 0.9 },
    durationInFrames: duracion,
  });

  const actual = Math.round(valor * avance);
  const escala = interpolate(avance, [0, 1], [0.86, 1]);
  const final = `${prefijo}${valor.toLocaleString("es-MX")}${sufijo}`;

  // El ancho lo fija el valor final (invisible) y el número que cuenta va
  // encima en absoluto. Si no, al crecer de "$0" a "$4,000,000" empujaría a lo
  // que tenga al lado —el "MXN"— y se vería saltar o encimarse.
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        opacity: interpolate(avance, [0, 0.25], [0, 1], { extrapolateRight: "clamp" }),
        transform: `scale(${escala})`,
        transformOrigin: "left center",
        fontVariantNumeric: "tabular-nums",
        ...style,
      }}
    >
      <span style={{ visibility: "hidden" }}>{final}</span>
      <span style={{ position: "absolute", left: 0, top: 0, whiteSpace: "nowrap" }}>
        {prefijo}
        {actual.toLocaleString("es-MX")}
        {sufijo}
      </span>
    </span>
  );
};

/** Pastilla dorada con la operación (En Venta / En Renta). */
export const Badge: React.FC<{ texto: string; desde?: number }> = ({ texto, desde = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrada = spring({
    frame: frame - desde,
    fps,
    config: { damping: 14, mass: 0.7 },
    durationInFrames: 26,
  });

  return (
    <div
      style={{
        alignSelf: "flex-start",
        backgroundColor: COLORES.gold,
        color: COLORES.cobalt,
        padding: "18px 42px",
        borderRadius: 999,
        fontSize: 40,
        fontWeight: 800,
        letterSpacing: 4,
        textTransform: "uppercase",
        opacity: entrada,
        transform: `scale(${interpolate(entrada, [0, 1], [0.7, 1])})`,
      }}
    >
      {texto}
    </div>
  );
};

/** Línea dorada que se dibuja de izquierda a derecha. */
export const LineaDorada: React.FC<{ desde?: number; ancho?: number }> = ({
  desde = 0,
  ancho = 130,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const avance = spring({
    frame: frame - desde,
    fps,
    config: { damping: 200 },
    durationInFrames: 20,
  });
  return (
    <div
      style={{
        width: ancho * avance,
        height: 7,
        backgroundColor: COLORES.gold,
        borderRadius: 4,
      }}
    />
  );
};

/**
 * Etiqueta pequeña en versalitas doradas.
 *
 * `desplazar` se apaga cuando la etiqueta va pegada a otro elemento (el "MXN"
 * junto al precio): ahí el movimiento lateral la metería encima del número.
 */
export const Etiqueta: React.FC<{
  texto: string;
  desde?: number;
  desplazar?: boolean;
  style?: React.CSSProperties;
}> = ({ texto, desde = 0, desplazar = true, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrada = spring({
    frame: frame - desde,
    fps,
    config: { damping: 200 },
    durationInFrames: 18,
  });
  return (
    <div
      style={{
        color: COLORES.goldClaro,
        fontSize: 30,
        fontWeight: 700,
        letterSpacing: 8,
        textTransform: "uppercase",
        opacity: entrada,
        transform: desplazar ? `translateX(${(1 - entrada) * -24}px)` : undefined,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {texto}
    </div>
  );
};

/** Marca de agua, presente en todas las escenas. */
export const Marca: React.FC = () => (
  <div style={{ position: "absolute", top: 72, right: 72, textAlign: "right" }}>
    <div
      style={{
        color: COLORES.blanco,
        fontSize: 44,
        fontWeight: 800,
        letterSpacing: 12,
      }}
    >
      LUCE
    </div>
    <div
      style={{
        color: COLORES.goldClaro,
        fontSize: 21,
        fontWeight: 700,
        letterSpacing: 7,
        marginTop: 4,
      }}
    >
      REAL ESTATE
    </div>
  </div>
);
