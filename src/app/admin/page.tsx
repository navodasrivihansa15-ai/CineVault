import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { Globe, ShieldX } from "lucide-react";
import Link from "next/link";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const cookieStore = cookies();

  // Create Supabase server client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Normally handled by middleware, but we include it for SSR type safety
        },
        remove(name: string, options: CookieOptions) {
          // Normally handled by middleware, but we include it for SSR type safety
        },
      },
    }
  );

  // Fetch the user securely on the server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch the user's role from their profile
  let hasAdminAccess = false;
  if (user) {
    if (user.email === "navodasrivihansa15@gmail.com" || ["admin", "founder"].includes((user as any)?.role || user?.user_metadata?.role)) {
      hasAdminAccess = true;
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile && ["admin", "founder"].includes(profile.role)) {
        hasAdminAccess = true;
      }
    }
  }

  // Check if unauthenticated OR does not have admin access
  if (!user || !hasAdminAccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-oled px-4 text-center">
        <ShieldX className="mb-6 h-20 w-20 text-red-500/80 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
        <h1 className="mb-2 text-4xl font-bold tracking-tight text-white">403 Forbidden</h1>
        <p className="mb-8 text-silver-dark max-w-md">
          You do not have the required administrator privileges to access the CineVault dashboard.
        </p>
        <Link
          href="/"
          className="rounded-xl bg-gold-shimmer px-6 py-3 text-sm font-semibold text-oled transition-all hover:brightness-110 shadow-gold-sm"
        >
          Return to Explore
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-oled px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/10 ring-1 ring-gold/20 shadow-gold-sm">
            <Globe className="text-gold" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Admin Dashboard</h1>
            <p className="text-sm text-silver-dark">Manage Global Stream Links for all users.</p>
          </div>
        </div>

        {/* Render the interactive client form since we passed the SSR check */}
        <AdminClient />
      </div>
    </div>
  );
}
