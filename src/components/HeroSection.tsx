import { useState } from "react";
import { Search } from "lucide-react";
import SearchModal from "@/components/SearchModal";

const HeroSection = () => {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <section className="relative min-h-[600px] lg:min-h-[700px] flex items-center">
      {/* Background image — full bleed, no distortion */}
      <img
        src="/h1defi.jpg"
        alt="Edificio moderno en Angelópolis"
        className="absolute inset-0 w-full h-full object-cover object-right"
      />

      {/* White overlay — only visible on screens ≤890px for text readability */}
      <div className="absolute inset-0 bg-white/60 hero-overlay-mobile" />

      <div className="relative z-10 container mx-auto px-4 lg:px-8 pt-24 pb-16 lg:pt-28 lg:pb-24">
        <div className="max-w-2xl">
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-cobalt">
            Encuentra la luz de tu nuevo hogar en Angelópolis
          </h1>
          <p className="mt-5 text-base text-foreground/70 max-w-md leading-relaxed">
            En LUCE te ayudamos a descubrir espacios iluminados y modernos que se adaptan a tu
            estilo de vida. Transparencia, sofisticación y confianza.
          </p>
          <button
            onClick={() => setSearchOpen(true)}
            className="mt-8 group inline-flex items-center gap-2.5 bg-cobalt text-primary-foreground font-semibold text-sm px-7 py-3.5 rounded hover:bg-cobalt-light transition-all duration-300 hover:shadow-lg hover:shadow-cobalt/25 active:scale-[0.97]"
          >
            <Search size={16} className="transition-transform duration-300 group-hover:rotate-12" />
            Comenzar Búsqueda
          </button>
        </div>
      </div>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </section>
  );
};

export default HeroSection;
