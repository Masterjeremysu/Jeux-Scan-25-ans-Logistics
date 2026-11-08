/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cea: {
          blue: '#004B87',
          dark: '#00284D',
          cyan: '#00A3E0',
          orange: '#FF6A13',
          yellow: '#FFB81C',
          green: '#00965E',
          red: '#E03C31',
          panel: '#0B132B',
          card: '#1C2541',
          border: '#3A506B'
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Chakra Petch"', 'Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
