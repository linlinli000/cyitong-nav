/**
 * <nav-theme-toggle> 暗色模式切换
 * 手动选择优先；未手动设置时 Layout 头部内联脚本保持跟随系统。
 */
const SUN_SVG =
  '<svg data-icon="sun" class="h-6 w-6 hidden" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>';
const MOON_SVG =
  '<svg data-icon="moon" class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>';

class NavThemeToggle extends HTMLElement {
  connectedCallback(): void {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', '切换暗色模式');
    btn.className =
      'grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-surface hover:text-ink';
    btn.innerHTML = `${SUN_SVG}${MOON_SVG}`;

    btn.addEventListener('click', () => {
      const dark = !document.documentElement.classList.contains('dark');
      document.documentElement.classList.toggle('dark', dark);
      try {
        localStorage.setItem('theme', dark ? 'dark' : 'light');
      } catch {
        /* 忽略 */
      }
      syncIcons(dark);
    });

    this.appendChild(btn);
    syncIcons(document.documentElement.classList.contains('dark'));
  }
}

function syncIcons(dark: boolean): void {
  document
    .querySelectorAll('nav-theme-toggle [data-icon]')
    .forEach((el) => el.classList.toggle('hidden', el.getAttribute('data-icon') === (dark ? 'moon' : 'sun')));
}

customElements.define('nav-theme-toggle', NavThemeToggle);
