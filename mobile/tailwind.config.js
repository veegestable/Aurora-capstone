/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: '#0F172A',
        secondary: '#34D399',
        accent: '#8B5CF6',
        aurora: {
          dark: '#0F172A',
          green: '#34D399',
          purple: '#8B5CF6',
          blue: '#3B82F6',
          slate: '#64748B',
          // Aurora app specific
          bg: '#0B0D30',
          bgDeep: '#080B25',
          card: '#10143C',
          cardAlt: '#0D1238',
          nav: '#070A2E',
          accent: '#2D6BFF',
          violet: '#7C3AED',
          happy: '#FEBD03',
          sad: '#086FE6',
          angry: '#F90038',
          surprise: '#FF7105',
          neutral: '#94A3B8',
        }
      }
    },
  },
  plugins: [],
}
