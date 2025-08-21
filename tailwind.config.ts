// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Arial"],
      },
      colors: {
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          600: "#059669",
          700: "#047857",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16, 24, 40, .06), 0 4px 12px rgba(16, 24, 40, .08)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
