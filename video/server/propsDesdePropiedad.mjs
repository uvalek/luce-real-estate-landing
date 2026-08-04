/**
 * Traduce una fila de la tabla `propiedades` a las props del reel.
 *
 * En JavaScript plano (no TS) porque lo usan el servidor de render y el script
 * de render local, que corren en Node sin compilación.
 */

/** Espejo de `src/data/amenidades.ts` del dashboard. */
const AMENIDAD_LABELS = {
  alberca: "Alberca",
  jardin: "Jardín",
  seguridad_24h: "Seguridad 24h",
  gimnasio: "Gimnasio",
  roof_garden: "Roof garden",
  elevador: "Elevador",
  terraza: "Terraza",
  area_juegos: "Área de juegos",
  salon_eventos: "Salón de eventos",
  caseta_vigilancia: "Caseta de vigilancia",
  amueblado: "Amueblado",
  acepta_mascotas: "Acepta mascotas",
  cisterna: "Cisterna",
  cuarto_servicio: "Cuarto de servicio",
  vista_panoramica: "Vista panorámica",
  paneles_solares: "Paneles solares",
};

export function textoOperacion(tipoOferta) {
  const v = (tipoOferta || "").trim().toUpperCase();
  if (v === "VENTA") return "En Venta";
  if (v === "RENTA") return "En Renta";
  if (v === "RENTA Y VENTA") return "En Renta y Venta";
  return "Disponible";
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function propsDesdePropiedad(p) {
  const galeria = p.galeria ?? [];
  // La portada primero: abre el reel y se reutiliza en el cierre.
  const portada = galeria.filter((f) => f.categoria === "portada");
  const resto = galeria.filter((f) => f.categoria !== "portada");

  return {
    nombre: p.nombre ?? "Propiedad",
    operacion: textoOperacion(p.tipo_oferta),
    precio: num(p.precio),
    ubicacion:
      [p.municipio, p.estado].filter(Boolean).join(", ") || p.zona || p.direccion || "México",
    recamaras: num(p.recamaras),
    banos: num(p.banos),
    metrosCuadrados: num(p.metros_cuadrados),
    metrosTerreno: num(p.metros_terreno),
    estacionamientos: num(p.estacionamientos),
    amenidades: (p.amenidades ?? []).filter(Boolean).map((a) => AMENIDAD_LABELS[a] ?? a),
    fotos: [...portada, ...resto],
    asesor: {
      nombre: p.asesor_asignado ?? "",
      telefono: p.asesor_telefono ?? "",
      email: p.asesor_email ?? "",
    },
    // El audio lo rellena el servidor después de generar la voz.
    narracionUrl: null,
    narracionSegundos: 0,
    conMusica: true,
  };
}

/** Nombre de archivo seguro a partir del nombre de la propiedad. */
export function slug(s) {
  return (
    (s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "propiedad"
  );
}
