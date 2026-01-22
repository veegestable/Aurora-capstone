/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: '#0F172A', // Slate 900
        secondary: '#34D399', // Emerald 400
        accent: '#8B5CF6', // Violet 500
        aurora: {
          dark: '#0F172A', // Slate 900
          green: '#34D399', // Emerald 400
          purple: '#8B5CF6', // Violet 500
          blue: '#3B82F6', // Blue 500
          slate: '#64748B', // Slate 500
        }
      }
    },
  },
  plugins: [],
}
