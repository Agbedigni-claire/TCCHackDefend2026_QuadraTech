/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  corePlugins: {
    preflight: false,   // Désactivé pour éviter les conflits avec le CSS existant
  },
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        'primary-dk': '#1d4ed8',
      },
    },
  },
  plugins: [],
}
