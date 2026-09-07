/** <nav-theme-toggle>：切换 .dark 并持久化； */
import { storageSet } from '../storage';

class NavThemeToggle extends HTMLElement {
  private btn: HTMLButtonElement | null = null;

  private onClick = (): void => {
    const dark = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', dark);
    storageSet('theme', dark ? 'dark' : 'light');
  };

  connectedCallback(): void {
    this.btn = this.querySelector<HTMLButtonElement>('[data-theme-toggle]');
    this.btn?.addEventListener('click', this.onClick);
  }

  disconnectedCallback(): void {
    this.btn?.removeEventListener('click', this.onClick);
  }
}

customElements.define('nav-theme-toggle', NavThemeToggle);
