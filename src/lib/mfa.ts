// src/lib/mfa.ts
// ─────────────────────────────────────────────────────────────────────────────
// Verificación en dos pasos (2FA / MFA) con TOTP de Supabase.
//
// QUÉ ES: además del correo + contraseña, el admin debe escribir un código de 6
// dígitos que genera una app como Authy / Google Authenticator. Aunque alguien
// robe la contraseña, sin el teléfono con la app no puede entrar.
//
// FLUJO:
//  1) ALTA (una sola vez por usuario): enrollTotp() crea un "factor" y devuelve
//     un QR. El usuario lo escanea con Authy. Luego confirma con un código en
//     verifyEnrollment(). A partir de ahí el factor queda "verificado".
//  2) LOGIN: tras la contraseña, si el usuario tiene un factor verificado,
//     Supabase deja la sesión en nivel "aal1" y exige subir a "aal2" escribiendo
//     un código (challengeAndVerify()).
//
// Estas funciones son envoltorios finos sobre supabase.auth.mfa.* para que los
// componentes queden limpios.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from "@/lib/supabase";

export type TotpEnrollment = {
  factorId: string;
  qrCode: string; // SVG en data-URL, listo para <img src=...>
  secret: string; // por si la app no puede escanear el QR (alta manual)
  uri: string; // otpauth://...
};

/**
 * Indica si el usuario actual YA tiene 2FA activo (un factor TOTP verificado).
 */
export async function hasVerifiedTotp(): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return false;
  return (data.totp ?? []).some((f) => f.status === "verified");
}

/**
 * Devuelve el factor TOTP verificado (si existe), o null.
 */
export async function getVerifiedTotpFactor() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return null;
  return (data.totp ?? []).find((f) => f.status === "verified") ?? null;
}

/**
 * Limpia factores TOTP "unverified" que hayan quedado de un alta a medias.
 * Si no se limpian, un nuevo enroll puede fallar por nombre/duplicado.
 */
async function cleanupUnverifiedFactors(): Promise<void> {
  const { data } = await supabase.auth.mfa.listFactors();
  const pending = (data?.totp ?? []).filter((f) => f.status === "unverified");
  for (const f of pending) {
    await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
}

/**
 * Inicia el alta de un nuevo factor TOTP y devuelve el QR para escanear.
 */
export async function enrollTotp(
  friendlyName = "LUCE Admin",
): Promise<TotpEnrollment> {
  // Evita el error "factor already exists" por intentos previos a medias.
  await cleanupUnverifiedFactors();

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName,
  });
  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo iniciar el registro de 2FA.");
  }
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

/**
 * Confirma el alta: el usuario escribe el código que ve en Authy. Si es válido,
 * el factor queda verificado y la sesión sube a aal2.
 */
export async function verifyEnrollment(
  factorId: string,
  code: string,
): Promise<void> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: code.trim(),
  });
  if (error) {
    throw new Error(
      error.message?.toLowerCase().includes("invalid")
        ? "Código incorrecto. Revisa el número en tu app y vuelve a intentar."
        : error.message,
    );
  }
}

/**
 * En el login, sube la sesión de aal1 a aal2 con un código del autenticador.
 */
export async function verifyLoginCode(
  factorId: string,
  code: string,
): Promise<void> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: code.trim(),
  });
  if (error) {
    throw new Error(
      error.message?.toLowerCase().includes("invalid")
        ? "Código incorrecto. Espera a que cambie el número y reintenta."
        : error.message,
    );
  }
}

/**
 * Quita el 2FA del usuario (desactivar). Requiere estar en aal2.
 */
export async function disableTotp(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw new Error(error.message);
}

export type AalStatus = {
  /** Nivel actual de la sesión: "aal1" (solo contraseña) o "aal2" (con código). */
  current: string | null;
  /** Nivel requerido: si es "aal2" y current es "aal1", falta el código. */
  next: string | null;
  /** true cuando el usuario tiene 2FA y aún no ha pasado el código en esta sesión. */
  needsCode: boolean;
};

/**
 * Lee el nivel de aseguramiento (AAL) de la sesión.
 */
export async function getAalStatus(): Promise<AalStatus> {
  const { data, error } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) {
    return { current: null, next: null, needsCode: false };
  }
  return {
    current: data.currentLevel,
    next: data.nextLevel,
    needsCode: data.nextLevel === "aal2" && data.currentLevel === "aal1",
  };
}
