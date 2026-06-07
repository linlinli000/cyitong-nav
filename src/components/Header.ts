/** Header — 顶部导航栏 */

import { categories } from '../data/links';
import { iconSvg } from '../data/icons';

export function createHeader(): HTMLElement {
  const header = document.createElement('header');
  header.className = 'bg-primary-dark/95 dark:bg-slate-900/95 backdrop-blur border-b border-white/10 sticky top-0 z-50';

  const navLinks = categories
    .map(cat => `
      <a href="#section-${cat.id}"
         class="header-nav-link text-white/60 hover:text-white dark:text-slate-400 dark:hover:text-slate-200
                text-sm font-medium no-underline transition-colors px-2 py-1 rounded-md
                hover:bg-white/10 dark:hover:bg-white/5 whitespace-nowrap">
        ${cat.name}
      </a>
    `)
    .join('');

  header.innerHTML = `
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center h-12 sm:h-14 gap-2 sm:gap-3">

        <a href="/" class="flex items-center gap-2 shrink-0 no-underline group">
          <svg class="w-6 h-6 sm:w-7 sm:h-7 text-white transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.33A48.07 48.07 0 0112 9.75c-2.55 0-5.02.2-7.5.58V21M4.5 21h15" />
          </svg>
          <span class="text-lg sm:text-xl font-bold text-white tracking-wide">成医通</span>
          <span class="hidden sm:inline text-primary-light dark:text-slate-400 text-[10px] bg-white/15 dark:bg-white/10 px-2 py-0.5 rounded-full">CMC Nav</span>
        </a>

        <nav class="hidden md:flex items-center gap-0.5 ml-2" aria-label="分类导航">
          ${navLinks}
        </nav>

        <div class="flex-1"></div>

        <button id="menu-toggle" type="button"
           class="md:hidden header-icon-btn text-white/60 hover:text-white dark:text-slate-400 dark:hover:text-slate-200
                  transition-colors p-1.5 rounded-lg hover:bg-white/10 dark:hover:bg-white/5"
           title="菜单" aria-label="打开菜单" aria-expanded="false">
          <svg id="menu-icon-bars" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
          <svg id="menu-icon-close" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>

        <a href="https://github.com" target="_blank" rel="noopener noreferrer"
           class="header-icon-btn text-white/60 hover:text-white dark:text-slate-400 dark:hover:text-slate-200
                  transition-colors p-1.5 rounded-lg hover:bg-white/10 dark:hover:bg-white/5"
           title="GitHub 开源" aria-label="GitHub">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd"/>
          </svg>
        </a>

        <button id="dark-toggle" type="button"
           class="header-icon-btn text-white/60 hover:text-white dark:text-slate-400 dark:hover:text-slate-200
                  transition-colors p-1.5 rounded-lg hover:bg-white/10 dark:hover:bg-white/5"
           title="切换暗色模式" aria-label="切换暗色模式">
          <svg id="dark-toggle-sun" class="w-5 h-5 hidden dark:inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
          </svg>
          <svg id="dark-toggle-moon" class="w-5 h-5 inline-block dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
          </svg>
        </button>

      </div>

      <div id="mobile-menu" class="mobile-menu hidden">
        <nav class="flex flex-col gap-0.5 py-2 border-t border-white/10 dark:border-white/5" aria-label="移动端分类导航">
          ${categories.map(cat => `
            <a href="#section-${cat.id}"
               class="mobile-menu-link flex items-center gap-2.5 text-sm font-medium
                      text-white/80 hover:text-white dark:text-slate-300 dark:hover:text-slate-100
                      no-underline transition-colors px-3 py-2.5 rounded-lg
                      hover:bg-white/10 dark:hover:bg-white/5">
              ${iconSvg(cat.icon, 'w-5 h-5 shrink-0')}
              ${cat.name}
            </a>
          `).join('')}
        </nav>
      </div>
    </div>
  `;

  // 暗色模式
  const darkToggle = header.querySelector('#dark-toggle') as HTMLButtonElement;
  if (darkToggle) {
    darkToggle.addEventListener('click', () => {
      const html = document.documentElement;
      const isDark = html.classList.toggle('dark');
      try {
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
      } catch { /* localStorage 不可用时忽略 */ }
    });
  }

  // 汉堡菜单
  const menuToggle = header.querySelector('#menu-toggle') as HTMLButtonElement;
  const mobileMenu = header.querySelector('#mobile-menu') as HTMLElement;
  const barsIcon = header.querySelector('#menu-icon-bars') as HTMLElement;
  const closeIcon = header.querySelector('#menu-icon-close') as HTMLElement;

  if (menuToggle && mobileMenu) {
    let menuOpen = false;

    menuToggle.addEventListener('click', () => {
      menuOpen = !menuOpen;
      if (menuOpen) {
        openMenu();
      } else {
        closeMenu();
      }
    });

    mobileMenu.querySelectorAll<HTMLAnchorElement>('.mobile-menu-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href) {
          const target = document.querySelector(href);
          if (target) {
            const headerHeight = header.offsetHeight;
            const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 12;
            window.scrollTo({ top, behavior: 'smooth' });
          }
        }
        closeMenu();
      });
    });

    function openMenu(): void {
      // 先移除 hidden，下一帧加 open 触发 CSS transition
      mobileMenu.classList.remove('hidden');
      requestAnimationFrame(() => {
        mobileMenu.classList.add('open');
      });
      barsIcon.classList.add('hidden');
      closeIcon.classList.remove('hidden');
      menuToggle.setAttribute('aria-label', '关闭菜单');
      menuToggle.setAttribute('aria-expanded', 'true');
    }

    function closeMenu(): void {
      menuOpen = false;
      mobileMenu.classList.remove('open');
      // 等 CSS transition 播完再加 hidden
      const onTransitionEnd = () => {
        mobileMenu.classList.add('hidden');
        mobileMenu.removeEventListener('transitionend', onTransitionEnd);
      };
      mobileMenu.addEventListener('transitionend', onTransitionEnd);
      barsIcon.classList.remove('hidden');
      closeIcon.classList.add('hidden');
      menuToggle.setAttribute('aria-label', '打开菜单');
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  }

  // 分类锚点平滑滚动
  header.querySelectorAll<HTMLAnchorElement>('.header-nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (href) {
        const target = document.querySelector(href);
        if (target) {
          // 减去 sticky header 的高度，避免内容被遮挡
          const headerHeight = header.offsetHeight;
          const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 12;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }
    });
  });

  return header;
}
