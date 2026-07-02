import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07111f",
        panel: "rgba(8, 18, 34, 0.76)",
        stroke: "rgba(255,255,255,0.12)",
        brand: "#4ade80",
        accent: "#38bdf8",
        danger: "#fb7185",
        warning: "#fbbf24"
      },
      boxShadow: {
        glow: "0 0 40px rgba(74, 222, 128, 0.18)",
        panel: "0 22px 70px rgba(0,0,0,0.28)"
      }
    }
  },
  plugins: []
};

export default config;
