import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // getSession() reads the cached JWT, whose user_metadata can be stale
    // (name/role are baked in at login time). getUser() hits the server
    // and returns the LIVE user record. This runs OUTSIDE the auth-state
    // callback, so it's safe.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        const { data } = await supabase.auth.getUser();
        setUser(data.user ?? session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Listen for auth changes. IMPORTANT: never call another supabase.auth
    // method synchronously inside this callback — it holds the auth lock
    // and would deadlock (breaking signOut and every token-based query).
    // The session here is freshly minted, so session.user already carries
    // the current metadata.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, loading, signIn, signOut };
}
