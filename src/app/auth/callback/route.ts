import { NextResponse } from "next/server";

/* ──────────────────────────────────────────────────────────
   Auth Callback — handles OAuth redirect from Supabase
   ────────────────────────────────────────────────────────── */

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    // The Supabase client on the frontend handles the code exchange
    // via detectSessionInUrl. We simply redirect back.
    return NextResponse.redirect(`${origin}${next}`);
  }

  // If no code, redirect to homepage
  return NextResponse.redirect(`${origin}/`);
}
