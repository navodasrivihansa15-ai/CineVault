import { createBrowserClient } from "@supabase/ssr";

/* ──────────────────────────────────────────────────────────
   CineVault — Supabase Browser Client Utility
   ────────────────────────────────────────────────────────── */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function hasCredentials(): boolean {
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      supabaseUrl.startsWith("https://") &&
      supabaseAnonKey.length > 20
  );
}

/**
 * Creates a singleton browser client using @supabase/ssr.
 * This ensures the session is synced to cookies, which makes
 * it accessible to Server Components (like the Admin Dashboard).
 */
export const supabase = createBrowserClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key"
);

// ─── Auth Helpers ────────────────────────────────────────

export function requireSupabase() {
  if (!hasCredentials()) {
    throw new Error(
      "Supabase credentials are not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file."
    );
  }
  return supabase;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signInWithOAuth(provider: "google" | "github" | "discord") {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`,
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export function onAuthStateChange(
  callback: (event: string, session: unknown) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}
