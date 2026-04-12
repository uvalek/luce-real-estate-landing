import { ArrowRight } from "lucide-react";
import heroImg from "@/assets/hero-house.jpg";
import property1 from "@/assets/property-1.jpg";
import property2 from "@/assets/property-2.jpg";
import property3 from "@/assets/property-3.jpg";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import PropertyCard from "@/components/PropertyCard";
import TestimonialSection from "@/components/TestimonialSection";
import Footer from "@/components/Footer";

const properties = [
  {
    image: property1,
    location: "Lomas de Angelópolis, Puebla",
    beds: 4,
    area: "320 m²",
    lot: "450 m²",
    price: "$12,500,000 MXN",
  },
  {
    image: property2,
    location: "La Vista Country Club, Puebla",
    beds: 5,
    area: "410 m²",
    lot: "600 m²",
    price: "$18,900,000 MXN",
  },
  {
    image: property3,
    location: "Sonterra, Angelópolis",
    beds: 3,
    area: "180 m²",
    lot: "—",
    price: "$6,200,000 MXN",
  },
];

const stats = [
  { value: "850+", label: "Propiedades Listadas" },
  { value: "3,200+", label: "Clientes Satisfechos" },
  { value: "45+", label: "Reconocimientos" },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative">
        <div className="container mx-auto px-4 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center py-12 lg:py-20">
          <div>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-cobalt">
              Encuentra la luz de tu nuevo hogar en Angelópolis
            </h1>
            <p className="mt-5 text-base text-muted-foreground max-w-md leading-relaxed">
              En LUCE te ayudamos a descubrir espacios iluminados y modernos que se adaptan a tu
              estilo de vida. Transparencia, sofisticación y confianza.
            </p>
            <button className="mt-8 inline-flex items-center gap-2 bg-cobalt text-primary-foreground font-semibold text-sm px-7 py-3.5 rounded hover:bg-cobalt-light transition-colors">
              Comenzar
            </button>
            <div className="mt-10 flex gap-8 md:gap-12">
              {stats.map((s) => (
                <div key={s.label}>
                  <p className="font-heading text-2xl md:text-3xl font-bold text-cobalt">
                    {s.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative hidden lg:block">
            <img
              src={heroImg}
              alt="Casa moderna de lujo en Angelópolis"
              width={1280}
              height={720}
              className="w-full h-[480px] object-cover rounded-lg shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Search */}
      <SearchBar />

      {/* Popular Properties */}
      <section id="properties" className="py-16 md:py-24">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-semibold tracking-widest text-gold uppercase mb-2">
                — Destacadas
              </p>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
                Nuestras Propiedades Destacadas
              </h2>
            </div>
            <a
              href="#"
              className="hidden sm:flex items-center gap-1 text-sm font-medium text-foreground/70 hover:text-cobalt transition-colors"
            >
              Explorar Todas <ArrowRight size={16} />
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((p) => (
              <PropertyCard key={p.location} {...p} />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <TestimonialSection />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
