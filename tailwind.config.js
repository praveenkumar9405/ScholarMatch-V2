/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0071E3",
        background: "#F5F5F7",
        text: "#1D1D1F",
        success: "#34C759",
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 20px rgba(0, 0, 0, 0.05)',
        hover: '0 10px 40px rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        'lg': '1rem',
        'xl': '1.5rem',
      }
    },
  },
  plugins: [],
}
