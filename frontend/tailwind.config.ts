import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f5f5f7",
        foreground: "#1d1d1f",
        secondary: "#86868b",
        primary: {
          DEFAULT: "#007AFF",
          hover: "#0066d6",
        },
        keeta: "#FFB800",
        talabat: "#FF5A00",
        deliveroo: "#00CCBC",
        americana: "#0066FF",
        card: "#ffffff",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};
export default config;
