import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Quote } from "lucide-react";

// ─── Equipo LUCE — agentes inmobiliarios ───
const testimonials = [
  {
    quote:
      "Acompaño a cada cliente desde la primera visita hasta la firma de escrituras. Mi prioridad es que encuentren un hogar que refleje su estilo de vida en Angelópolis, con total transparencia en cada paso.",
    name: "Ricardo Méndez",
    designation: "Fundador y Asesor Senior · Angelópolis",
    src: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1888&auto=format&fit=crop",
  },
  {
    quote:
      "Conozco cada colonia de Tlaxcala como la palma de mi mano. Trabajo con familias que buscan tranquilidad sin alejarse de la ciudad, y me enorgullece encontrarles esa propiedad que sienten suya desde el primer momento.",
    name: "Valeria Hernández",
    designation: "Asesora Inmobiliaria · Tlaxcala y Apizaco",
    src: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1888&auto=format&fit=crop",
  },
  {
    quote:
      "Asesoro a clientes que buscan inversión en Cholula y Puebla capital. Analizo plusvalía, rentabilidad y tipos de crédito para que cada decisión tenga sustento real, no solo intuición.",
    name: "Adrián Castillo",
    designation: "Especialista en Inversión · Cholula y Puebla",
    src: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop",
  },
  {
    quote:
      "Me especializo en propiedades únicas: residencias con jardín, terrenos con potencial y casas patrimoniales. Cada inmueble tiene una historia, y mi trabajo es contarla bien para conectarla con la familia indicada.",
    name: "Camila Ortega",
    designation: "Asesora de Propiedades Premium · Huamantla",
    src: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1888&auto=format&fit=crop",
  },
  {
    quote:
      "Atiendo a quienes buscan su primera casa con crédito Infonavit, Fovissste o bancario. Mi compromiso es que entiendan cada cláusula, cada cuota y cada beneficio antes de firmar.",
    name: "Mauricio Reyes",
    designation: "Asesor de Crédito Hipotecario · Tlaxco y Contla",
    src: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=1887&auto=format&fit=crop",
  },
];

type Testimonial = {
  quote: string;
  name: string;
  designation: string;
  src: string;
};

const AnimatedTestimonials = ({
  testimonials,
  autoplay = true,
}: {
  testimonials: Testimonial[];
  autoplay?: boolean;
}) => {
  const [active, setActive] = useState(0);

  const handleNext = React.useCallback(() => {
    setActive((prev) => (prev + 1) % testimonials.length);
  }, [testimonials.length]);

  const handlePrev = () => {
    setActive((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  useEffect(() => {
    if (!autoplay) return;
    const interval = setInterval(handleNext, 6000);
    return () => clearInterval(interval);
  }, [autoplay, handleNext]);

  const isActive = (index: number) => index === active;

  // Stable rotations per item so they don't change on re-render
  const rotations = React.useMemo(
    () => testimonials.map(() => `${Math.floor(Math.random() * 16) - 8}deg`),
    [testimonials],
  );

  return (
    <div className="mx-auto max-w-sm px-4 py-16 font-sans antialiased md:max-w-5xl md:px-8 md:py-24 lg:px-12">
      <div className="text-center mb-12">
        <p className="text-xs font-semibold tracking-[0.25em] text-gold uppercase mb-3">
          — Conoce al equipo
        </p>
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground">
          Asesores que conocen <span className="text-gold">tu zona</span>
        </h2>
        <p className="mt-4 text-sm md:text-base text-primary-foreground/70 max-w-2xl mx-auto leading-relaxed">
          Cada propiedad merece un especialista que entienda el mercado local. Conoce a las personas que harán de tu compra una experiencia transparente y cercana.
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-y-12 md:grid-cols-2 md:gap-x-16 items-center">
        {/* ── Image stack ── */}
        <div className="flex items-center justify-center">
          <div className="relative h-80 md:h-96 w-full max-w-sm">
            <AnimatePresence>
              {testimonials.map((t, index) => (
                <motion.div
                  key={t.src}
                  initial={{ opacity: 0, scale: 0.9, y: 50, rotate: rotations[index] }}
                  animate={{
                    opacity: isActive(index) ? 1 : 0.45,
                    scale: isActive(index) ? 1 : 0.92,
                    y: isActive(index) ? 0 : 20,
                    zIndex: isActive(index)
                      ? testimonials.length
                      : testimonials.length - Math.abs(index - active),
                    rotate: isActive(index) ? "0deg" : rotations[index],
                  }}
                  exit={{ opacity: 0, scale: 0.9, y: -50 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 origin-bottom"
                  style={{ perspective: "1000px" }}
                >
                  <img
                    src={t.src}
                    alt={t.name}
                    width={500}
                    height={500}
                    draggable={false}
                    className="h-full w-full rounded-[2.5rem] object-cover shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] ring-1 ring-white/20"
                    onError={(e) => {
                      e.currentTarget.src = `https://placehold.co/500x500/1c378c/ffffff?text=${encodeURIComponent(
                        t.name.charAt(0),
                      )}`;
                      e.currentTarget.onerror = null;
                    }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Text + controls ── */}
        <div className="flex flex-col justify-center py-4">
          <Quote size={36} className="text-gold mb-5 opacity-90" />
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="flex flex-col"
            >
              <p className="text-base md:text-lg text-primary-foreground/90 leading-relaxed">
                "{testimonials[active].quote}"
              </p>
              <div className="mt-8 pt-6 border-t border-white/10">
                <h3 className="font-heading text-xl md:text-2xl font-bold text-primary-foreground">
                  {testimonials[active].name}
                </h3>
                <p className="text-sm text-gold/90 mt-1 font-medium">
                  {testimonials[active].designation}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center gap-3 pt-8">
            <button
              onClick={handlePrev}
              aria-label="Asesor anterior"
              className="group flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/15 transition-all hover:bg-gold hover:border-gold focus:outline-none focus:ring-2 focus:ring-gold/50"
            >
              <ArrowLeft className="h-4 w-4 text-primary-foreground transition-transform duration-300 group-hover:-translate-x-1 group-hover:text-cobalt" />
            </button>
            <button
              onClick={handleNext}
              aria-label="Siguiente asesor"
              className="group flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/15 transition-all hover:bg-gold hover:border-gold focus:outline-none focus:ring-2 focus:ring-gold/50"
            >
              <ArrowRight className="h-4 w-4 text-primary-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-cobalt" />
            </button>
            <div className="ml-3 flex items-center gap-1.5">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  aria-label={`Ver asesor ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    isActive(i)
                      ? "bg-gold w-6"
                      : "bg-primary-foreground/25 w-1.5 hover:bg-primary-foreground/50"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export function Component() {
  return (
    <section className="relative overflow-hidden bg-cobalt">
      {/* Decorative animated grid */}
      <style>
        {`
          @keyframes animate-grid-move {
            0% { background-position: 0% 50%; }
            100% { background-position: 100% 50%; }
          }
          .luce-animated-grid {
            width: 200%;
            height: 200%;
            background-image:
              linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px);
            background-size: 3rem 3rem;
            animation: animate-grid-move 40s linear infinite alternate;
          }
        `}
      </style>
      <div className="luce-animated-grid absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />

      {/* Soft gold glow */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-cobalt-light/30 blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <AnimatedTestimonials testimonials={testimonials} />
      </div>
    </section>
  );
}

export default Component;
