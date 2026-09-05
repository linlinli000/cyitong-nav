/** <nav-sidebar>：分类手风琴、滚动高亮、移动抽屉、桌面折叠图标条 + 收起态浮层 */
const RAIL_KEY = 'nav:rail'; // 折叠状态（localStorage 持久化）
const RAIL_WIDTH = 1024; // 桌面/移动断点（同 Tailwind lg）

class NavSidebar extends HTMLElement {
  private aside: HTMLElement | null = null;
  private backdrop: HTMLElement | null = null;
  private observer: IntersectionObserver | null = null;
  private lastActive = '';

  /** 收起态浮层：fixed 面板不能放进 aside——translate 会构成 containing block */
  private flyout: HTMLDivElement | null = null;
  private flyoutTrigger: HTMLButtonElement | null = null;
  private flyoutTimer: number | null = null;
  /** 焦点还回触发行时抑制 focus → 重开浮层 */
  private suppressFocusOpen = false;

  private onDocClick = (e: MouseEvent): void => {
    // 折叠/展开按钮在 TopBar 内（组件外）→ 文档级委托
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
    // Esc 优先关浮层（浮层内部 Esc 已 stopPropagation，到此是行外）
    if (this.flyout?.classList.contains('open')) {
      this.closeFlyout(true);
      return;
    }
    this.closeDrawer();
  };

  private onDocScroll = (): void => this.closeFlyout(false);

  private onDocClickCapture = (e: MouseEvent): void => {
    if (!this.flyout?.classList.contains('open')) return;
    const t = e.target as Element;
    if (!this.flyout.contains(t) && !t.closest('.sidebar-cat-toggle')) this.closeFlyout(false);
  };

  connectedCallback(): void {
    this.aside = this.querySelector('#sidebar');
    this.backdrop = this.querySelector('[data-sidebar-backdrop]');

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
    // 手风琴仅会话内瞬时开关（用户选择，不持久化）
    this.addEventListener('click', (e) => {
      const toggle = (e.target as Element).closest<HTMLElement>('.sidebar-cat-toggle');
      if (!toggle) return;
      const group = toggle.closest<HTMLElement>('.sidebar-group');
      if (!group) return;

      // 命中箭头：只开合手风琴，不跳转
      const hitChevron = !!(e.target as Element).closest('.sidebar-chevron');

      if (window.innerWidth >= RAIL_WIDTH) {
        if (this.isCollapsed()) {
          // 收起态（图标条）：行点击跳到该分类「全部」；子分类走 hover/focus 浮层
          this.jumpToCategory(group);
          return;
        }
        // 展开态：开合手风琴；点箭头只开合，点行其余区域再跳「全部」
        group.classList.toggle('open');
        if (!hitChevron) this.jumpToCategory(group);
        return;
      }
      // 移动抽屉内：仅开合子分类（抽屉盖住内容，不跳转）
      group.classList.toggle('open');
    });
  }

  /** 恢复桌面折叠偏好：Sidebar inline bootstrap 首帧前已处理，这里兜底同步（如 dev HMR） */
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

  /** 汉堡按钮 aria/文案随状态同步（按钮在 TopBar） */
  private syncToggleState(): void {
    const collapsed = this.aside?.classList.contains('is-collapsed') ?? true;
    document.querySelectorAll<HTMLElement>('[data-sidebar-toggle]').forEach((btn) => {
      btn.setAttribute('aria-expanded', String(!collapsed));
      btn.setAttribute('aria-label', collapsed ? '展开侧边栏' : '收起侧边栏');
    });
  }

  private jumpToCategory(group: HTMLElement): void {
    this.closeFlyout(false);
    const cat = group.dataset.cat;
    if (!cat) return;
    const section = document.querySelector<HTMLElement>(`[data-cat-block="${cat}"]`);
    if (!section) return;
    // nav-cat-tabs 升级后暴露 activate(filter)；'' = 全部视图
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
      // focusout 到行外且不在浮层 → 关闭（Tab 离开不留残影）
      btn?.addEventListener('focusout', (e) => {
        const rel = e.relatedTarget as Node | null;
        if (!rel || (!group.contains(rel) && !this.flyout?.contains(rel))) this.closeFlyout(false);
      });
      // 收起态 ←/→ 在图标行与浮层间移焦点
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

  /** 克隆该行 .sidebar-sub 到浮层（保留 data 属性/href，nav-cat-tabs 委托直达） */
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

    // Esc：stopPropagation 防再触发文档 Esc → closeDrawer
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
