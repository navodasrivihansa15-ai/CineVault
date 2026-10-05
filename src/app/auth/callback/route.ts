import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/profile";

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing user sessions.
            }
          },
        },
      }
    );

    // 1. Exchange code for session
    await supabase.auth.exchangeCodeForSession(code);

    // 2. Get user details
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // 3. Check or Create Profile in public.profiles to ensure sync
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!existingProfile) {
        // Fallback check by email to merge if email/password account already existed
        const { data: emailProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("email", user.email)
          .single();

        if (emailProfile) {
          // Update existing profile with Google Auth ID or link them
          await supabase
            .from("profiles")
            .update({
              id: user.id,
              avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || emailProfile.avatar_url,
            })
            .eq("email", user.email);
        } else {
          // Insert brand new profile
          await supabase.from("profiles").insert([
            {
              id: user.id,
              email: user.email,
              username: user.user_metadata?.full_name || user.user_metadata?.name || "User",
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || "User",
              avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
              role: "user", // default role
            },
          ]);
        }
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
