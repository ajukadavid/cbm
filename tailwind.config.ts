import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: {
            DEFAULT: "#15803d",
            dark: "#14532d",
            darker: "#052e16",
            light: "#dcfce7",
            muted: "#f0fdf4",
          },
          red: {
            DEFAULT: "#dc2626",
            dark: "#b91c1c",
            light: "#fee2e2",
            muted: "#fef2f2",
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
