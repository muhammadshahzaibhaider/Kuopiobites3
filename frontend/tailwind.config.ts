import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: "#FDF6E3",
          deep: "#FBEFC7",
          dark: "#F1E0A8",
        },
        /* deep forest / teal green family (v2 identity) */
        cherry: {
          DEFAULT: "#0F3D3E",
          deep: "#0A2E2F",
          dark: "#06201F",
          bright: "#12433F",
        },
        /* burnt-orange / mustard accent */
        gold: {
          DEFAULT: "#E8792B",
          soft: "#F49B58",
          deep: "#C05F1A",
        },
        brick: {
          DEFAULT: "#B3402A",
        },
      },
      fontFamily: {
        display: ['"Fraunces Variable"', "Georgia", "serif"],
        sans: ['"Nunito Sans Variable"', "system-ui", "sans-serif"],
        script: ["Caveat", "cursive"],
      },
      boxShadow: {
        lift: "0 16px 34px -14px rgb(6 32 31 / 0.35)",
        card: "0 2px 12px rgb(6 32 31 / 0.08)",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        marqueeR: {
          "0%": { transform: "translateX(-50%)" },
          "100%": { transform: "translateX(0)" },
        },
        steam: {
          "0%": { transform: "translateY(6px) scaleX(1)", opacity: "0" },
          "35%": { opacity: ".9" },
          "100%": { transform: "translateY(-14px) scaleX(1.15)", opacity: "0" },
        },
        pulseSoft: {
          "0%,100%": { boxShadow: "0 0 0 0 rgb(18 67 63 / .45)" },
          "60%": { boxShadow: "0 0 0 14px rgb(18 67 63 / 0)" },
        },
        floaty: {
          "0%,100%": { transform: "translateY(0) rotate(-2deg)" },
          "50%": { transform: "translateY(-10px) rotate(2deg)" },
        },
        spinSlow: {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        marquee: "marquee 26s linear infinite",
        marqueeR: "marqueeR 9s linear infinite",
        steam: "steam 2.4s ease-out infinite",
        pulseSoft: "pulseSoft 2.2s ease-out infinite",
        floaty: "floaty 5s ease-in-out infinite",
        spinSlow: "spinSlow 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
