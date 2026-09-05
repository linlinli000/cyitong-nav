/**
 * <nav-sidebar> 侧边栏行为增强
 * - 一级分类折叠/展开（仅本次会话内的瞬时开关，刷新后全折叠，不写 localStorage）
 * - IntersectionObserver 滚动监听高亮当前分类
 * - 移动端抽屉（汉堡按钮打开 / 遮罩或 Esc 关闭）
 * - 桌面端折叠成图标条（默认展开、localStorage 持久化）+ 收起态 hover/focus 浮出子分类
 * 静态标记由 Sidebar.astro 服务端渲染，此组件仅负责增强。
 */

/** 桌面端侧栏折叠状态（默认展开；localStorage 持久化），值：'collapsed' | 'expanded' */
const RAIL_KEY = 'nav:rail';

/** 折叠态行点击用键盘（Enter/Space，detail === 0）触发时，把焦点移入浮层 */
const RAIL_WIDTH = 1024;

class NavSidebar extends HTMLElement {
  private aside: HTMLElement | null = null;
  private backdrop: HTMLElement | null = null;
  private observer: IntersectionObserver | null = null;
  private lastActive = '';

  /** 收起态子分类浮层（宿主下的固定定位面板，不能放进 aside——translate 会构成 containing block） */
  private flyout: HTMLDivElement | null = null;
  /** 当前浮层对应的分类行按钮，Esc 关浮层时还焦 */
  private flyoutTrigger: HTMLButtonElement | null = null;
  private flyoutTimer: number | null = null;
  /** 焦点从浮层还回触发行时，抑制行的 focus → 重开浮层循环 */
  private suppressFocusOpen = false;

  private onDocClick = (e: MouseEvent): void => {
    // 桌面端折叠/展开按钮在 TopBar（header）内，组件外 → 文档级委托
    if ((e.target as Element).closest('[data-sidebar-toggle]')) {
      e.preventDefault();
      this.toggleRail();
      return;
    }
    const opener = (e.target as Element).closest('[data-mobile-nav-open]');
    if (opener) {
      e.preventDefault();
      this.openDrawer();
    }
  };

  private onDocKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    // Esc 优先关浮层（浮层内部 Esc 已 stopPropagation，到这里的是行外/全局场景）
    if (this.flyout?.classList.contains('open')) {
      this.closeFlyout(true);
      return;
    }
    this.closeDrawer();
  };

  /** 捕获阶段滚动（页面滚动 / 图标条内部滚动都算）→ 关浮层 */
  private onDocScroll = (): void => this.closeFlyout(false);

  /** 点击浮层与分类行以外 → 关浮层（捕获阶段，先于行内处理） */
  private onDocClickCapture = (e: MouseEvent): void => {
    if (!this.flyout?.classList.contains('open')) return;
    const t = e.target as Element;
    if (!this.flyout.contains(t) && !t.closest('.sidebar-cat-toggle')) this.closeFlyout(false);
  };

  connectedCallback(): void {
    this.aside = this.querySelector('#sidebar');
    this.backdrop = this.querySelector('[data-sidebar-backdrop]');

    // 清理旧版遗留的「分类展开」存储（该功能已改为不持久化）
    try {
      localStorage.removeItem('nav:expanded');
    } catch {
      /* 忽略 */
    }

    this.initCollapse();
    this.restoreRailState();
    this.initSpy();
    this.initDrawer();
    this.initFlyout();
    this.syncToggleState();
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
    document.removeEventListener('click', this.onDocClick);
    document.removeEventListener('keydown', this.onDocKeydown);
    document.removeEventListener('scroll', this.onDocScroll, true);
    document.removeEventListener('click', this.onDocClickCapture, true);
    if (this.flyoutTimer !== null) window.clearTimeout(this.flyoutTimer);
    this.flyout?.remove();
    document.body.classList.remove('overflow-hidden');
  }

  // ── 折叠/展开 ──

  private initCollapse(): void {
    // 分类手风琴仅会话内瞬时开关：刷新后全折叠，不写 localStorage（用户选择）
    this.addEventListener('click', (e) => {
      const toggle = (e.target as Element).closest<HTMLElement>('.sidebar-cat-toggle');
      if (!toggle) return;
      const group = toggle.closest<HTMLElement>('.sidebar-group');
      if (!group) return;

      // 命中箭头（.sidebar-chevron）：只开合手风琴，不跳转
      const hitChevron = !!(e.target as Element).closest('.sidebar-chevron');

      if (window.innerWidth >= RAIL_WIDTH) {
        // 桌面图标条（收起态）：行点击不切手风琴，跳到该分类「全部」。
        // 子分类预览走 hover/focus 浮层（见 initFlyout）；键盘可 → 进浮层选子分类。
        if (this.isCollapsed()) {
          this.jumpToCategory(group);
          return;
        }
        // 桌面展开态：开合手风琴；点箭头 → 只开合不跳转，点行其余区域 → 再跳到该分类「全部」
        group.classList.toggle('open');
        if (!hitChevron) this.jumpToCategory(group);
        return;
      }
      // <lg 移动抽屉内：仅开合子分类，不跳转（抽屉盖住内容，滚动无意义）
      group.classList.toggle('open');
    });
  }

  /** 恢复桌面端折叠偏好（默认展开，无记录/记录为 expanded → 不加类）。
   *  Sidebar.astro 的 inline bootstrap 已在首帧前处理过「收起」；这里兜底再同步一次（如直连 dev HMR）。
   *  值以原始字符串存储（同 theme 的写法），bootstrap 与这里都用 getItem === 'collapsed' 比对。 */
  private restoreRailState(): void {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(RAIL_KEY);
    } catch {
      /* 忽略 */
    }
    if (saved === 'collapsed') {
      this.aside?.classList.add('is-collapsed');
    } else {
      this.aside?.classList.remove('is-collapsed');
    }
  }

  // ── 滚动监听 ──

  private initSpy(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = (entry.target as HTMLElement).dataset.spy;
          if (id) this.setActive(id);
        }
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 },
    );
    document.querySelectorAll<HTMLElement>('[data-spy]').forEach((sec) => this.observer?.observe(sec));
  }

  private setActive(id: string): void {
    if (id === this.lastActive) return;
    this.lastActive = id;

    this.querySelectorAll<HTMLElement>('.sidebar-cat-link').forEach((link) => {
      link.classList.toggle('active', link.closest<HTMLElement>('.sidebar-group')?.dataset.cat === id);
    });

    const group = this.querySelector<HTMLElement>(`.sidebar-group[data-cat="${id}"]`);
    if (group) {
      group.classList.add('open');
      group.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  // ── 桌面端图标条（折叠/展开 + 收起态浮层） ──

  private isCollapsed(): boolean {
    // 状态类由 SSR 默认烘焙在 aside；宽度门控保证 <lg 的抽屉始终走全宽手风琴
    return !!this.aside?.classList.contains('is-collapsed') && window.innerWidth >= RAIL_WIDTH;
  }

  private toggleRail(): void {
    this.aside?.classList.toggle('is-collapsed');
    try {
      localStorage.setItem(RAIL_KEY, this.aside?.classList.contains('is-collapsed') ? 'collapsed' : 'expanded');
    } catch {
      /* 忽略 */
    }
    this.syncToggleState();
    this.closeFlyout(false);
  }

  /** 汉堡按钮 aria 与「展开/收起」文案随当前状态同步（按钮在 TopBar，需全文档） */
  private syncToggleState(): void {
    const collapsed = this.aside?.classList.contains('is-collapsed') ?? true;
    document.querySelectorAll<HTMLElement>('[data-sidebar-toggle]').forEach((btn) => {
      btn.setAttribute('aria-expanded', String(!collapsed));
      btn.setAttribute('aria-label', collapsed ? '展开侧边栏' : '收起侧边栏');
    });
  }

  /** 收起态点击分类图标：跳到该一级分类并切回「全部」视图 */
  private jumpToCategory(group: HTMLElement): void {
    this.closeFlyout(false);
    const cat = group.dataset.cat;
    if (!cat) return;
    const section = document.querySelector<HTMLElement>(`[data-cat-block="${cat}"]`);
    if (!section) return;
    // 结构类型：nav-cat-tabs 自定义元素升级后带 activate(filter)，'' = 全部视图
    const tabs = section.querySelector('nav-cat-tabs') as { activate: (filter: string) => void } | null;
    tabs?.activate('');
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private initFlyout(): void {
    this.flyout = document.createElement('div');
    this.flyout.className = 'sidebar-flyout';
    this.append(this.flyout);

    this.querySelectorAll<HTMLElement>('.sidebar-group').forEach((group) => {
      group.addEventListener('pointerenter', () => {
        if (this.isCollapsed()) this.openFlyout(group, false);
      });
      group.addEventListener('pointerleave', (e) => this.onGroupLeave(e, group));

      const btn = group.querySelector<HTMLButtonElement>('.sidebar-cat-toggle');
      btn?.addEventListener('focus', () => {
        if (this.isCollapsed() && !this.suppressFocusOpen) this.openFlyout(group, false);
      });
      // 焦点离开本行（且不在浮层）时关闭，避免 Tab 走后浮层残留
      btn?.addEventListener('focusout', (e) => {
        const rel = e.relatedTarget as Node | null;
        if (!rel || (!group.contains(rel) && !this.flyout?.contains(rel))) this.closeFlyout(false);
      });
      // 收起态：←/→ 在图标行与浮层间移动焦点（Enter 默认 = 跳到该分类全部）
      btn?.addEventListener('keydown', (e) => {
        if (!this.isCollapsed()) return;
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          this.openFlyout(group, true);
        } else if (e.key === 'ArrowLeft' && this.flyout?.classList.contains('open')) {
          e.preventDefault();
          this.closeFlyout(true);
        }
      });
    });

    this.flyout.addEventListener('pointerenter', () => this.cancelFlyoutClose());
    this.flyout.addEventListener('pointerleave', () => this.scheduleFlyoutClose());
    this.flyout.addEventListener('click', (e) => {
      if ((e.target as Element).closest('a.sub-link')) this.closeFlyout(false);
    });
    this.flyout.addEventListener('keydown', (e) => this.onFlyoutKeydown(e));
    this.flyout.addEventListener('focusout', (e) => {
      const rel = e.relatedTarget as Node | null;
      if (!rel || !this.flyout?.contains(rel)) this.closeFlyout(false);
    });

    document.addEventListener('scroll', this.onDocScroll, true);
    document.addEventListener('click', this.onDocClickCapture, true);
  }

  private onGroupLeave(e: PointerEvent, group: HTMLElement): void {
    const rel = e.relatedTarget as Node | null;
    // 正移入本行子项或浮层 → 保持
    if (rel && (group.contains(rel) || this.flyout?.contains(rel))) return;
    this.scheduleFlyoutClose();
  }

  private scheduleFlyoutClose(): void {
    this.cancelFlyoutClose();
    this.flyoutTimer = window.setTimeout(() => this.closeFlyout(false), 150);
  }

  private cancelFlyoutClose(): void {
    if (this.flyoutTimer !== null) {
      window.clearTimeout(this.flyoutTimer);
      this.flyoutTimer = null;
    }
  }

  /** 克隆该行 .sidebar-sub 里的子分类链接到浮层（克隆保留 data-sub-id/data-cat/href，
   *  现成 nav-cat-tabs 文档级委托即可直达）。浮层 fixed 定位避让 rail，右缘对齐 + 视口夹紧。 */
  private openFlyout(group: HTMLElement, moveFocus: boolean): void {
    if (!this.isCollapsed() || !this.flyout) return;
    this.cancelFlyoutClose();

    const sub = group.querySelector<HTMLElement>('.sidebar-sub');
    if (!sub) return;

    const title = document.createElement('div');
    title.className = 'sidebar-flyout-title';
    title.textContent = group.querySelector('.sidebar-cat-name')?.textContent ?? '';

    this.flyout.replaceChildren(title, sub.cloneNode(true));
    this.flyoutTrigger = group.querySelector<HTMLButtonElement>('.sidebar-cat-toggle');

    const r = group.getBoundingClientRect();
    this.flyout.classList.add('open');
    const fw = this.flyout.offsetWidth;
    const fh = this.flyout.offsetHeight;
    const maxTop = Math.max(8, window.innerHeight - fh - 8);
    this.flyout.style.left = `${Math.max(8, Math.min(r.right + 8, window.innerWidth - fw - 8))}px`;
    this.flyout.style.top = `${Math.min(maxTop, Math.max(8, r.top))}px`;

    if (moveFocus) {
      const first = this.flyout.querySelector<HTMLElement>('a.sub-link');
      this.suppressFocusOpen = true;
      first?.focus();
      window.setTimeout(() => {
        this.suppressFocusOpen = false;
      }, 0);
    }
  }

  private closeFlyout(returnFocus: boolean): void {
    this.cancelFlyoutClose();
    if (!this.flyout?.classList.contains('open')) return;
    this.flyout.classList.remove('open');
    if (returnFocus) {
      // 抑一次触发行 focus → 重开，再复位
      this.suppressFocusOpen = true;
      this.flyoutTrigger?.focus();
      window.setTimeout(() => {
        this.suppressFocusOpen = false;
      }, 0);
    }
  }

  private onFlyoutKeydown(e: KeyboardEvent): void {
    const links = Array.from(this.flyout?.querySelectorAll<HTMLAnchorElement>('a.sub-link') ?? []);
    const isDown = e.key === 'ArrowDown';
    const isUp = e.key === 'ArrowUp';
    if (!isDown && !isUp && e.key !== 'Escape') return;

    if (isDown || isUp) {
      e.preventDefault();
      if (!links.length) return;
      const cur = document.activeElement as Element | null;
      let idx = cur ? links.indexOf(cur as HTMLAnchorElement) : -1;
      if (isDown) idx = idx < 0 ? 0 : (idx + 1) % links.length;
      else idx = idx < 0 ? links.length - 1 : (idx - 1 + links.length) % links.length;
      links[idx]?.focus();
      return;
    }

    // Esc：关浮层并把焦点还回触发行；stopPropagation 避免再落到文档 Esc → closeDrawer
    e.preventDefault();
    e.stopPropagation();
    this.closeFlyout(true);
  }

  // ── 移动端抽屉 ──

  private initDrawer(): void {
    document.addEventListener('click', this.onDocClick);
    document.addEventListener('keydown', this.onDocKeydown);

    this.backdrop?.addEventListener('click', () => this.closeDrawer());

    // 点击抽屉内链接后关闭
    this.addEventListener('click', (e) => {
      if ((e.target as Element).closest('.sub-link')) this.closeDrawer();
    });
  }

  private openDrawer(): void {
    this.aside?.classList.remove('-translate-x-full');
    this.aside?.classList.add('translate-x-0');
    this.backdrop?.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    this.setOpenerExpanded(true);
  }

  private closeDrawer(): void {
    this.aside?.classList.remove('translate-x-0');
    this.aside?.classList.add('-translate-x-full');
    this.backdrop?.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
    this.setOpenerExpanded(false);
  }

  private setOpenerExpanded(expanded: boolean): void {
    document.querySelectorAll('[data-mobile-nav-open]').forEach((btn) => {
      btn.setAttribute('aria-expanded', String(expanded));
    });
  }
}

customElements.define('nav-sidebar', NavSidebar);
