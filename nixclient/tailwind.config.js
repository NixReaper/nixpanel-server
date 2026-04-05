/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0a0f1a',
        secondary: '#111827',
        card: '#1a2235',
        border: '#1e2d45',
        accent: '#0ea5e9',
      },
    },
  },
  plugins: [],
}
