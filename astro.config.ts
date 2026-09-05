import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import astroIcon from 'astro-icon';

export default defineConfig({
  site: 'https://nav.cyitong.top',
  // output: 'static' 是默认值，保持隐式
  integrations: [
    // 图标走本地 @iconify-json/* 构建期内联，不用 src/icons/；
    // 构建见 "Failed to load icons from src/icons" warn 属正常（该目录不存在）
    astroIcon(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
