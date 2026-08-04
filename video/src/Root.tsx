import React from "react";
import { Composition } from "remotion";
import { PropiedadReel, duracionTotal } from "./PropiedadReel";
import { ALTO, ANCHO, FPS, reelSchema, type ReelProps } from "./tema";

/** Datos de ejemplo para abrir el estudio (`npm run studio`) sin backend. */
const EJEMPLO: ReelProps = {
  nombre: "Casa Residencial San Andrés",
  operacion: "En Venta",
  precio: 2_800_000,
  ubicacion: "San Andrés Cholula, Puebla",
  recamaras: 4,
  banos: 3,
  metrosCuadrados: 180,
  metrosTerreno: 240,
  estacionamientos: 2,
  amenidades: ["Alberca", "Jardín", "Seguridad 24h"],
  fotos: [
    {
      url: "https://lrxwvyilfobwyndikqpq.supabase.co/storage/v1/object/public/fotospropiedades/ejemplo/portada.jpg",
      categoria: "portada",
    },
  ],
  asesor: {
    nombre: "Ernesto López",
    telefono: "241 123 4567",
    email: "ernesto@luce.mx",
  },
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="PropiedadReel"
    component={PropiedadReel}
    width={ANCHO}
    height={ALTO}
    fps={FPS}
    schema={reelSchema}
    // La duración depende de cuántas fotos tenga la propiedad.
    durationInFrames={duracionTotal(EJEMPLO)}
    defaultProps={EJEMPLO}
    calculateMetadata={({ props }) => ({
      durationInFrames: duracionTotal(props),
    })}
  />
);
