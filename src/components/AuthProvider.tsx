"use client";

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { db } from "@/lib/db";
import { restoreDataFromCloud } from "@/lib/sync";
import type { User, Session } from "@supabase/supabase-js";

/* ──────────────────────────────────────────────────────────
   Auth Context — provides user session globally
   ────────────────────────────────────────────────────────── */

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      if (s?.user) {
        restoreDataFromCloud();
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      
      // If user just logged in (SIGNED_IN), trigger a sync down
      if (event === "SIGNED_IN" && s?.user) {
        restoreDataFromCloud();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = useCallback(async () => {
    // Clear local Dexie data first for privacy
    await db.watchlist.clear();
    await db.watchedMovies.clear();
    
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signOut: handleSignOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
