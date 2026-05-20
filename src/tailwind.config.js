/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Ceci dit à Tailwind de regarder tous tes fichiers dans src
  ],
  theme: {
    extend: {
      // Tu peux ajouter des couleurs personnalisées ici si tu veux
    },
  },
  plugins: [],
}