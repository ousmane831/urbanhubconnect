/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0E2240", green: { DEFAULT: "#1E5C3F", 2: "#2C7A54" }, mint: "#8FCFA9",
        purple: "#4E2A84", gold: { DEFAULT: "#C39A3E", light: "#E2C27A" }, offwhite: "#F4F6F3",
      },
      fontFamily: { heading: ["Montserrat", "system-ui", "sans-serif"], body: ["Inter", "system-ui", "sans-serif"] },
      boxShadow: { soft: "0 1px 2px rgba(14,34,64,.06), 0 4px 12px rgba(14,34,64,.04)" },
    },
  },
  plugins: [],
};
