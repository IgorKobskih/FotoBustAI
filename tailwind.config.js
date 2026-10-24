/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#800020',
          dark: '#590018',
          deep: '#3D0011',
          light: '#F0E1E3',
        },
        gold: {
          DEFAULT: '#D8B77A',
          dark: '#C4A464',
          light: '#E8D5A8',
        },
        bg: {
          DEFAULT: '#C1AA94',
          cream: '#F8F3ED',
          white: '#F8F3ED',
        },
        ink: {
          DEFAULT: '#292326',
          secondary: '#81757A',
        },
        border: {
          DEFAULT: '#E4D8D0',
        },
        success: '#2D7A4F',
        warning: '#C77700',
        error: '#C0392B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      borderRadius: {
        'xl': '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(41, 35, 38, 0.06)',
        'medium': '0 4px 16px rgba(41, 35, 38, 0.08)',
        'large': '0 8px 32px rgba(41, 35, 38, 0.1)',
        'burgundy': '0 4px 20px rgba(89, 0, 24, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
