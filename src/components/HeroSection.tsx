import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { BlurFade } from "@/components/ui/blur-fade";
import { AnimatedLayerButton } from "@/components/ui/animated-layer-button";

// Modal is only loaded when the user opens it.
const SearchModal = lazy(() => import("@/components/SearchModal"));

const ZONAS = [
  "Tlaxcala",
  "Cholula",
  "Apizaco",
  "Huamantla",
  "Xaloztoc",
  "Contla",
  "Angelópolis",
  "Tlaxco",
];

const HeroSection = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [ctaPressed, setCtaPressed] = useState(false);
  const [zonaIdx, setZonaIdx] = useState(0);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setZonaIdx((i) => (i + 1) % ZONAS.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (openTimer.current) clearTimeout(openTimer.current);
    };
  }, []);

  const handleCtaClick = () => {
    // On touch devices (no hover) play the button animation first, then open the modal.
    const isTouch =
      typeof window !== "undefined" &&
      window.matchMedia("(hover: none)").matches;

    if (isTouch) {
      setCtaPressed(true);
      if (openTimer.current) clearTimeout(openTimer.current);
      openTimer.current = setTimeout(() => {
        setSearchOpen(true);
        // Release the pressed state after the modal opens
        setTimeout(() => setCtaPressed(false), 350);
      }, 550);
    } else {
      setSearchOpen(true);
    }
  };

  const zona = ZONAS[zonaIdx];

  return (
    <section className="relative min-h-[600px] lg:min-h-[700px] flex items-center">
      {/* Background image — full bleed, no distortion */}
      <img
        src="/h1defi.jpg"
        alt="Edificio moderno en Angelópolis"
        decoding="async"
        fetchPriority="high"
        className="absolute inset-0 w-full h-full object-cover object-right"
      />

      {/* White overlay — only visible on screens ≤890px for text readability */}
      <div className="absolute inset-0 bg-white/60 hero-overlay-mobile" />

      {/* Bottom fade-to-white — softens the edge between hero image and the page */}
      <div className="absolute inset-x-0 bottom-0 h-32 md:h-40 bg-gradient-to-b from-transparent via-white/60 to-white pointer-events-none z-[1]" />

      <div className="relative z-10 container mx-auto px-4 lg:px-8 pt-24 pb-16 lg:pt-28 lg:pb-24">
        <div className="max-w-2xl">
          <BlurFade delay={0.15} duration={0.7} yOffset={10} blur="10px">
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-cobalt">
              Encuentra la luz de tu nuevo hogar en{" "}
              <span
                className="relative inline-flex overflow-hidden align-bottom"
                style={{ height: "1.2em", lineHeight: "1.2em" }}
                aria-live="polite"
              >
                <span
                  key={zona}
                  className="inline-block animate-word-roll-in whitespace-nowrap text-cobalt"
                >
                  {zona}
                </span>
              </span>
            </h1>
          </BlurFade>

          <BlurFade delay={0.5} duration={0.6} yOffset={8} blur="6px">
            <p className="mt-5 text-base text-foreground/70 max-w-md leading-relaxed">
              En LUCE te ayudamos a descubrir espacios iluminados y modernos que se adaptan a tu
              estilo de vida. Transparencia, sofisticación y confianza.
            </p>
          </BlurFade>

          <BlurFade delay={0.75} duration={0.6} yOffset={8} blur="6px">
            <div className="mt-10">
              <AnimatedLayerButton
                onClick={handleCtaClick}
                forceActive={ctaPressed}
                aria-label="Comenzar búsqueda"
              >
                Comenzar Búsqueda
              </AnimatedLayerButton>
            </div>
          </BlurFade>
        </div>
      </div>

      {searchOpen && (
        <Suspense fallback={null}>
          <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
        </Suspense>
      )}
    </section>
  );
};

export default HeroSection;
