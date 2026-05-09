/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta principal: vino/guinda (provista por el usuario en 500-900)
        // + tints calculados para 50-400.
        brand: {
          50:  '#faf2f2',
          100: '#f3dfdf',
          200: '#e6bfbf',
          300: '#cf9595',
          400: '#a86060',
          500: '#753232', // base
          600: '#5f2e2e',
          700: '#5f1f1f',
          800: '#4c1c1c',
          900: '#431616',
          950: '#2c0e0e',
        },
        // Acento dorado/ámbar: compañero clásico del vino, aporta calidez.
        accent: {
          50:  '#fdf8ed',
          100: '#faecc8',
          200: '#f4d989',
          300: '#ecc056',
          400: '#e2a829',
          500: '#d4a017', // base
          600: '#b8860b',
          700: '#92670a',
          800: '#6d4d08',
        },
        // Crema cálido: base neutra para fondos y tarjetas, suaviza el contraste.
        cream: {
          50:  '#fdfaf6',
          100: '#f8f1e7',
          200: '#efe1cc',
          300: '#e3cba8',
        },
      },
      backgroundImage: {
        'brand-gradient':
          'linear-gradient(135deg, #431616 0%, #5f1f1f 35%, #753232 70%, #b8860b 100%)',
        'brand-soft':
          'linear-gradient(180deg, #fdfaf6 0%, #f3dfdf 100%)',
      },
      boxShadow: {
        'brand': '0 10px 25px -10px rgba(75, 28, 28, 0.45)',
      },
    },
  },
  plugins: [],
};
