/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        domain: {
          environmental: '#2563eb',
          ecological: '#16a34a',
          production: '#d97706',
          'nutrition-health': '#db2777',
          'socio-economic': '#7c3aed',
        },
      },
    },
  },
  plugins: [],
};
