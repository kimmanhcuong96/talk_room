import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0d1117",
        panel: "#141a23",
        field: "#1d2633",
        mint: "#45d483",
        coral: "#ff7a59"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(69, 212, 131, 0.7), 0 0 28px rgba(69, 212, 131, 0.2)"
      }
    }
  },
  plugins: []
} satisfies Config;
