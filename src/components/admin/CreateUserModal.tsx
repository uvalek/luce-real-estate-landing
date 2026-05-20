import { useState } from "react";
import {
  X,
  UserPlus,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface CreateUserModalProps {
  onClose: () => void;
}

/**
 * Modal para crear un nuevo usuario admin sin SQL.
 * Llama a la Edge Function `create-admin-user`, que verifica la sesión
 * del admin actual y crea el usuario con el service_role (lado servidor).
 */
const CreateUserModal = ({ onClose }: CreateUserModalProps) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneEmail, setDoneEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setError("Completa el nombre, el correo y la contraseña.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    const { data, error: fnError } = await supabase.functions.invoke(
      "create-admin-user",
      { body: { email: email.trim(), password, full_name: fullName.trim() } },
    );
    setLoading(false);

    // The function returns { error } in the body for handled failures.
    const apiError =
      (data && (data as { error?: string }).error) ||
      (fnError ? fnError.message : null);

    if (apiError) {
      setError(apiError);
      return;
    }
    setDoneEmail(email.trim());
  };

  const labelClass = "block text-sm font-semibold text-foreground/75 mb-2 ml-1";
  const fieldBox =
    "flex items-center gap-3 rounded-2xl border border-border/70 bg-white px-4 transition-all duration-200 hover:border-cobalt/30 focus-within:border-cobalt/55 focus-within:ring-4 focus-within:ring-gold/10";
  const bareInput =
    "flex-1 min-w-0 bg-transparent py-3 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/50 placeholder:font-normal";

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-cobalt/70 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-[0_40px_80px_-20px_rgba(15,23,42,0.55)] border border-border/40 p-6 md:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cobalt/15 to-cobalt/5 flex items-center justify-center border border-cobalt/15 shadow-sm">
            <UserPlus size={17} className="text-cobalt" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold text-foreground">
              Nuevo usuario
            </h2>
            <p className="text-xs text-muted-foreground">
              Crea un acceso al panel de administración
            </p>
          </div>
        </div>

        {doneEmail ? (
          /* ── Success state ── */
          <div className="text-center py-4">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 size={28} className="text-emerald-600" />
            </div>
            <h3 className="font-heading text-base font-bold text-foreground mb-1">
              Usuario creado
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              <span className="font-semibold text-foreground">{doneEmail}</span>{" "}
              ya puede iniciar sesión con la contraseña asignada.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setDoneEmail(null);
                  setFullName("");
                  setEmail("");
                  setPassword("");
                }}
                className="flex-1 rounded-full border border-cobalt/20 bg-cobalt/[0.03] px-4 py-3 text-xs font-bold uppercase tracking-wide text-cobalt hover:bg-cobalt/10 transition-colors"
              >
                Crear otro
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-full bg-cobalt px-4 py-3 text-xs font-bold uppercase tracking-wide text-primary-foreground hover:shadow-lg transition-all"
              >
                Listo
              </button>
            </div>
          </div>
        ) : (
          /* ── Form ── */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Nombre completo</label>
              <div className={fieldBox}>
                <User size={16} className="text-gold flex-shrink-0" />
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej. María González López"
                  className={bareInput}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Correo electrónico</label>
              <div className={fieldBox}>
                <Mail size={16} className="text-gold flex-shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className={bareInput}
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Contraseña</label>
              <div className={fieldBox}>
                <Lock size={16} className="text-gold flex-shrink-0" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={bareInput}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="text-muted-foreground/60 hover:text-foreground transition-colors flex-shrink-0"
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-300/70 bg-red-50 px-3.5 py-3">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-px" />
                <p className="text-xs text-red-700/90 leading-relaxed">{error}</p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-cobalt px-5 py-3 text-xs font-bold uppercase tracking-wide text-primary-foreground hover:shadow-[0_14px_28px_-12px_rgba(28,55,140,0.6)] transition-all disabled:opacity-70"
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <UserPlus size={14} />
                )}
                Crear usuario
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateUserModal;
