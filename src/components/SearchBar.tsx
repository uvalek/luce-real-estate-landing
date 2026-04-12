import { MapPin, Home, DollarSign, Search } from "lucide-react";

const SearchBar = () => {
  return (
    <section className="relative z-10 -mt-10 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="bg-card rounded-lg shadow-xl p-6 md:p-8">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-5">
            Busca propiedades disponibles
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 border border-border rounded px-4 py-3">
              <span className="text-sm text-foreground/70 flex-1">Ubicación</span>
              <MapPin size={18} className="text-gold" />
            </div>
            <div className="flex items-center gap-3 border border-border rounded px-4 py-3">
              <span className="text-sm text-foreground/70 flex-1">Tipo de Propiedad</span>
              <Home size={18} className="text-gold" />
            </div>
            <div className="flex items-center gap-3 border border-border rounded px-4 py-3">
              <span className="text-sm text-foreground/70 flex-1">Presupuesto</span>
              <DollarSign size={18} className="text-gold" />
            </div>
            <button className="flex items-center justify-center gap-2 bg-gold text-accent-foreground font-semibold text-sm rounded px-6 py-3 hover:bg-gold-light transition-colors">
              <Search size={16} />
              Buscar Ahora
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SearchBar;
