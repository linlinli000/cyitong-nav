/** <nav-cat-tabs>：子分类 tab 过滤 + 卡片分页展开 */
import { BREAKPOINT_LG } from '../shared/breakpoints';
import { scrollBehavior } from '../motion';
import { watchScrollFade } from '../scroll-fade';

const ROWS_DESKTOP = 4;
const ROWS_MOBILE = 5;
const REVEAL_LANDING_RATIO = 0.65;

export class NavCatTabs extends HTMLElement {
  private filter = '';
  /** 1 = 首屏折叠量；逐页 +1 防整块撑开 */
  private page = 1;
  private maxCards = Infinity;
  private moreBtn: HTMLButtonElement | null = null;
  private moreLine: HTMLElement | null = null;
  private foot: HTMLElement | null = null;
  private loadBtn: HTMLButtonElement | null = null;
  private collapseBtn: HTMLButtonElement | null = null;
  private remaining: HTMLElement | null = null;
  private stopFade: (() => void) | null = null;
  private resizeRaf = 0;
  private durMs = 300;
  private easeGlide = 'cubic-bezier(0.16, 1, 0.3, 1)';

  private onResize = (): void => {
    // rAF 合帧后再全量切换显隐
    if (this.resizeRaf) return;
    this.resizeRaf = requestAnimationFrame(() => {
      this.resizeRaf = 0;
      this.maxCards = this.computeMaxCards();
      if (this.page > 1 && this.cards().length <= this.maxCards) this.page = 1;
      this.applyDisplay();
    });
  };

  private onMoreClick = (): void => {
    const expanding = this.page === 1;
    this.page = expanding ? 2 : 1;
    this.animateGrid(() => this.applyDisplay());
    if (expanding) this.scrollToRevealed();
  };

  private onLoadClick = (): void => {
    this.page++;
    this.animateGrid(() => this.applyDisplay());
  };

  private onCollapseClick = (): void => {
    this.page = 1;
    this.animateGrid(() => this.applyDisplay());
    // 焦点归还顶部「更多」，视口不动
    this.moreBtn?.focus({ preventScroll: true });
  };

  /**
   * 展开后把新增首卡滚到视口 65% 处；滚动量封顶到卡片头部贴住顶栏，
   * 否则标题和「更多」会被推出屏幕。
   */
  private scrollToRevealed(): void {
    const first = this.cards()[this.maxCards];
    if (!first) return;
    const landing = Math.round(window.innerHeight * REVEAL_LANDING_RATIO);
    const top = first.getBoundingClientRect().top;
    if (top < landing) return;

    const block = this.closest<HTMLElement>('[data-cat-block]');
    const navH =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 80;
    // 卡片头部距视口顶还有多少余量可滚；<=0 说明头部已在顶栏之上，不许再滚
    const headroom = block ? Math.round(block.getBoundingClientRect().top - navH) : 0;
    const delta = Math.min(Math.round(top - landing), Math.max(0, headroom));
    if (delta <= 0) return;
    window.scrollTo({ top: window.scrollY + delta, behavior: scrollBehavior() });
  }

  /** 高度补间防瞬时撑开/抽走；减少动态效果直落 */
  private animateGrid(mutate: () => void): void {
    const grid = this.grid();
    if (!grid || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      mutate();
      return;
    }
    const from = grid.getBoundingClientRect().height;
    grid.getAnimations().forEach((a) => a.cancel());
    mutate();
    const to = grid.getBoundingClientRect().height;
    if (Math.abs(to - from) < 1) return;
    grid.animate(
      [
        { height: `${from}px`, overflow: 'hidden' },
        { height: `${to}px`, overflow: 'hidden' },
      ],
      { duration: this.durMs, easing: this.easeGlide },
    );
  }

  connectedCallback(): void {
    this.addEventListener('click', this.onTabClick);
    this.addEventListener('keydown', this.onTabKeydown);
    const block = this.block();
    this.moreBtn = block.querySelector<HTMLButtonElement>('.cat-more');
    this.moreBtn?.addEventListener('click', this.onMoreClick);
    this.moreLine = block.querySelector<HTMLElement>('.cat-more-line');
    this.foot = block.querySelector<HTMLElement>('.cat-foot');
    this.loadBtn = block.querySelector<HTMLButtonElement>('[data-cat-load]');
    this.collapseBtn = block.querySelector<HTMLButtonElement>('[data-cat-collapse]');
    this.remaining = block.querySelector<HTMLElement>('[data-cat-remaining]');
    this.loadBtn?.addEventListener('click', this.onLoadClick);
    this.collapseBtn?.addEventListener('click', this.onCollapseClick);
    const strip = this.querySelector<HTMLElement>('[data-fade-x]');
    if (strip) this.stopFade = watchScrollFade(strip);
    const rs = getComputedStyle(document.documentElement);
    this.durMs = parseFloat(rs.getPropertyValue('--dur-slow')) || 300;
    this.easeGlide = rs.getPropertyValue('--ease-glide').trim() || this.easeGlide;
    this.onResize();
    window.addEventListener('resize', this.onResize);
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.onTabClick);
    this.removeEventListener('keydown', this.onTabKeydown);
    this.moreBtn?.removeEventListener('click', this.onMoreClick);
    this.loadBtn?.removeEventListener('click', this.onLoadClick);
    this.collapseBtn?.removeEventListener('click', this.onCollapseClick);
    this.stopFade?.();
    this.stopFade = null;
    if (this.resizeRaf) cancelAnimationFrame(this.resizeRaf);
    this.resizeRaf = 0;
    window.removeEventListener('resize', this.onResize);
  }

  private onTabClick = (e: Event): void => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('.cat-tab');
    if (!btn || !this.contains(btn)) return;
    this.activate(btn.dataset.filter ?? '');
  };

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
    this.page = 1;
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

  private cards(): HTMLElement[] {
    return [...this.block().querySelectorAll<HTMLElement>('.link-tile')];
  }

  private computeMaxCards(): number {
    const grid = this.grid();
    if (!grid) return Infinity;
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length || 1;
    const rows = window.innerWidth >= BREAKPOINT_LG ? ROWS_DESKTOP : ROWS_MOBILE;
    return cols * rows;
  }

  private applyDisplay(): void {
    const cards = this.cards();
    const total = cards.length;
    const paged = this.filter === '';
    const visible = paged ? Math.min(total, this.maxCards * this.page) : total;
    cards.forEach((card, i) => {
      const match = this.filter === '' || (card.dataset.sub ?? '') === this.filter;
      card.hidden = paged ? i >= visible : !match;
    });

    const hasOverflow = paged && total > this.maxCards;
    const expanded = hasOverflow && this.page > 1;
    if (this.moreBtn) {
      this.moreBtn.hidden = !hasOverflow;
      if (this.moreLine) this.moreLine.hidden = !hasOverflow;
      // 隐藏时也复位，免残留展开态
      this.moreBtn.classList.toggle('expanded', expanded);
      this.moreBtn.setAttribute('aria-expanded', String(expanded));
      const label = this.moreBtn.querySelector('.cat-more-label');
      if (label) label.textContent = expanded ? '收起' : '更多';
    }
    if (this.foot) {
      // 底栏只给一次「更多」装不下的长堆，免同屏双「收起」
      const footed = expanded && total > this.maxCards * 2;
      this.foot.hidden = !footed;
      const left = total - visible;
      if (this.loadBtn) {
        // 末批焦点交接「收起」；先记再隐藏：hidden 同步把焦点打回 body
        const wasLoadFocused = document.activeElement === this.loadBtn;
        this.loadBtn.hidden = !footed || left <= 0;
        if (this.remaining) this.remaining.textContent = String(left);
        if (footed && left <= 0 && wasLoadFocused) {
          this.collapseBtn?.focus({ preventScroll: true });
        }
      }
    }
  }
}

customElements.define('nav-cat-tabs', NavCatTabs);
