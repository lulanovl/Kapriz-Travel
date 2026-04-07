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
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          blue: "#1B4FD8",
          "blue-dark": "#1840A8",
          "blue-deeper": "#1230A0",
          lime: "#CCFF00",
          "lime-dark": "#AADD00",
        },
      },
      fontFamily: {
        heading: ["var(--font-montserrat)", "sans-serif"],
        body: ["var(--font-montserrat)", "sans-serif"],
      },
      backgroundImage: {
        "blue-gradient": "linear-gradient(135deg, #1B4FD8 0%, #1230A0 100%)",
        "blue-gradient-radial":
          "radial-gradient(ellipse at top, #1B4FD8 0%, #0f2a80 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
