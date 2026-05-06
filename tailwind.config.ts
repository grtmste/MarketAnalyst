import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#F0EEF0',
          surface: '#FAFAFA',
          primary: '#1A1A2E',
          secondary: '#6B7280',
          accent: '#7C9CBF',
          'accent-hover': '#6b8aad',
          buy: '#4CAF7D',
          sell: '#E07070',
          wait: '#B0B0C0',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.05)',
        dropdown: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
