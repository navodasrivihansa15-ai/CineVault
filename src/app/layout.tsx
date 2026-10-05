import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/components/AuthProvider";

/* ──────────────────────────────────────────────────────────
   Fonts — Geist Sans & Geist Mono (locally hosted)
   ────────────────────────────────────────────────────────── */

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

/* ──────────────────────────────────────────────────────────
   Metadata
   ────────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: {
    default: "CineVault — Your Personal Cinema Archive",
    template: "%s | CineVault",
  },
  description:
    "Track, rate, and organize every movie you've ever watched. Discover new films, build your watchlist, and save streaming links — all in one luxurious cinematic experience.",
  keywords: [
    "movies",
    "film tracker",
    "watchlist",
    "cinema",
    "movie database",
    "CineVault",
  ],
  authors: [{ name: "CineVault" }],
  openGraph: {
    type: "website",
    title: "CineVault — Your Personal Cinema Archive",
    description:
      "Track, rate, and organize your movie collection with a luxury cinematic experience.",
    siteName: "CineVault",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0C10",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

/* ──────────────────────────────────────────────────────────
   Root Layout
   ────────────────────────────────────────────────────────── */

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-oled font-sans text-foreground antialiased">
        <AuthProvider>
          {/* ── Ambient background effects ────────────── */}
          <div className="pointer-events-none fixed inset-0 -z-10">
            {/* Top-left gold ambient glow */}
            <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-gold/[0.03] blur-[120px]" />
            {/* Bottom-right subtle amber */}
            <div className="absolute -bottom-20 -right-20 h-[400px] w-[400px] rounded-full bg-amber-glow/[0.02] blur-[100px]" />
          </div>

          {/* ── Navigation ────────────────────────────── */}
          <Navbar />

          {/* ── Main Content ──────────────────────────── */}
          <main className="relative flex min-h-screen flex-col pb-20 md:pb-0">
            {children}
          </main>

          {/* ── Footer ────────────────────────────────── */}
          <footer className="mt-auto border-t border-white/[0.04] py-8">
            <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 text-center text-xs text-silver-dark">
              <p>
                <span className="text-gradient-gold font-semibold">
                  CineVault
                </span>{" "}
                — Your Personal Cinema Archive
              </p>
              <p className="text-muted">
                Movie data provided by{" "}
                <a
                  href="https://www.themoviedb.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-silver transition-colors hover:text-gold"
                >
                  TMDB
                </a>
                . This product uses the TMDB API but is not endorsed or
                certified by TMDB.
              </p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
