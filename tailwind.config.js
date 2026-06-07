/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.ts",
  ],
  theme: {
    extend: {
      colors: {
        'primary-dark': '#1A5FA8',
        'primary': '#378ADD',
        'primary-light': '#E6F1FB',
        'accent-green': '#1D9E75',
        'accent-amber': '#BA7517',
        'bg-page': '#F4F8FD',
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Microsoft YaHei"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
