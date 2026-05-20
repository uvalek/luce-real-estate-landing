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
    // and returns the LIVE user record, so the dashboard always sees the
    // up-to-date metadata without forcing a re-login.
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

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        const { data } = await supabase.auth.getUser();
        setUser(data.user ?? session.user);
      } else {
        setUser(null);
      }
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
