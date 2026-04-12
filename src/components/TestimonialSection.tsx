import agentImg from "@/assets/agent.jpg";
import { Quote } from "lucide-react";

const TestimonialSection = () => {
  return (
    <section className="bg-cobalt py-16 md:py-24">
      <div className="container mx-auto px-4 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="flex items-center gap-5">
          <img
            src={agentImg}
            alt="Ricardo Méndez, Fundador de LUCE"
            loading="lazy"
            width={512}
            height={512}
            className="w-20 h-20 rounded-full object-cover border-2 border-gold"
          />
          <div>
            <p className="font-heading text-base font-semibold text-primary-foreground">
              Ricardo Méndez
            </p>
            <p className="text-sm text-primary-foreground/60">Fundador, LUCE Real Estate</p>
          </div>
        </div>
        <div className="relative">
          <Quote size={32} className="text-gold mb-4" />
          <p className="text-primary-foreground/90 text-base leading-relaxed">
            En LUCE creemos que cada hogar debe ser un reflejo de luz y bienestar. Nuestro compromiso
            es acompañarte con transparencia y calidez para encontrar el espacio que mereces en
            Angelópolis, donde el lujo se vive con autenticidad.
          </p>
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;
