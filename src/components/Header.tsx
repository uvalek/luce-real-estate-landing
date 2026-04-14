import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Inicio", href: "#" },
    { label: "Quiénes Somos", href: "#about" },
    { label: "Propiedades", href: "#properties" },
    { label: "Agentes", href: "#agents" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "bg-card/95 backdrop-blur border-b border-border"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between py-4 px-4 lg:px-8 pt-[max(1rem,env(safe-area-inset-top))]">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="text-cobalt">
            <rect x="4" y="8" width="12" height="20" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
            <rect x="20" y="4" width="12" height="24" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
            <line x1="10" y1="14" x2="10" y2="22" stroke="hsl(38 65% 50%)" strokeWidth="2" strokeLinecap="round" />
            <line x1="26" y1="10" x2="26" y2="22" stroke="hsl(38 65% 50%)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="font-heading text-xl font-bold tracking-wider text-cobalt">LUCE</span>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-foreground/80 hover:text-cobalt transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href="https://cal.com/alek-nava-i4gvq6/visita-propiedad-programada?overlayCalendar=true"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:inline-flex items-center px-5 py-2.5 border-2 border-cobalt text-cobalt text-sm font-semibold rounded hover:bg-cobalt hover:text-primary-foreground transition-colors"
        >
          Agendar Cita
        </a>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-foreground p-2 -mr-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-card border-t border-border px-4 pb-4">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="block py-3 text-sm font-medium text-foreground/80 hover:text-cobalt"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a
            href="https://cal.com/alek-nava-i4gvq6/visita-propiedad-programada?overlayCalendar=true"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block text-center px-5 py-2.5 border-2 border-cobalt text-cobalt text-sm font-semibold rounded"
          >
            Agendar Cita
          </a>
        </div>
      )}
    </header>
  );
};

export default Header;
