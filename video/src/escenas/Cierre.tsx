import React from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Etiqueta, LineaDorada, Marca, NumeroAnimado, TextoRevelado } from "../componentes/Animaciones";
import { COLORES, type ReelProps } from "../tema";

const Linea: React.FC<{ texto: string; desde: number; style?: React.CSSProperties }> = ({
  texto,
  desde,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrada = spring({
    frame: frame - desde,
    fps,
    config: { damping: 200 },
    durationInFrames: 20,
  });
  return (
    <div
      style={{
        opacity: entrada,
        transform: `translateY(${(1 - entrada) * 22}px)`,
        ...style,
      }}
    >
      {texto}
    </div>
  );
};

/** Pantalla final: a quién le escribes y por cuánto. */
export const Cierre: React.FC<{ props: ReelProps; foto: string | null }> = ({ props, foto }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // La foto queda casi apagada: aquí lo que importa es el contacto.
  const escala = interpolate(frame, [0, durationInFrames], [1.06, 1.16]);
  const contacto = [props.asesor.telefono, props.asesor.email].map((c) => (c || "").trim()).filter(Boolean);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORES.cobalt }}>
      {foto && (
        <AbsoluteFill style={{ overflow: "hidden" }}>
          <Img
            src={foto}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${escala})`,
            }}
          />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ backgroundColor: "rgba(9,16,32,0.9)" }} />
      <Marca />

      <AbsoluteFill
        style={{
          padding: 84,
          justifyContent: "center",
          alignItems: "flex-start",
          gap: 22,
        }}
      >
        <Etiqueta texto="Agenda tu visita" desde={4} />
        <LineaDorada desde={10} ancho={150} />

        <TextoRevelado
          texto={props.asesor.nombre || "LUCE Real Estate"}
          desde={14}
          style={{
            color: COLORES.blanco,
            fontSize: 96,
            fontWeight: 800,
            lineHeight: 1.05,
            marginTop: 10,
          }}
        />

        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
          {contacto.length > 0 ? (
            contacto.map((c, i) => (
              <Linea
                key={c}
                texto={c}
                desde={30 + i * 8}
                style={{ color: COLORES.goldClaro, fontSize: 52, fontWeight: 600 }}
              />
            ))
          ) : (
            <Linea
              texto="Mándanos un mensaje directo"
              desde={30}
              style={{ color: COLORES.goldClaro, fontSize: 48, fontWeight: 600 }}
            />
          )}
        </div>

        <div
          style={{
            marginTop: 56,
            paddingTop: 40,
            borderTop: "2px solid rgba(255,255,255,0.18)",
            width: "100%",
          }}
        >
          <Etiqueta texto={props.ubicacion} desde={48} style={{ fontSize: 28, letterSpacing: 6 }} />
          <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 18 }}>
            <NumeroAnimado
              valor={props.precio}
              desde={54}
              duracion={34}
              prefijo="$"
              style={{ color: COLORES.blanco, fontSize: 112, fontWeight: 800, lineHeight: 1 }}
            />
            <Etiqueta texto="MXN" desde={78} desplazar={false} style={{ fontSize: 38, letterSpacing: 3 }} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
