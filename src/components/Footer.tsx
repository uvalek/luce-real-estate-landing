import { Building2, Landmark, Shield, Gem } from "lucide-react";

const partners = [
  { name: "Grupo Proyecta", icon: Building2 },
  { name: "BBVA Premium", icon: Landmark },
  { name: "Desarrollos Atlas", icon: Shield },
  { name: "Santander Select", icon: Gem },
];

const Footer = () => {
  return (
    <footer className="bg-stone py-10 border-t border-border">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16 opacity-60">
          {partners.map((p) => (
            <div key={p.name} className="flex items-center gap-2 text-foreground">
              <p.icon size={22} />
              <span className="font-heading text-xs font-semibold tracking-widest uppercase">
                {p.name}
              </span>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-8">
          © 2026 LUCE Real Estate — Angelópolis, Puebla. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
