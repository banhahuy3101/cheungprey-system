/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  corePlugins: {
    preflight: false, // Disables Tailwind's CSS reset to preserve existing custom CSS styles
  },
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef2ff",
          100: "#e0e7ff",
          500: "#1e3a8a",
          600: "#1e40af",
          700: "#1d4ed8",
        },
      },
    },
  },
  plugins: [],
};
