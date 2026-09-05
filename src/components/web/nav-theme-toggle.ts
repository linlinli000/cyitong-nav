/** <nav-theme-toggle>：切换 .dark 并持久化 theme */
import { iconEl } from './icons';

class NavThemeToggle extends HTMLElement {
  connectedCallback(): void {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', '切换暗色模式');
    btn.className =
      'grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-surface hover:text-ink';
    btn.innerHTML = `${iconEl('sun', 'h-6 w-6 hidden', ' data-icon="sun"')}${iconEl('moon', 'h-6 w-6', ' data-icon="moon"')}`;

    btn.addEventListener('click', () => {
      const dark = !document.documentElement.classList.contains('dark');
      document.documentElement.classList.toggle('dark', dark);
      try {
        localStorage.setItem('theme', dark ? 'dark' : 'light');
      } catch {}
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
