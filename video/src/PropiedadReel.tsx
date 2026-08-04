import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { Portada } from "./escenas/Portada";
import { FotoConDato } from "./escenas/FotoConDato";
import { Cierre } from "./escenas/Cierre";
import { DUR, FPS, MAX_ESCENAS, MIN_ESCENAS, repartirDatos, type ReelProps } from "./tema";

// Solo los pesos que se usan: cargar la familia completa dispara ~90 peticiones
// de red por frame y alarga el render.
const { fontFamily } = loadFont("normal", {
  weights: ["600", "700", "800"],
  subsets: ["latin"],
});

/** La narración arranca un poco después del primer frame, no de golpe. */
const INICIO_NARRACION = 12;
/** Silencio de cortesía después de que termina de hablar. */
const COLA_NARRACION = 24;

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

/** Duración de las escenas tal cual, sin contar la narración. */
const framesDeEscenas = (props: ReelProps): number => {
  const n = fotosIntermedias(props).length;
  const escenas = DUR.portada + n * DUR.foto + DUR.cierre;
  // Las transiciones se solapan con las escenas, así que restan del total.
  const transiciones = (n + 1) * DUR.transicion;
  return Math.round(escenas - transiciones);
};

/**
 * Cuánto hay que alargar el cierre para que la voz termine dentro del video.
 * El guion se pide a la medida, así que casi siempre da 0; esto es la red por
 * si la voz sale más larga de lo previsto.
 */
export const extraCierre = (props: ReelProps): number => {
  if (!props.narracionUrl || props.narracionSegundos <= 0) return 0;
  const necesario = INICIO_NARRACION + Math.ceil(props.narracionSegundos * FPS) + COLA_NARRACION;
  return Math.max(0, necesario - framesDeEscenas(props));
};

export const duracionTotal = (props: ReelProps): number =>
  framesDeEscenas(props) + extraCierre(props);

export const PropiedadReel: React.FC<ReelProps> = (props) => {
  const portada = props.fotos.find((f) => f.categoria === "portada")?.url ?? props.fotos[0]?.url ?? null;
  const intermedias = fotosIntermedias(props);
  const datos = repartirDatos(props, intermedias);

  const total = duracionTotal(props);
  const framesNarracion = props.narracionUrl
    ? Math.ceil(props.narracionSegundos * FPS)
    : 0;
  const finNarracion = INICIO_NARRACION + framesNarracion;

  /**
   * La música baja mientras habla la narradora y sube al final. Sin esto la
   * pista compite con la voz y no se entiende ninguna de las dos.
   */
  const volumenMusica = (frame: number): number => {
    const base = props.narracionUrl
      ? interpolate(
          frame,
          [INICIO_NARRACION - 12, INICIO_NARRACION, finNarracion, finNarracion + 18],
          [0.5, 0.15, 0.15, 0.45],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        )
      : 0.5;

    // Entradas y salidas suaves de la propia pista.
    const entrada = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
    const salida = interpolate(frame, [total - 30, total], [1, 0], { extrapolateLeft: "clamp" });
    return base * entrada * salida;
  };

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
        <TransitionSeries.Sequence durationInFrames={DUR.cierre + extraCierre(props)}>
          <Cierre props={props} foto={portada} />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {props.conMusica && (
        <Audio src={staticFile("musica/fondo-luce.mp3")} loop volume={volumenMusica} />
      )}

      {props.narracionUrl && (
        <Sequence from={INICIO_NARRACION}>
          <Audio src={props.narracionUrl} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
