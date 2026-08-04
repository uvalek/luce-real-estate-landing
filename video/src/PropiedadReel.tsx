import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { Portada } from "./escenas/Portada";
import { FotoConDato } from "./escenas/FotoConDato";
import { Cierre } from "./escenas/Cierre";
import { DUR, MAX_ESCENAS, MIN_ESCENAS, repartirDatos, type ReelProps } from "./tema";

// Solo los pesos que se usan: cargar la familia completa dispara ~90 peticiones
// de red por frame y alarga el render.
const { fontFamily } = loadFont("normal", {
  weights: ["600", "700", "800"],
  subsets: ["latin"],
});

/**
 * Fotos de las escenas intermedias. Se prefieren las extras; si no alcanzan
 * para llegar a la duración mínima, se repiten en ciclo (cada repetición lleva
 * un dato distinto encima).
 */
export const fotosIntermedias = (props: ReelProps) => {
  const extras = props.fotos.filter((f) => f.categoria !== "portada");
  const disponibles = extras.length > 0 ? extras : props.fotos.slice(0, 1);
  if (disponibles.length === 0) return [];

  const cuantas = Math.min(Math.max(disponibles.length, MIN_ESCENAS), MAX_ESCENAS);
  return Array.from({ length: cuantas }, (_, i) => disponibles[i % disponibles.length]);
};

/**
 * Duración total. Las transiciones se solapan con las escenas, así que restan
 * del total en vez de sumar.
 */
export const duracionTotal = (props: ReelProps): number => {
  const n = fotosIntermedias(props).length;
  const escenas = DUR.portada + n * DUR.foto + DUR.cierre;
  const transiciones = (n + 1) * DUR.transicion;
  return Math.round(escenas - transiciones);
};

export const PropiedadReel: React.FC<ReelProps> = (props) => {
  const portada = props.fotos.find((f) => f.categoria === "portada")?.url ?? props.fotos[0]?.url ?? null;
  const intermedias = fotosIntermedias(props);
  const datos = repartirDatos(props, intermedias);

  return (
    <AbsoluteFill style={{ fontFamily, backgroundColor: "#0b1424" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={DUR.portada}>
          <Portada props={props} foto={portada} />
        </TransitionSeries.Sequence>

        {intermedias.map((foto, i) => (
          <React.Fragment key={`${foto.url}-${i}`}>
            <TransitionSeries.Transition
              // Se alterna el tipo de corte para que el reel no se sienta monótono.
              presentation={i % 2 === 0 ? fade() : slide({ direction: "from-right" })}
              timing={linearTiming({ durationInFrames: DUR.transicion })}
            />
            <TransitionSeries.Sequence durationInFrames={DUR.foto}>
              <FotoConDato
                foto={foto.url}
                categoria={foto.categoria}
                dato={datos[i]}
                indice={i}
              />
            </TransitionSeries.Sequence>
          </React.Fragment>
        ))}

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: DUR.transicion })}
        />
        <TransitionSeries.Sequence durationInFrames={DUR.cierre}>
          <Cierre props={props} foto={portada} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
