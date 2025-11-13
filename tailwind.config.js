/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aurora: {
          // Primary brand colors from your design
          primary: {
            dark: '#010532',    // Primary dark navy
            light: '#E4E3DF',   // Primary light cream
          },
          // Secondary colors from your palette
          secondary: {
            green: '#5ABA1C',   // Secondary green
            blue: '#3257FE',    // Secondary blue
            darkGreen: '#00713B', // Dark green
            darkBlue: '#00136F',  // Dark blue
          },
          // Emotion-specific colors from your palette
          emotions: {
            joy: '#FFA900',       // Joy - warm yellow/orange
            sadness: '#086FE6',   // Sadness - blue
            fear: '#920FFE',      // Fear - purple
            disgust: '#19BF20',   // Disgust - green
            anger: '#F90038',     // Anger - red
            love: '#FF55B8',      // Love - pink
            surprise: '#FF7105',  // Surprise - orange
            neutral: '#CAC1C4',   // Neutral - light gray
          },
          blue: {
            50: '#F0F4FF',      // Very light blue
            100: '#E4ECFF',     // Light blue
            200: '#C7D7FF',     // Lighter blue
            300: '#9BB5FF',     // Medium light blue
            400: '#6B8FFF',     // Medium blue
            500: '#4A90E2',     // Main brand blue
            600: '#3B7BF6',     // Darker blue
            700: '#2563EB',     // Deep blue
            800: '#1E40AF',     // Very deep blue
            900: '#010632',     // Navy (matches primary dark)
          },
          accent: {
            green: '#4CAF50',   // Success/calm
            orange: '#FF9800',  // Warning/energy
            red: '#F44336',     // Error/stress
            purple: '#9C27B0',  // Creative/inspiration
            pink: '#E91E63',    // Love/care
          },
          gray: {
            50: '#F9FAFB',
            100: '#F3F4F6',
            200: '#E5E7EB',
            300: '#D1D5DB',
            400: '#9CA3AF',
            500: '#6B7280',
            600: '#4B5563',
            700: '#374151',
            800: '#1F2937',
            900: '#111827',
          }
        }
      },
      fontFamily: {
        'heading': ['Buenos Aires', 'Inter', 'system-ui', 'sans-serif'],
        'body': ['Euclid Circular A', 'Inter', 'system-ui', 'sans-serif'],
        'accent': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        'aurora': ['Buenos Aires', 'Euclid Circular A', 'Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'aurora-gradient': 'linear-gradient(135deg, #4A90E2 0%, #010632 100%)',
        'aurora-light': 'linear-gradient(135deg, #E4E3DF 0%, #F0F4FF 100%)',
        'aurora-hero': 'linear-gradient(135deg, #010632 0%, #4A90E2 50%, #6B8FFF 100%)',
      },
      boxShadow: {
        'aurora': '0 10px 25px -5px rgba(74, 144, 226, 0.3), 0 8px 10px -6px rgba(74, 144, 226, 0.1)',
        'aurora-lg': '0 20px 25px -5px rgba(74, 144, 226, 0.4), 0 10px 10px -5px rgba(74, 144, 226, 0.2)',
      }
    },
  },
  plugins: [],
}
