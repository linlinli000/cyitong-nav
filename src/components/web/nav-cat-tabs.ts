/**
 * <nav-cat-tabs> 一级分类容器内的子分类 tab 过滤 + 卡片折叠
 * - 点击容器内 .cat-tab 按钮，按 data-filter 显隐 .link-tile 卡片（'' = 全部）
 * - 折叠：全部视图下最多展示 3 排（桌面 ≥1024px）/ 5 排（移动端）卡片，
 *   超出部分通过容器内 .cat-more 按钮展开/收起；过滤视图始终展示全部命中卡片
 * - 文档级委托：点击侧边栏 a.sub-link[data-sub-id] → 切到对应 tab 并滚动到容器
 * 静态标记由 CategoryBlock.astro 服务端渲染，此组件仅负责增强。
 *
 * 注意：卡片显隐用内联 style.display，不能用 hidden 属性——
 * LinkCard 根节点带 .flex，会覆盖 UA 的 [hidden]{display:none}。
 * 「查看更多」按钮用 hidden 属性控制，靠 .cat-more[hidden]{display:none} 兜底。
 */
let delegated = false;

/** 折叠上限（按排数）：桌面端 3 排，移动端 5 排（与 Tailwind lg=1024px 断点一致） */
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

  /** 切换到指定 filter（'' = 全部），并同步高亮 + 显隐卡片 */
  activate(filter: string): void {
    this.filter = filter;
    this.querySelectorAll<HTMLButtonElement>('.cat-tab').forEach((b) => {
      b.classList.toggle('active', (b.dataset.filter ?? '') === filter);
    });
    this.applyDisplay();
  }

  /** 一级分类容器（卡片网格/查看更多按钮与 <nav-cat-tabs> 同 section 并列，非子节点） */
  private block(): HTMLElement {
    return this.closest<HTMLElement>('[data-cat-block]') ?? this;
  }

  private grid(): HTMLElement | null {
    return this.block().querySelector<HTMLElement>('.cat-grid');
  }

  /** 当前视口下最多展示的卡片数 = 实际列数 × 排数（列数随断点自适应） */
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
      // 过滤视图展示全部命中卡片；全部视图受折叠上限约束
      const show = this.filter !== '' ? match : this.expanded || i < this.maxCards;
      card.style.display = show ? '' : 'none';
    });

    if (this.moreBtn) {
      // 仅「全部」视图且存在溢出卡片时显示查看更多
      const hasOverflow = this.filter === '' && cards.length > this.maxCards;
      this.moreBtn.hidden = !hasOverflow;
      if (hasOverflow) {
        this.moreBtn.classList.toggle('expanded', this.expanded);
        const label = this.moreBtn.querySelector('.cat-more-label');
        if (label) label.textContent = this.expanded ? '收起' : '查看更多';
      }
    }
  }

  /** 侧边栏二级分类链接联动（文档级委托，全站只注册一次） */
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
