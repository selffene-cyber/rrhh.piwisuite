/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // SOLO procesar archivos de login para aislar Tailwind
    './app/login/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  // Importante: no afectar estilos globales
  corePlugins: {
    preflight: false, // Desactivar reset de Tailwind para no afectar otros componentes
  },
}




