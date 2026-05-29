import { useEffect, useState } from "react";
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Smartphone,
} from "lucide-react";
import {
  enrollTotp,
  verifyEnrollment,
  getVerifiedTotpFactor,
  disableTotp,
  type TotpEnrollment,
} from "@/lib/mfa";

interface MfaSetupModalProps {
  onClose: () => void;
}

/**
 * Modal para activar / desactivar la verificación en dos pasos (2FA con TOTP).
 *
 * Si el usuario YA tiene 2FA → muestra estado "activo" + opción de desactivar.
 * Si NO lo tiene → genera un QR (para escanear con Authy) y pide un código
 * para confirmar el alta.
 */
const MfaSetupModal = ({ onClose }: MfaSetupModalProps) => {
  const [checking, setChecking] = useState(true);
  const [activeFactorId, setActiveFactorId] = useState<string | null>(null);

  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  // Al abrir: ¿ya tiene 2FA?
  useEffect(() => {
    let alive = true;
    (async () => {
      const factor = await getVerifiedTotpFactor();
      if (!alive) return;
      setActiveFactorId(factor?.id ?? null);
      setChecking(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const startEnroll = async () => {
    setError(null);
    setBusy(true);
    try {
      const e = await enrollTotp();
      setEnrollment(e);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar el 2FA.");
    } finally {
      setBusy(false);
    }
  };

  const confirmEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollment) return;
    setError(null);
    setBusy(true);
    try {
      await verifyEnrollment(enrollment.factorId, code);
      setDone(true);
      setActiveFactorId(enrollment.factorId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código incorrecto.");
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    if (!activeFactorId) return;
    setError(null);
    setBusy(true);
    try {
      await disableTotp(activeFactorId);
      setActiveFactorId(null);
      setEnrollment(null);
      setDone(false);
      setCode("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo desactivar. Cierra sesión y vuelve a entrar con tu código.",
      );
    } finally {
      setBusy(false);
    }
  };

  const copySecret = async () => {
    if (!enrollment) return;
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-cobalt/70 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-[0_40px_80px_-20px_rgba(15,23,42,0.55)] border border-border/40 p-6 md:p-7 max-h-[90vh] overflow-y-auto"
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
            <ShieldCheck size={17} className="text-cobalt" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold text-foreground">
              Verificación en dos pasos
            </h2>
            <p className="text-xs text-muted-foreground">
              Protege tu cuenta con un código de tu teléfono
            </p>
          </div>
        </div>

        {checking ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={22} className="animate-spin text-cobalt" />
          </div>
        ) : done ? (
          /* ── Éxito ── */
          <div className="text-center py-4">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 size={28} className="text-emerald-600" />
            </div>
            <h3 className="font-heading text-base font-bold text-foreground mb-1">
              2FA activado
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              La próxima vez que inicies sesión te pediremos un código de tu app
              de autenticación.
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-full bg-cobalt px-4 py-3 text-xs font-bold uppercase tracking-wide text-primary-foreground hover:shadow-lg transition-all"
            >
              Listo
            </button>
          </div>
        ) : activeFactorId && !enrollment ? (
          /* ── Ya tiene 2FA: estado + desactivar ── */
          <div>
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-300/60 bg-emerald-50 px-4 py-3.5 mb-5">
              <ShieldCheck size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  2FA activo en tu cuenta
                </p>
                <p className="text-xs text-emerald-700/80 mt-0.5 leading-relaxed">
                  Cada inicio de sesión pide un código de 6 dígitos de tu app.
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-300/70 bg-red-50 px-3.5 py-3 mb-4">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-px" />
                <p className="text-xs text-red-700/90 leading-relaxed">{error}</p>
              </div>
            )}

            <button
              onClick={handleDisable}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-red-300/70 bg-red-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-red-600 hover:bg-red-100 transition-colors disabled:opacity-70"
            >
              {busy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ShieldAlert size={14} />
              )}
              Desactivar 2FA
            </button>
            <p className="text-[11px] text-muted-foreground text-center mt-3 leading-relaxed">
              Solo desactívalo si cambiaste de teléfono o perdiste el acceso a la
              app.
            </p>
          </div>
        ) : enrollment ? (
          /* ── Paso de alta: QR + verificar código ── */
          <form onSubmit={confirmEnroll}>
            <ol className="space-y-4 mb-5">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cobalt text-[11px] font-bold text-white">
                  1
                </span>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  Abre <span className="font-semibold">Authy</span> (o Google
                  Authenticator) y escanea este código:
                </p>
              </li>
            </ol>

            {/* QR */}
            <div className="flex justify-center mb-4">
              <div className="rounded-2xl border border-border/70 bg-white p-3 shadow-sm">
                {/* El QR viene como SVG en data-URL desde Supabase */}
                <img
                  src={enrollment.qrCode}
                  alt="Código QR para 2FA"
                  className="h-44 w-44"
                />
              </div>
            </div>

            {/* Secreto manual */}
            <div className="mb-5">
              <p className="text-[11px] text-muted-foreground text-center mb-2">
                ¿No puedes escanear? Escribe esta clave en la app:
              </p>
              <button
                type="button"
                onClick={copySecret}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-muted/40 px-3 py-2.5 font-mono text-xs text-foreground/80 hover:bg-muted transition-colors"
              >
                <span className="break-all">{enrollment.secret}</span>
                {copied ? (
                  <Check size={14} className="text-emerald-600 flex-shrink-0" />
                ) : (
                  <Copy size={14} className="text-muted-foreground flex-shrink-0" />
                )}
              </button>
            </div>

            <label className="flex gap-3 mb-2">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cobalt text-[11px] font-bold text-white">
                2
              </span>
              <span className="text-sm text-foreground/80 leading-relaxed">
                Escribe el código de 6 dígitos que muestra la app:
              </span>
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="w-full text-center tracking-[0.5em] font-mono text-xl rounded-2xl border border-border/70 bg-white px-4 py-3 text-foreground outline-none focus:border-cobalt/55 focus:ring-4 focus:ring-gold/10 mb-4"
            />

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-300/70 bg-red-50 px-3.5 py-3 mb-4">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-px" />
                <p className="text-xs text-red-700/90 leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-cobalt px-5 py-3 text-xs font-bold uppercase tracking-wide text-primary-foreground hover:shadow-lg transition-all disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ShieldCheck size={14} />
              )}
              Activar 2FA
            </button>
          </form>
        ) : (
          /* ── Estado inicial: invitar a activar ── */
          <div>
            <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/30 px-4 py-3.5 mb-5">
              <Smartphone size={18} className="text-cobalt flex-shrink-0 mt-0.5" />
              <p className="text-xs text-foreground/70 leading-relaxed">
                Necesitarás una app de autenticación en tu teléfono, como{" "}
                <span className="font-semibold">Authy</span> o{" "}
                <span className="font-semibold">Google Authenticator</span>.
                Genera un código nuevo cada 30 segundos.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-300/70 bg-red-50 px-3.5 py-3 mb-4">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-px" />
                <p className="text-xs text-red-700/90 leading-relaxed">{error}</p>
              </div>
            )}

            <button
              onClick={startEnroll}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-cobalt px-5 py-3 text-xs font-bold uppercase tracking-wide text-primary-foreground hover:shadow-lg transition-all disabled:opacity-70"
            >
              {busy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ShieldCheck size={14} />
              )}
              Activar verificación en dos pasos
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MfaSetupModal;
