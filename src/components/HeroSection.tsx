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
            className="mt-8 group relative z-0 inline-flex cursor-pointer items-center justify-center gap-2.5 overflow-hidden rounded bg-cobalt px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-all duration-500
            before:absolute before:inset-0 before:-z-10 before:translate-x-[150%] before:translate-y-[150%] before:scale-[2.5] before:rounded-[100%] before:bg-gold before:transition-transform before:duration-1000 before:content-['']
            hover:scale-105 hover:text-cobalt hover:before:translate-x-[0%] hover:before:translate-y-[0%]
            active:scale-95"
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
