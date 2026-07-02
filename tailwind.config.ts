import type { Config } from "tailwindcss";

// Mirrors the CSS custom properties defined in app/globals.css - that file
// is the source of truth for the live palette (warm cream background, teal
// brand, amber accent). Keep these two in sync if either changes.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        background: "#f6f4ef",
        surface: "#ffffff",
        line: "#e6e0d5",
        brand: "#0f766e",
        accent: "#f59e0b",
        danger: "#e11d48",
        success: "#059669",
        muted: "#64748b",
      },
      boxShadow: {
        panel: "0 24px 70px rgba(15, 23, 42, 0.11)",
      },
    },
  },
  plugins: [],
};

export default config;
