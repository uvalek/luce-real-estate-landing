import { useState } from "react";
import { Send } from "lucide-react";
import type { Lead } from "@/types";

const LeadForm = () => {
  const [formData, setFormData] = useState<Lead>({
    name: "",
    email: "",
    phone: "",
    interestType: "compra",
  });

  const handleChange = (field: keyof Lead, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: conectar con backend para enviar lead
    console.log("Lead enviado:", formData);
  };

  return (
    <section id="contact" className="py-16 md:py-24">
      <div className="container mx-auto px-4 lg:px-8 max-w-2xl">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold tracking-widest text-gold uppercase mb-2">
            — Contáctanos
          </p>
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
            ¿Interesado en una propiedad?
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Déjanos tus datos y un asesor se pondrá en contacto contigo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-lg shadow-xl p-6 md:p-8 space-y-5">
          <div>
            <label htmlFor="lead-name" className="block text-sm font-medium text-foreground mb-1.5">
              Nombre completo
            </label>
            <input
              id="lead-name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Tu nombre"
              className="w-full border border-border rounded px-4 py-3 text-base sm:text-sm bg-transparent text-foreground outline-none focus:ring-2 focus:ring-gold/50 placeholder:text-muted-foreground"
            />
          </div>

          <div>
            <label htmlFor="lead-email" className="block text-sm font-medium text-foreground mb-1.5">
              Correo electrónico
            </label>
            <input
              id="lead-email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="tu@email.com"
              className="w-full border border-border rounded px-4 py-3 text-base sm:text-sm bg-transparent text-foreground outline-none focus:ring-2 focus:ring-gold/50 placeholder:text-muted-foreground"
            />
          </div>

          <div>
            <label htmlFor="lead-phone" className="block text-sm font-medium text-foreground mb-1.5">
              Teléfono
            </label>
            <input
              id="lead-phone"
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="+52 222 000 0000"
              className="w-full border border-border rounded px-4 py-3 text-base sm:text-sm bg-transparent text-foreground outline-none focus:ring-2 focus:ring-gold/50 placeholder:text-muted-foreground"
            />
          </div>

          <div>
            <label htmlFor="lead-interest" className="block text-sm font-medium text-foreground mb-1.5">
              Tipo de interés
            </label>
            <select
              id="lead-interest"
              value={formData.interestType}
              onChange={(e) => handleChange("interestType", e.target.value)}
              className="w-full border border-border rounded px-4 py-3 text-base sm:text-sm bg-transparent text-foreground outline-none focus:ring-2 focus:ring-gold/50"
            >
              <option value="compra">Compra</option>
              <option value="renta">Renta</option>
              <option value="inversion">Inversión</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-cobalt text-primary-foreground font-semibold text-sm px-7 py-3.5 rounded hover:bg-cobalt-light transition-colors"
          >
            <Send size={16} />
            Enviar Información
          </button>
        </form>
      </div>
    </section>
  );
};

export default LeadForm;
