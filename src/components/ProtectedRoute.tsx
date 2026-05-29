import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getAalStatus } from "@/lib/mfa";

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Client-side route guard. Redirects to /admin/login when there is no
 * authenticated Supabase session.
 *
 * SECURITY NOTE: this is a UX guard ONLY. A determined attacker can bypass
 * the router entirely (it all runs in the browser). The REAL protection for
 * your data is Row Level Security (RLS) on every Supabase table — see
 * SECURITY_AUDIT.md. Never rely on this component to keep data safe; rely on
 * RLS so that even a logged-out / malicious client cannot read or write rows.
 */
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // MFA gate: si la cuenta tiene 2FA activo pero la sesión sigue en aal1 (no se
  // ingresó el código), tratamos al usuario como NO autenticado y lo mandamos
  // al login a completar el segundo paso. "checking" evita parpadeos.
  const [mfaChecking, setMfaChecking] = useState(true);
  const [mfaPending, setMfaPending] = useState(false);

  useEffect(() => {
    let alive = true;
    if (loading) return;
    if (!user) {
      setMfaChecking(false);
      return;
    }
    (async () => {
      const aal = await getAalStatus();
      if (!alive) return;
      setMfaPending(aal.needsCode);
      setMfaChecking(false);
    })();
    return () => {
      alive = false;
    };
  }, [user, loading]);

  useEffect(() => {
    if (!loading && !mfaChecking && (!user || mfaPending)) {
      navigate("/admin/login", { replace: true });
    }
  }, [user, loading, mfaChecking, mfaPending, navigate]);

  // While the session is being resolved, or if there's no user (about to
  // redirect), show a neutral loader instead of flashing protected content.
  if (loading || mfaChecking || !user || mfaPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-cobalt" />
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
