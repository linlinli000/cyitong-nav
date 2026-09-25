/** <nav-cat-tabs>：子分类 tab 过滤 + 卡片折叠，仅增强 CategoryBlock 静态标记 */
import { BREAKPOINT_LG } from '../breakpoints';

const ROWS_DESKTOP = 3;
const ROWS_MOBILE = 5;

export class NavCatTabs extends HTMLElement {
  private filter = '';
  private expanded = false;
  private maxCards = Infinity;
  private moreBtn: HTMLButtonElement | null = null;
  private moreLine: HTMLElement | null = null;

  private onResize = (): void => {
    this.maxCards = this.computeMaxCards();
    this.applyDisplay();
  };

  private onMoreClick = (): void => {
    this.expanded = !this.expanded;
    this.applyDisplay();
  };

  connectedCallback(): void {
    this.addEventListener('click', this.onTabClick);
    this.addEventListener('keydown', this.onTabKeydown);
    this.moreBtn = this.block().querySelector<HTMLButtonElement>('.cat-more');
    this.moreBtn?.addEventListener('click', this.onMoreClick);
    this.moreLine = this.block().querySelector<HTMLElement>('.cat-more-line');
    this.onResize();
    window.addEventListener('resize', this.onResize);
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.onTabClick);
    this.removeEventListener('keydown', this.onTabKeydown);
    this.moreBtn?.removeEventListener('click', this.onMoreClick);
    window.removeEventListener('resize', this.onResize);
  }

  private onTabClick = (e: Event): void => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('.cat-tab');
    if (!btn || !this.contains(btn)) return;
    this.activate(btn.dataset.filter ?? '');
  };

  /** tablist 方向键导航 */
  private onTabKeydown = (e: KeyboardEvent): void => {
    const tabs = this.tabButtons();
    const i = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (i === -1) return;
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next === -1) return;
    e.preventDefault();
    tabs[next].focus();
    this.activate(tabs[next].dataset.filter ?? '');
  };

  private tabButtons(): HTMLButtonElement[] {
    return [...this.querySelectorAll<HTMLButtonElement>('.cat-tab')];
  }

  activate(filter: string): void {
    this.filter = filter;
    const panel = this.grid();
    this.tabButtons().forEach((b) => {
      const selected = (b.dataset.filter ?? '') === filter;
      b.classList.toggle('active', selected);
      b.setAttribute('aria-selected', String(selected));
      b.tabIndex = selected ? 0 : -1;
      if (selected && b.id) panel?.setAttribute('aria-labelledby', b.id);
    });
    this.applyDisplay();
  }

  private block(): HTMLElement {
    return this.closest<HTMLElement>('[data-cat-block]') ?? this;
  }

  private grid(): HTMLElement | null {
    return this.block().querySelector<HTMLElement>('.cat-grid');
  }

  private computeMaxCards(): number {
    const grid = this.grid();
    if (!grid) return Infinity;
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length || 1;
    const rows = window.innerWidth >= BREAKPOINT_LG ? ROWS_DESKTOP : ROWS_MOBILE;
    return cols * rows;
  }

  private applyDisplay(): void {
    const cards = [...this.block().querySelectorAll<HTMLElement>('.link-tile')];

    cards.forEach((card, i) => {
      const match = this.filter === '' || (card.dataset.sub ?? '') === this.filter;
      const show = this.filter !== '' ? match : this.expanded || i < this.maxCards;
      card.hidden = !show;
    });

    if (this.moreBtn) {
      const hasOverflow = this.filter === '' && cards.length > this.maxCards;
      this.moreBtn.hidden = !hasOverflow;
      if (this.moreLine) this.moreLine.hidden = !hasOverflow;
      if (hasOverflow) {
        this.moreBtn.classList.toggle('expanded', this.expanded);
        const label = this.moreBtn.querySelector('.cat-more-label');
        if (label) label.textContent = this.expanded ? '收起' : '更多';
      }
    }
  }
}

customElements.define('nav-cat-tabs', NavCatTabs);
