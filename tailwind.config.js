/** @type {import('tailwindcss').Config} */
export default {
  content: ["index.html", "src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: { amber: { 50: '#FEF3C7', 100: '#FDE68A', 200: '#FCD34D', 300: '#FBBF24', 400: '#F59E0B', 500: '#D97706', 600: '#B45309', 700: '#92400E', 800: '#78350F', 900: '#451A03' } },
      animation: { 'fade-in': 'fadeIn 0.3s ease-out' },
      keyframes: { fadeIn: { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } } }
    }
  },
  plugins: []
}