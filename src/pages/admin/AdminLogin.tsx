import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await signIn(email, password);

    if (authError) {
      setError("Credenciales incorrectas. Verifica tu email y contraseña.");
      setLoading(false);
    } else {
      navigate("/admin");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="text-cobalt">
            <rect x="4" y="8" width="12" height="20" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
            <rect x="20" y="4" width="12" height="24" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
            <line x1="10" y1="14" x2="10" y2="22" stroke="hsl(38 65% 50%)" strokeWidth="2" strokeLinecap="round" />
            <line x1="26" y1="10" x2="26" y2="22" stroke="hsl(38 65% 50%)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="font-heading text-xl font-bold tracking-wider text-cobalt">LUCE</span>
        </div>

        <div className="bg-card rounded-lg shadow-xl p-6 md:p-8">
          <h1 className="font-heading text-xl font-bold text-foreground text-center mb-1">
            Panel de Administración
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Inicia sesión para gestionar propiedades
          </p>

          {error && (
            <div className="flex items-center gap-2 bg-destructive/10 text-destructive text-sm rounded px-4 py-3 mb-4">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@luce.com"
                className="w-full border border-border rounded px-4 py-3 text-base sm:text-sm bg-transparent text-foreground outline-none focus:ring-2 focus:ring-cobalt/30 placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-border rounded px-4 py-3 text-base sm:text-sm bg-transparent text-foreground outline-none focus:ring-2 focus:ring-cobalt/30 placeholder:text-muted-foreground"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-cobalt text-primary-foreground font-semibold text-sm px-7 py-3.5 rounded hover:bg-cobalt-light transition-colors disabled:opacity-70"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <a href="/" className="hover:text-cobalt transition-colors">
            ← Volver a la landing page
          </a>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
