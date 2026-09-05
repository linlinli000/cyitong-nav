import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://nav.cyitong.top',
  // output: 'static' 是默认值，保持隐式
  vite: {
    plugins: [tailwindcss()],
  },
});
