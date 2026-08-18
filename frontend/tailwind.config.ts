import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        white: "rgb(var(--color-content) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        field: "rgb(var(--color-field) / <alpha-value>)",
        mint: "rgb(var(--color-mint) / <alpha-value>)",
        coral: "rgb(var(--color-coral) / <alpha-value>)",
        reward: "rgb(var(--color-reward) / <alpha-value>)",
        "static-white": "#ffffff"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(69, 212, 131, 0.7), 0 0 28px rgba(69, 212, 131, 0.2)"
      }
    }
  },
  plugins: []
} satisfies Config;
