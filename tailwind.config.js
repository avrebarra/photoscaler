/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        "skeuo-card":
          "0 4px 16px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        "skeuo-outset": "0 2px 8px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.4)",
        "skeuo-outset-sm": "0 1px 4px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)",
        "skeuo-inset": "inset 0 2px 4px rgba(0,0,0,0.6)",
        "skeuo-inset-sm": "inset 0 1px 3px rgba(0,0,0,0.5)",
        "skeuo-well": "inset 0 2px 8px rgba(0,0,0,0.6), inset 0 1px 2px rgba(0,0,0,0.4)",
        "skeuo-cta":
          "0 3px 12px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.5)",
        "skeuo-cta-pressed": "inset 0 2px 6px rgba(0,0,0,0.25), inset 0 1px 2px rgba(0,0,0,0.2)",
      },
    },
  },
  plugins: [],
}
