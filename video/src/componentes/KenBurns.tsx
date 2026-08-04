import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Foto a pantalla completa con un zoom lento (efecto Ken Burns) y un paneo
 * suave. La dirección alterna por índice para que dos escenas seguidas no se
 * muevan igual.
 */
export const KenBurns: React.FC<{
  src: string;
  indice?: number;
  /** Zoom final. 1.14 = 14 % de acercamiento a lo largo de la escena. */
  zoom?: number;
}> = ({ src, indice = 0, zoom = 1.14 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const acerca = indice % 2 === 0;
  const escala = interpolate(
    frame,
    [0, durationInFrames],
    acerca ? [1, zoom] : [zoom, 1],
    { extrapolateRight: "clamp" },
  );

  // Paneo lateral suave, alternando el sentido.
  const direccion = indice % 4 < 2 ? 1 : -1;
  const x = interpolate(frame, [0, durationInFrames], [0, 26 * direccion], {
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [0, durationInFrames], [0, -18], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#0b1424" }}>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${escala}) translate(${x}px, ${y}px)`,
          transformOrigin: "center center",
        }}
      />
    </AbsoluteFill>
  );
};

/** Degradados que garantizan que el texto se lea sobre cualquier foto. */
export const Velos: React.FC<{ inferiorDesde?: number }> = ({ inferiorDesde = 45 }) => (
  <>
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(to bottom, rgba(9,16,32,0.78) 0%, rgba(9,16,32,0.35) 18%, rgba(9,16,32,0) 34%)",
      }}
    />
    <AbsoluteFill
      style={{
        background: `linear-gradient(to bottom, rgba(9,16,32,0) ${inferiorDesde}%, rgba(9,16,32,0.72) ${
          inferiorDesde + 25
        }%, rgba(7,12,24,0.96) 100%)`,
      }}
    />
  </>
);
