/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#f0f5ff', 100: '#e0eaff', 200: '#c2d5ff', 300: '#94b3ff', 400: '#6690ff', 500: '#3b6cff', 600: '#1a4dff', 700: '#0038e6', 800: '#002dba', 900: '#00228f' },
        dark: { 50: '#f6f6f9', 100: '#ececf3', 200: '#d6d6e4', 300: '#b3b3cc', 400: '#8a8aaf', 500: '#6b6b95', 600: '#55557b', 700: '#464664', 800: '#3c3c54', 900: '#1a1a2e' },
      },
    },
  },
  plugins: [],
};
