/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E88E5',
          hover: '#1565C0',
          light: '#42A5F5',
          dark: '#0D47A1',
        },
        success: '#4CAF50',
        error: '#F44336',
        warning: '#FF9800',
        info: '#2196F3',
      },
      fontFamily: {
        sans: ['Noto Sans TC', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
  // 與 Ant Design 共存
  corePlugins: {
    preflight: false,
  },
}
