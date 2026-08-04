import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { KenBurns, Velos } from "../componentes/KenBurns";
import { Badge, Etiqueta, LineaDorada, Marca, NumeroAnimado, TextoRevelado } from "../componentes/Animaciones";
import { COLORES, numero, type ReelProps } from "../tema";

/** Chip con un dato clave, entra con rebote y escalonado. */
const Chip: React.FC<{ texto: string; desde: number }> = ({ texto, desde }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrada = spring({
    frame: frame - desde,
    fps,
    config: { damping: 13, mass: 0.6 },
    durationInFrames: 24,
  });
  return (
    <div
      style={{
        backgroundColor: "rgba(255,255,255,0.14)",
        border: "2px solid rgba(255,255,255,0.24)",
        borderRadius: 26,
        padding: "18px 30px",
        color: COLORES.blanco,
        fontSize: 38,
        fontWeight: 700,
        opacity: entrada,
        transform: `scale(${interpolate(entrada, [0, 1], [0.6, 1])})`,
      }}
    >
      {texto}
    </div>
  );
};

export const Portada: React.FC<{ props: ReelProps; foto: string | null }> = ({ props, foto }) => {
  const chips: string[] = [];
  if (props.recamaras > 0) chips.push(`${numero(props.recamaras)} rec`);
  if (props.banos > 0) chips.push(`${numero(props.banos)} baños`);
  if (props.metrosCuadrados > 0) chips.push(`${numero(props.metrosCuadrados)} m²`);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORES.cobalt }}>
      {foto ? (
        <KenBurns src={foto} indice={0} />
      ) : (
        <AbsoluteFill
          style={{
            background: `linear-gradient(135deg, ${COLORES.cobaltClaro}, ${COLORES.cobalt})`,
          }}
        />
      )}
      <Velos inferiorDesde={38} />
      <Marca />

      <AbsoluteFill
        style={{
          padding: 84,
          justifyContent: "flex-end",
          alignItems: "flex-start",
          gap: 26,
        }}
      >
        <Badge texto={props.operacion} desde={4} />

        <TextoRevelado
          texto={props.ubicacion}
          desde={16}
          style={{
            color: "rgba(255,255,255,0.9)",
            fontSize: 40,
            fontWeight: 600,
            letterSpacing: 5,
            textTransform: "uppercase",
          }}
        />

        <LineaDorada desde={24} />

        <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
          <NumeroAnimado
            valor={props.precio}
            desde={26}
            duracion={40}
            prefijo="$"
            style={{ color: COLORES.blanco, fontSize: 132, fontWeight: 800, lineHeight: 1 }}
          />
          <Etiqueta texto="MXN" desde={52} desplazar={false} style={{ fontSize: 42, letterSpacing: 3 }} />
        </div>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 8 }}>
          {chips.map((c, i) => (
            <Chip key={c} texto={c} desde={54 + i * 6} />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
