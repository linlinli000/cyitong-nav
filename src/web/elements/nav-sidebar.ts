/** <nav-sidebar>：分类手风琴、滚动高亮、移动抽屉、桌面折叠图标条 + 收起态浮层 */
import { CloseGate } from '../close-gate';
import { storageSet } from '../storage';
import { BREAKPOINT_LG } from '../breakpoints';

const RAIL_KEY = 'nav:rail';

class NavSidebar extends HTMLElement {
  private aside: HTMLElement | null = null;
  private backdrop: HTMLElement | null = null;
  private observer: IntersectionObserver | null = null;
  private lastActive = '';

  private flyout: HTMLDivElement | null = null;
  private flyoutTrigger: HTMLElement | null = null;
  private closeGate = new CloseGate(150, () => this.closeFlyout(false));
  private suppressFocusOpen = false;

  private onDocClick = (e: MouseEvent): void => {
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
    this.flyout?.remove();
    document.body.classList.remove('overflow-hidden');
  }

  // ── 折叠/展开 ──

  private initCollapse(): void {
    this.addEventListener('click', (e) => {
      const toggle = (e.target as Element).closest<HTMLElement>('.sidebar-cat-toggle');
      if (!toggle) return;
      const group = toggle.closest<HTMLElement>('.sidebar-group');
      if (!group) return;

      const hitChevron = !!(e.target as Element).closest('.sidebar-chevron');

      if (window.innerWidth >= BREAKPOINT_LG) {
        if (this.isCollapsed()) {
          this.jumpToCategory(group);
          return;
        }
        group.classList.toggle('open');
        if (!hitChevron) this.jumpToCategory(group);
        return;
      }
      group.classList.toggle('open');
    });
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
    return !!this.aside?.classList.contains('is-collapsed') && window.innerWidth >= BREAKPOINT_LG;
  }

  private toggleRail(): void {
    this.aside?.classList.toggle('is-collapsed');
    storageSet(RAIL_KEY, this.aside?.classList.contains('is-collapsed') ? 'collapsed' : 'expanded');
    this.syncToggleState();
    this.closeFlyout(false);
  }

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
      group.addEventListener('pointerleave', (e) => this.onFlyoutLeave(e, group));

      const btn = group.querySelector<HTMLButtonElement>('.sidebar-cat-toggle');
      btn?.addEventListener('focus', () => {
        if (this.isCollapsed() && !this.suppressFocusOpen) this.openFlyout(group, false);
      });
      btn?.addEventListener('focusout', (e) => {
        const rel = e.relatedTarget as Node | null;
        if (!rel || (!group.contains(rel) && !this.flyout?.contains(rel))) this.closeFlyout(false);
      });
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

    this.querySelectorAll<HTMLElement>('.sidebar-footer-link').forEach((link) => {
      link.addEventListener('pointerenter', () => {
        if (this.isCollapsed()) this.openTip(link);
      });
      link.addEventListener('pointerleave', (e) => this.onFlyoutLeave(e, link));
      link.addEventListener('click', () => this.closeFlyout(false));
      link.addEventListener('focus', () => {
        if (this.isCollapsed() && !this.suppressFocusOpen) this.openTip(link);
      });
      link.addEventListener('focusout', (e) => {
        const rel = e.relatedTarget as Node | null;
        if (!rel || (!link.contains(rel) && !this.flyout?.contains(rel))) this.closeFlyout(false);
      });
    });

    this.flyout.addEventListener('pointerenter', () => this.closeGate.cancel());
    this.flyout.addEventListener('pointerleave', () => this.closeGate.schedule());
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

  private onFlyoutLeave(e: PointerEvent, item: HTMLElement): void {
    const rel = e.relatedTarget as Node | null;
    if (rel && (item.contains(rel) || this.flyout?.contains(rel))) return;
    this.closeGate.schedule();
  }

  private openFlyout(group: HTMLElement, moveFocus: boolean): void {
    if (!this.isCollapsed() || !this.flyout) return;
    this.closeGate.cancel();

    const sub = group.querySelector<HTMLElement>('.sidebar-sub');
    if (!sub) return;

    const title = document.createElement('div');
    title.className = 'sidebar-flyout-title';
    title.textContent = group.querySelector('.sidebar-cat-name')?.textContent ?? '';

    this.flyout.classList.remove('sidebar-tip');
    this.flyout.replaceChildren(title, sub.cloneNode(true));
    this.flyoutTrigger = group.querySelector<HTMLButtonElement>('.sidebar-cat-toggle');
    this.layoutFlyout(group, false);

    if (moveFocus) {
      const first = this.flyout.querySelector<HTMLElement>('a.sub-link');
      this.suppressFocusOpen = true;
      first?.focus();
      window.setTimeout(() => {
        this.suppressFocusOpen = false;
      }, 0);
    }
  }

  private openTip(link: HTMLElement): void {
    if (!this.isCollapsed() || !this.flyout) return;
    this.closeGate.cancel();

    const label = document.createElement('span');
    label.className = 'sidebar-tip-text';
    label.textContent = link.querySelector('.sidebar-footer-label')?.textContent?.trim() ?? '';
    if (!label.textContent) return;

    this.flyout.classList.add('sidebar-tip');
    this.flyout.replaceChildren(label);
    this.flyoutTrigger = link;
    this.layoutFlyout(link, true);
  }

  private layoutFlyout(anchor: HTMLElement, centerVertical: boolean): void {
    if (!this.flyout) return;
    const r = anchor.getBoundingClientRect();
    this.flyout.classList.add('open');
    const fw = this.flyout.offsetWidth;
    const fh = this.flyout.offsetHeight;
    const maxTop = Math.max(8, window.innerHeight - fh - 8);
    this.flyout.style.left = `${Math.max(8, Math.min(r.right + 8, window.innerWidth - fw - 8))}px`;
    const top = centerVertical ? r.top + r.height / 2 - fh / 2 : r.top;
    this.flyout.style.top = `${Math.min(maxTop, Math.max(8, top))}px`;
  }

  private closeFlyout(returnFocus: boolean): void {
    this.closeGate.cancel();
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

    e.preventDefault();
    e.stopPropagation();
    this.closeFlyout(true);
  }

  // ── 移动端抽屉 ──

  private initDrawer(): void {
    document.addEventListener('click', this.onDocClick);
    document.addEventListener('keydown', this.onDocKeydown);

    this.backdrop?.addEventListener('click', () => this.closeDrawer());

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
