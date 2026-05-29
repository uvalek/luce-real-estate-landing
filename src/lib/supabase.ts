import { createClient } from "@supabase/supabase-js";

// The Supabase URL and the ANON key are PUBLIC by design — they are meant to
// ship to the browser. The only thing that protects your data is Row Level
// Security (RLS) on every table (see SECURITY_AUDIT.md). The service_role key
// must NEVER appear here or in any VITE_* variable.
//
// We read them from environment variables first (so each environment —
// local / preview / production — can be configured in Vercel without editing
// code) and fall back to the known public project values so the site keeps
// working even if the env vars are missing.
const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "https://lrxwvyilfobwyndikqpq.supabase.co";

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyeHd2eWlsZm9id3luZGlrcXBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NDg5MjAsImV4cCI6MjA4OTAyNDkyMH0.AGZBy5As6dVrHDiPVNZxwjK13i91eIOSKBZyfq5LP5s";

// Single shared client (singleton). Importing this module anywhere reuses the
// same instance, so there is only ever one auth/session manager in the app.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Keep the session in localStorage and refresh it automatically.
    persistSession: true,
    autoRefreshToken: true,
    // Needed so magic-link / OAuth redirects are picked up from the URL.
    detectSessionInUrl: true,
  },
});
