import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import astroIcon from 'astro-icon';

export default defineConfig({
  site: 'https://nav.cyitong.top',
  integrations: [
    astroIcon(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
