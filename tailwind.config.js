/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkblue: "#1e3a8a",
        royalblue: "#2563eb",
        lightgray: "#f3f4f6",
        cyan: "#06b6d4",
        // New Premium Government Colors
        emerald: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D', // Forest Green
          950: '#052E16',
        },
        'primary-green': '#0F6B43', // Deep Emerald Green
        'forest-green': '#14532D',
        'mint-green': '#34D399',
        'light-mint': '#DFF8EE',
        'accent-blue': '#2563EB', // Royal Blue
        'accent-sky': '#60A5FA', // Sky Blue
        'status-success': '#10B981',
        'status-warning': '#F59E0B',
        'status-danger': '#EF4444',
        'bg-main': '#F4F7FB',
      },
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        '2xl': "24px",
        '3xl': "40px",
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glass-hover': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'glass-lg': '0 12px 48px 0 rgba(31, 38, 135, 0.1)',
        'soft': '0 10px 40px -10px rgba(0,0,0,0.05)',
        'glow-primary': '0 0 20px rgba(15, 107, 67, 0.3)',
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.6) 100%)',
        'glass-gradient-dark': 'linear-gradient(135deg, rgba(15, 107, 67, 0.05) 0%, rgba(15, 107, 67, 0.01) 100%)',
        'primary-gradient': 'linear-gradient(135deg, #0F6B43 0%, #14532D 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
