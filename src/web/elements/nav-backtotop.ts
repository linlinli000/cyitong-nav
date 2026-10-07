/** <nav-backtotop>：滚动超过阈值显示，点击平滑回顶 */
import { scrollBehavior } from '../motion';

const SHOW_AFTER_PX = 480;

class NavBackToTop extends HTMLElement {
  private btn: HTMLElement | null = null;

  private onScroll = (): void => {
    const show = window.scrollY > SHOW_AFTER_PX;
    this.btn?.classList.toggle('opacity-0', !show);
    this.btn?.classList.toggle('pointer-events-none', !show);
    this.btn?.classList.toggle('translate-y-2', !show);
  };

  private onClick = (): void => {
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
  };

  connectedCallback(): void {
    this.btn = this.querySelector<HTMLElement>('[data-role="btn"]');
    if (!this.btn) return;
    this.btn.addEventListener('click', this.onClick);
    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.onScroll();
  }

  disconnectedCallback(): void {
    this.btn?.removeEventListener('click', this.onClick);
    window.removeEventListener('scroll', this.onScroll);
  }
}

customElements.define('nav-backtotop', NavBackToTop);
