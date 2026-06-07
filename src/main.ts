/** 成医通 — 成都医学院静态导航页 */

import './style.css';
import { links, categories } from './data/links';
import { createHeader } from './components/Header';
import { createLinkSections } from './components/LinkGrid';
import { initDialog, showQrDialog } from './components/Dialog';

// 搜索引擎配置
type SearchEngine = 'bing' | 'google' | 'baidu';

interface EngineConfig {
  name: string;
  url: (q: string) => string;
}

const ENGINE_MAP: Record<SearchEngine, EngineConfig> = {
  bing:   { name: 'Bing',   url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
  google: { name: 'Google', url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  baidu:  { name: '百度',   url: (q) => `https://www.baidu.com/s?wd=${encodeURIComponent(q)}` },
};

let currentEngine: SearchEngine = 'bing';

function switchEngine(engine: SearchEngine): void {
  currentEngine = engine;
  document.querySelectorAll<HTMLButtonElement>('.engine-btn').forEach((btn) => {
    const isActive = (btn.dataset.engine as SearchEngine) === engine;
    btn.classList.toggle('engine-btn-active', isActive);
  });
  const input = document.querySelector<HTMLInputElement>('#search-input');
  if (input) {
    input.placeholder = `在 ${ENGINE_MAP[engine].name} 搜索网页...`;
  }
}

function doWebSearch(query: string): void {
  const url = ENGINE_MAP[currentEngine].url(query.trim());
  if (url) window.open(url, '_blank');
}

const app = document.querySelector<HTMLDivElement>('#app')!;

initDialog();

app.innerHTML = `
  <div id="loading-bar"></div>

  <div id="header-container"></div>

  <section class="hero-banner bg-gradient-to-b from-primary-dark via-primary to-primary
              dark:from-slate-900 dark:via-slate-800 dark:to-slate-900
              border-b border-white/20 dark:border-white/10">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16 text-center relative z-10">

      <div class="flex items-center justify-center gap-3 mb-2">
        <svg class="w-8 h-8 sm:w-9 sm:h-9 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.33A48.07 48.07 0 0112 9.75c-2.55 0-5.02.2-7.5.58V21M4.5 21h15" />
        </svg>
        <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-wide">成医通</h1>
      </div>

      <p class="text-white/70 dark:text-slate-300 text-sm sm:text-base mb-6">
        成都医学院学生专属导航
      </p>

      <div class="relative max-w-lg mx-auto">
        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </span>
        <input
          id="search-input"
          type="text"
          placeholder="在 Bing 搜索网页..."
          class="hero-search search-input w-full pl-11 pr-4 py-3 rounded-xl
                 bg-white dark:bg-slate-700
                 text-gray-800 dark:text-slate-200
                 placeholder-gray-400 dark:placeholder-slate-400
                 border-0 outline-none text-sm sm:text-base
                 transition-all"
        />
      </div>

      <div class="flex items-center justify-center gap-1.5 mt-3">
        <button class="engine-btn engine-btn-active" data-engine="bing" type="button">Bing</button>
        <button class="engine-btn" data-engine="google" type="button">Google</button>
        <button class="engine-btn" data-engine="baidu" type="button">百度</button>
      </div>

      <p id="hero-link-count" class="mt-3 text-white/50 dark:text-slate-400 text-xs sm:text-sm"></p>
    </div>
  </section>

  <main id="sections-container" class="relative mt-6"></main>

  <footer class="border-t border-gray-200 dark:border-slate-800">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">

        <div>
          <h5 class="font-semibold text-gray-700 dark:text-slate-300 mb-2">
            <svg class="w-4 h-4 inline-block mr-1 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            关于成医通
          </h5>
          <p class="text-gray-400 dark:text-slate-500 leading-relaxed mb-1.5">
            成都医学院学生专属导航页，汇集教务系统、图书馆、一卡通等校内常用链接。
          </p>
          <p class="text-gray-400 dark:text-slate-500 leading-relaxed">
            <span class="inline-flex items-center gap-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              构建于 ${new Date().toLocaleDateString('zh-CN')}
            </span>
          </p>
          <p class="mt-2 text-xs text-gray-300 dark:text-slate-600">
            <a href="https://github.com" class="footer-link">GitHub 开源</a>
            &nbsp;·&nbsp; Made with 💙 for CMC
          </p>
        </div>

        <div>
          <h5 class="font-semibold text-gray-700 dark:text-slate-300 mb-2">
            <svg class="w-4 h-4 inline-block mr-1 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
            贡献链接
          </h5>
          <p class="text-gray-400 dark:text-slate-500 leading-relaxed mb-1.5">
            想添加链接或反馈问题？
          </p>
          <p class="text-gray-400 dark:text-slate-500 leading-relaxed">
            联系 <span class="text-primary dark:text-blue-400 font-medium">QQ群或邮箱</span> 即可投稿，无需技术基础。
          </p>
        </div>

      </div>
    </div>
  </footer>
`;

// 隐藏加载进度条
window.addEventListener('load', () => {
  const bar = document.getElementById('loading-bar');
  if (bar) {
    bar.addEventListener('animationend', () => {
      bar.style.opacity = '0';
      bar.style.transition = 'opacity 0.3s';
      setTimeout(() => bar.remove(), 300);
    });
  }
});

const headerContainer = app.querySelector('#header-container')!;
headerContainer.appendChild(createHeader());

// 渲染分类板块
let sectionsContainer: HTMLElement = app.querySelector('#sections-container')!;
const grouped = new Map<'common' | 'study' | 'life' | 'campus' | 'other', typeof links>();
for (const link of links) {
  const list = grouped.get(link.category);
  if (list) list.push(link);
  else grouped.set(link.category, [link]);
}
const newSections = createLinkSections(grouped, categories, (link) => {
  showQrDialog(link);
});
sectionsContainer.replaceWith(newSections);
sectionsContainer = newSections;

const heroCount = document.getElementById('hero-link-count');
if (heroCount) {
  heroCount.textContent = `本网站已收录 ${links.length} 个常用链接`;
}

const searchInput = app.querySelector('#search-input') as HTMLInputElement;
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && searchInput.value.trim()) {
    e.preventDefault();
    doWebSearch(searchInput.value);
  }
});

app.querySelectorAll<HTMLButtonElement>('.engine-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    switchEngine(btn.dataset.engine as SearchEngine);
  });
});

// 回到顶部
const backToTop = document.createElement('button');
backToTop.id = 'back-to-top';
backToTop.setAttribute('aria-label', '回到顶部');
backToTop.innerHTML = `
  <svg class="w-5 h-5 text-primary dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
  </svg>
`;
document.body.appendChild(backToTop);

let scrollTicking = false;
window.addEventListener('scroll', () => {
  if (!scrollTicking) {
    requestAnimationFrame(() => {
      backToTop.classList.toggle('visible', window.scrollY > 300);
      scrollTicking = false;
    });
    scrollTicking = true;
  }
}, { passive: true });

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
