/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        court: {
          50: '#eefbf5',
          100: '#d8f5e8',
          500: '#159a66',
          600: '#0c8556',
          700: '#096a46',
        },
        ink: '#10213f',
      },
      boxShadow: {
        card: '0 10px 30px rgba(16, 33, 63, 0.06)',
        cta: '0 12px 24px rgba(21, 154, 102, 0.24)',
      },
      fontFamily: {
        sans: ['Sarabun', 'Noto Sans Thai', 'Leelawadee UI', 'Tahoma', 'sans-serif'],
        heading: ['Prompt', 'Noto Sans Thai', 'Leelawadee UI', 'Tahoma', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
