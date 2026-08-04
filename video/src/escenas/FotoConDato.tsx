import React from "react";
import { AbsoluteFill } from "remotion";
import { KenBurns, Velos } from "../componentes/KenBurns";
import { Etiqueta, LineaDorada, Marca, NumeroAnimado, TextoRevelado } from "../componentes/Animaciones";
import { CATEGORIA_LABELS, COLORES, type DatoDestacado } from "../tema";

/**
 * Escena intermedia: una foto del inmueble con el nombre del espacio y un dato
 * de la propiedad. El dato se anima como número cuando es un número puro y
 * como texto cuando es una palabra (una amenidad, por ejemplo).
 */
export const FotoConDato: React.FC<{
  foto: string;
  categoria: string;
  dato: DatoDestacado | null;
  indice: number;
}> = ({ foto, categoria, dato, indice }) => {
  const titulo = CATEGORIA_LABELS[categoria] ?? categoria.replace(/_/g, " ");

  // "3" o "180 m²" → se cuenta. "Alberca" → se revela como texto.
  const match = dato ? /^(\d[\d,]*)(.*)$/.exec(dato.valor.replace(/,/g, "")) : null;
  const esNumero = Boolean(match);
  const valorNumerico = match ? Number(match[1]) : 0;
  const sufijo = match ? match[2] : "";

  return (
    <AbsoluteFill style={{ backgroundColor: COLORES.cobalt }}>
      <KenBurns src={foto} indice={indice + 1} />
      <Velos inferiorDesde={48} />
      <Marca />

      <AbsoluteFill
        style={{
          padding: 84,
          justifyContent: "flex-end",
          alignItems: "flex-start",
          gap: 22,
        }}
      >
        <LineaDorada desde={2} ancho={110} />

        <TextoRevelado
          texto={titulo}
          desde={6}
          style={{
            color: COLORES.blanco,
            fontSize: 84,
            fontWeight: 800,
            letterSpacing: 3,
            textTransform: "uppercase",
            lineHeight: 1.05,
          }}
        />

        {dato && (
          <div style={{ marginTop: 6 }}>
            <Etiqueta texto={dato.etiqueta} desde={20} style={{ fontSize: 27, letterSpacing: 7 }} />
            <div style={{ marginTop: 12 }}>
              {esNumero ? (
                <NumeroAnimado
                  valor={valorNumerico}
                  desde={26}
                  duracion={30}
                  sufijo={sufijo}
                  style={{ color: COLORES.blanco, fontSize: 92, fontWeight: 800, lineHeight: 1 }}
                />
              ) : (
                <TextoRevelado
                  texto={dato.valor}
                  desde={26}
                  style={{
                    color: COLORES.blanco,
                    fontSize: 76,
                    fontWeight: 800,
                    lineHeight: 1.05,
                  }}
                />
              )}
            </div>
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
