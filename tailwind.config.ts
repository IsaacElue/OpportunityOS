import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#080b10",
        surface: "#10151e",
        line: "#243041",
        ink: "#f5f7fb",
        muted: "#9ba9bd",
        brand: "#a8ffcc",
        "brand-ink": "#062315"
      },
      boxShadow: {
        glow: "0 0 0 1px rgb(168 255 204 / 10%), 0 24px 70px rgb(0 0 0 / 35%)"
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Arial", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;
