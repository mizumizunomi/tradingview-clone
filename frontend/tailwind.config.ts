import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tv: {
          bg: "#131722",
          bg2: "#1e222d",
          bg3: "#2a2e39",
          border: "#363a45",
          text: "#b2b5be",
          textLight: "#d1d4dc",
          blue: "#2962ff",
          green: "#26a69a",
          red: "#ef5350",
          yellow: "#f59e0b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
