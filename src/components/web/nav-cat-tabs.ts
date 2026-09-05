/** <nav-cat-tabs>：子分类 tab 过滤 + 卡片折叠 + 侧栏子链接联动，仅增强 CategoryBlock 静态标记 */
let delegated = false;

const ROWS_DESKTOP = 3;
const ROWS_MOBILE = 5;

class NavCatTabs extends HTMLElement {
  private filter = '';
  private expanded = false;
  private maxCards = Infinity;
  private moreBtn: HTMLButtonElement | null = null;

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
    this.moreBtn = this.block().querySelector<HTMLButtonElement>('.cat-more');
    this.moreBtn?.addEventListener('click', this.onMoreClick);
    this.ensureDelegated();
    this.onResize();
    window.addEventListener('resize', this.onResize);
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.onTabClick);
    this.moreBtn?.removeEventListener('click', this.onMoreClick);
    window.removeEventListener('resize', this.onResize);
  }

  private onTabClick = (e: Event): void => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('.cat-tab');
    if (!btn || !this.contains(btn)) return;
    this.activate(btn.dataset.filter ?? '');
  };

  activate(filter: string): void {
    this.filter = filter;
    this.querySelectorAll<HTMLButtonElement>('.cat-tab').forEach((b) => {
      b.classList.toggle('active', (b.dataset.filter ?? '') === filter);
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
    const rows = window.innerWidth >= 1024 ? ROWS_DESKTOP : ROWS_MOBILE;
    return cols * rows;
  }

  private applyDisplay(): void {
    const cards = [...this.block().querySelectorAll<HTMLElement>('.link-tile')];

    cards.forEach((card, i) => {
      const match = this.filter === '' || (card.dataset.sub ?? '') === this.filter;
      const show = this.filter !== '' ? match : this.expanded || i < this.maxCards;
      card.style.display = show ? '' : 'none';
    });

    if (this.moreBtn) {
      const hasOverflow = this.filter === '' && cards.length > this.maxCards;
      this.moreBtn.hidden = !hasOverflow;
      if (hasOverflow) {
        this.moreBtn.classList.toggle('expanded', this.expanded);
        const label = this.moreBtn.querySelector('.cat-more-label');
        if (label) label.textContent = this.expanded ? '收起' : '查看更多';
      }
    }
  }

  private ensureDelegated(): void {
    if (delegated) return;
    delegated = true;

    document.addEventListener('click', (e) => {
      const link = (e.target as Element).closest<HTMLAnchorElement>('a.sub-link[data-sub-id]');
      if (!link) return;
      e.preventDefault();

      const cat = link.dataset.cat;
      const sub = link.dataset.subId;
      if (!cat || !sub) return;

      const section = document.querySelector<HTMLElement>(`[data-cat-block="${cat}"]`);
      if (!section) return;

      section.querySelector<NavCatTabs>('nav-cat-tabs')?.activate(sub);
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

customElements.define('nav-cat-tabs', NavCatTabs);
