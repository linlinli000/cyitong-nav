/** <nav-backtotop>：滚动超过阈值淡入，点击平滑回顶 */
import { iconEl } from './icons';

class NavBackToTop extends HTMLElement {
  private cleanup: (() => void) | null = null;

  connectedCallback(): void {
    this.innerHTML = `
      <button type="button" data-role="btn" aria-label="回到顶部"
        class="pointer-events-none fixed bottom-24 right-6 z-40 grid h-11 w-11 translate-y-2 place-items-center rounded-xl border border-line bg-card text-brand opacity-0 shadow-lg transition-all duration-200 hover:shadow-xl dark:text-on-solid">
        ${iconEl('chevron-up', 'h-5 w-5')}
      </button>`;

    const btn = this.querySelector<HTMLElement>('[data-role="btn"]')!;
    const onScroll = (): void => {
      const show = window.scrollY > 480;
      btn.classList.toggle('opacity-0', !show);
      btn.classList.toggle('pointer-events-none', !show);
      btn.classList.toggle('translate-y-2', !show);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    onScroll();

    this.cleanup = () => window.removeEventListener('scroll', onScroll);
  }

  disconnectedCallback(): void {
    this.cleanup?.();
  }
}

customElements.define('nav-backtotop', NavBackToTop);
