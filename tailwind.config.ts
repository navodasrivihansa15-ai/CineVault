import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      /* ─────────────────── COLOR PALETTE ─────────────────── */
      colors: {
        // OLED Pitch Black backgrounds
        oled: {
          DEFAULT: "#0B0C10",
          deep: "#0D0E15",
        },
        // Navy surfaces
        navy: {
          DEFAULT: "#151824",
          light: "#1C2035",
          lighter: "#232842",
        },
        // Brushed Metallic Gold accents
        gold: {
          DEFAULT: "#D4AF37",
          light: "#E5A93C",
          dark: "#B8962E",
          muted: "#9A7B2A",
        },
        // Amber glow family
        amber: {
          glow: "#FFBF00",
          soft: "#FFC940",
          warm: "#FF9F1C",
        },
        // Neutral text scale
        silver: {
          DEFAULT: "#C0C0C0",
          light: "#E0E0E0",
          dark: "#8A8A8A",
        },
        // Semantic overrides
        background: "#0B0C10",
        foreground: "#E0E0E0",
        muted: "#8A8A8A",
        border: "rgba(212, 175, 55, 0.15)",
      },

      /* ─────────────────── TYPOGRAPHY ─────────────────── */
      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "Inter",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: ["var(--font-geist-mono)", "Fira Code", "monospace"],
        display: ["var(--font-geist-sans)", "Inter", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },

      /* ─────────────────── SPACING & SIZING ─────────────────── */
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },

      /* ─────────────────── SHADOWS & GLOWS ─────────────────── */
      boxShadow: {
        "gold-sm": "0 1px 3px rgba(212, 175, 55, 0.12)",
        "gold-md": "0 4px 14px rgba(212, 175, 55, 0.18)",
        "gold-lg": "0 8px 30px rgba(212, 175, 55, 0.25)",
        "gold-glow": "0 0 20px rgba(212, 175, 55, 0.35)",
        "amber-glow": "0 0 30px rgba(255, 191, 0, 0.2)",
        "inner-gold": "inset 0 1px 0 rgba(212, 175, 55, 0.1)",
        cinematic:
          "0 20px 60px -15px rgba(0, 0, 0, 0.6), 0 0 40px rgba(212, 175, 55, 0.08)",
        glass:
          "0 8px 32px rgba(0, 0, 0, 0.37), inset 0 0 0 1px rgba(255, 255, 255, 0.05)",
      },

      /* ─────────────────── BACKDROP BLUR ─────────────────── */
      backdropBlur: {
        xs: "2px",
        "2xl": "40px",
        "3xl": "64px",
      },

      /* ─────────────────── GRADIENTS & BACKGROUNDS ─────────────────── */
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "gold-shimmer":
          "linear-gradient(110deg, #D4AF37 0%, #E5A93C 45%, #D4AF37 55%, #B8962E 100%)",
        "gold-subtle":
          "linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, rgba(212, 175, 55, 0.02) 100%)",
        "navy-gradient":
          "linear-gradient(180deg, #151824 0%, #0D0E15 100%)",
        "glass-surface":
          "linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)",
        "hero-vignette":
          "radial-gradient(ellipse at center, transparent 0%, #0B0C10 70%)",
      },

      /* ─────────────────── ANIMATIONS ─────────────────── */
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "gold-pulse": {
          "0%, 100%": { boxShadow: "0 0 10px rgba(212, 175, 55, 0.2)" },
          "50%": { boxShadow: "0 0 25px rgba(212, 175, 55, 0.5)" },
        },
        "glow-breathe": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out forwards",
        "fade-up": "fade-up 0.6s ease-out forwards",
        "slide-in-right": "slide-in-right 0.4s ease-out forwards",
        shimmer: "shimmer 2s ease-in-out infinite",
        "gold-pulse": "gold-pulse 3s ease-in-out infinite",
        "glow-breathe": "glow-breathe 4s ease-in-out infinite",
        "scale-in": "scale-in 0.3s ease-out forwards",
      },
    },
  },
  plugins: [
    /* ─────────── GLASSMORPHISM UTILITY PLUGIN ─────────── */
    plugin(function ({ addUtilities }) {
      addUtilities({
        ".glass": {
          background: "rgba(21, 24, 36, 0.6)",
          backdropFilter: "blur(16px) saturate(180%)",
          WebkitBackdropFilter: "blur(16px) saturate(180%)",
          border: "1px solid rgba(212, 175, 55, 0.08)",
        },
        ".glass-strong": {
          background: "rgba(21, 24, 36, 0.85)",
          backdropFilter: "blur(24px) saturate(200%)",
          WebkitBackdropFilter: "blur(24px) saturate(200%)",
          border: "1px solid rgba(212, 175, 55, 0.12)",
        },
        ".glass-gold": {
          background: "rgba(212, 175, 55, 0.08)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(212, 175, 55, 0.2)",
        },
        ".text-gradient-gold": {
          backgroundImage:
            "linear-gradient(135deg, #D4AF37, #E5A93C, #D4AF37)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        },
        ".border-glow-gold": {
          boxShadow:
            "0 0 0 1px rgba(212, 175, 55, 0.2), 0 0 15px rgba(212, 175, 55, 0.1)",
        },
      });
    }),
  ],
};

export default config;
