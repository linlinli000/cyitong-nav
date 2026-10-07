/** <nav-sidebar>：分类手风琴、滚动高亮、移动抽屉、桌面折叠图标条（浮层见 sidebar-flyout） */
import { SidebarFlyout } from '../sidebar-flyout';
import { storageSet } from '../storage';
import { lockScroll, unlockScroll } from '../scroll-lock';
import { BREAKPOINT_LG } from '../breakpoints';
import { scrollBehavior } from '../motion';
import type { NavCatTabs } from './nav-cat-tabs';

const RAIL_KEY = 'nav:rail'; // 与 Sidebar.astro 的 inline 脚本同键，改名两处同步
/** 侧栏高亮判定锚点 */
const SPY_ANCHOR = 0.18;

class NavSidebar extends HTMLElement {
  private aside: HTMLElement | null = null;
  private backdrop: HTMLElement | null = null;
  private mobileOpener: HTMLElement | null = null;
  private observer: IntersectionObserver | null = null;
  private sections: HTMLElement[] = [];
  private lastActive = '';

  private flyout = new SidebarFlyout(this, () => this.isCollapsed());
  private mqLg: MediaQueryList | null = null;

  private onMqLgChange = (e: MediaQueryListEvent): void => {
    if (e.matches && this.drawerOpen()) this.closeDrawer();
  };

  private onDocClick = (e: MouseEvent): void => {
    if ((e.target as Element).closest('[data-sidebar-toggle]')) {
      e.preventDefault();
      this.toggleRail();
      return;
    }
    const opener = (e.target as Element).closest<HTMLElement>('[data-mobile-nav-open]');
    if (opener) {
      e.preventDefault();
      this.mobileOpener = opener;
      this.openDrawer();
    }
  };

  private onSubLinkClick = (e: MouseEvent): void => {
    const link = (e.target as Element).closest<HTMLAnchorElement>('a.sub-link[data-sub-id]');
    if (!link) return;
    // 内容页子链接指向首页锚点，交给浏览器导航
    if (!link.getAttribute('href')?.startsWith('#')) return;
    e.preventDefault();
    this.closeDrawer();
    this.focusCategory(link.dataset.cat, link.dataset.subId ?? '');
  };

  private onDocKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    // 焦点在 modal dialog 内时 Esc 归它消费，侧栏不连带关闭
    if ((e.target as Element).closest?.('dialog[open]')) return;
    if (this.flyout.isOpen()) {
      this.flyout.close(true);
      return;
    }
    // 仅在自家抽屉打开时收起
    if (this.drawerOpen()) this.closeDrawer();
  };

  private onToggleClick = (e: MouseEvent): void => {
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
      this.setGroupOpen(group, !group.classList.contains('open'));
      if (!hitChevron) this.jumpToCategory(group);
      return;
    }
    this.setGroupOpen(group, !group.classList.contains('open'));
  };

  private onBackdropClick = (): void => this.closeDrawer();

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
    this.mqLg?.removeEventListener('change', this.onMqLgChange);
    document.removeEventListener('click', this.onDocClick);
    document.removeEventListener('keydown', this.onDocKeydown);
    this.removeEventListener('click', this.onToggleClick);
    this.removeEventListener('click', this.onSubLinkClick);
    this.removeEventListener('pointerover', this.flyout.onPointerOver);
    this.removeEventListener('pointerout', this.flyout.onPointerOut);
    this.removeEventListener('focusin', this.flyout.onFocusIn);
    this.removeEventListener('focusout', this.flyout.onFocusOut);
    this.removeEventListener('keydown', this.flyout.onKeydown);
    this.removeEventListener('click', this.flyout.onItemClick);
    this.backdrop?.removeEventListener('click', this.onBackdropClick);
    this.flyout.destroy();
    if (this.drawerOpen()) unlockScroll();
  }

  // ── 折叠/展开 ──

  private drawerOpen(): boolean {
    return !!this.backdrop && !this.backdrop.hidden;
  }

  // .open 与 aria-expanded 只在此处同切
  private setGroupOpen(group: HTMLElement, open: boolean): void {
    group.classList.toggle('open', open);
    group.querySelector<HTMLElement>('.sidebar-cat-toggle')?.setAttribute('aria-expanded', String(open));
  }

  private initCollapse(): void {
    this.addEventListener('click', this.onToggleClick);
  }

  // ── 滚动监听 ──

  private initSpy(): void {
    this.sections = [...document.querySelectorAll<HTMLElement>('[data-spy]')];
    this.observer = new IntersectionObserver(() => this.syncActive(), {
      rootMargin: `0px 0px -${Math.round((1 - SPY_ANCHOR) * 100)}% 0px`,
      threshold: 0,
    });
    this.sections.forEach((sec) => this.observer?.observe(sec));
  }

  /** 全量重算 */
  private syncActive(): void {
    if (!this.sections.length) return;
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      this.setActive(this.sections[this.sections.length - 1].id);
      return;
    }
    const anchor = window.innerHeight * SPY_ANCHOR;
    let best = this.sections[0].id;
    for (const sec of this.sections) {
      if (sec.getBoundingClientRect().top > anchor) break;
      best = sec.id;
    }
    this.setActive(best);
  }

  private setActive(id: string): void {
    if (id === this.lastActive) return;
    this.lastActive = id;

    this.querySelectorAll<HTMLElement>('.sidebar-cat-link').forEach((link) => {
      const match = link.closest<HTMLElement>('.sidebar-group')?.dataset.cat === id;
      link.classList.toggle('active', match);
      if (match) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });

    const group = this.querySelector<HTMLElement>(`.sidebar-group[data-cat="${id}"]`);
    if (group) {
      this.setGroupOpen(group, true);
      group.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() });
    }
  }

  // ── 桌面端图标条（折叠/展开） ──

  private isCollapsed(): boolean {
    return !!this.aside?.classList.contains('is-collapsed') && window.innerWidth >= BREAKPOINT_LG;
  }

  private toggleRail(): void {
    this.aside?.classList.toggle('is-collapsed');
    storageSet(RAIL_KEY, this.aside?.classList.contains('is-collapsed') ? 'collapsed' : 'expanded');
    this.syncToggleState();
    this.flyout.close(false);
  }

  private syncToggleState(): void {
    const collapsed = this.aside?.classList.contains('is-collapsed') ?? true;
    document.querySelectorAll<HTMLElement>('[data-sidebar-toggle]').forEach((btn) => {
      btn.setAttribute('aria-expanded', String(!collapsed));
      btn.setAttribute('aria-label', collapsed ? '展开侧边栏' : '收起侧边栏');
    });
  }

  private jumpToCategory(group: HTMLElement): void {
    this.flyout.close(false);
    this.focusCategory(group.dataset.cat, '');
  }

  /** 滚到分类块并切 tab；侧栏分类项（filter 空）与子链接共用 */
  private focusCategory(cat: string | undefined, filter: string): void {
    if (!cat) return;
    const section = document.querySelector<HTMLElement>(`[data-cat-block="${cat}"]`);
    if (!section) {
      // 内容页无分类区块：回首页锚点，页内也没有则静默
      if (!document.querySelector('[data-cat-block]')) window.location.href = `/#${cat}`;
      return;
    }
    section.querySelector<NavCatTabs>('nav-cat-tabs')?.activate(filter);
    section.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    this.setActive(cat);
  }

  // ── 收起态浮层 ──

  private initFlyout(): void {
    this.flyout.mount();
    this.addEventListener('pointerover', this.flyout.onPointerOver);
    this.addEventListener('pointerout', this.flyout.onPointerOut);
    this.addEventListener('focusin', this.flyout.onFocusIn);
    this.addEventListener('focusout', this.flyout.onFocusOut);
    this.addEventListener('keydown', this.flyout.onKeydown);
    this.addEventListener('click', this.flyout.onItemClick);
  }

  // ── 移动端抽屉 ──

  private initDrawer(): void {
    document.addEventListener('click', this.onDocClick);
    document.addEventListener('keydown', this.onDocKeydown);
    this.mqLg = window.matchMedia(`(min-width: ${BREAKPOINT_LG}px)`);
    this.mqLg.addEventListener('change', this.onMqLgChange);

    this.backdrop?.addEventListener('click', this.onBackdropClick);

    this.addEventListener('click', this.onSubLinkClick);
  }

  private openDrawer(): void {
    this.aside?.classList.remove('-translate-x-full');
    this.aside?.classList.add('translate-x-0');
    if (this.backdrop) this.backdrop.hidden = false;
    lockScroll();
    this.setOpenerExpanded(true);
  }

  private closeDrawer(): void {
    const wasOpen = this.drawerOpen();
    this.aside?.classList.remove('translate-x-0');
    this.aside?.classList.add('-translate-x-full');
    if (this.backdrop) this.backdrop.hidden = true;
    unlockScroll();
    this.setOpenerExpanded(false);
    // 仅从打开态关闭时归还焦点
    if (wasOpen) this.mobileOpener?.focus({ preventScroll: true });
  }

  private setOpenerExpanded(expanded: boolean): void {
    document.querySelectorAll('[data-mobile-nav-open]').forEach((btn) => {
      btn.setAttribute('aria-expanded', String(expanded));
    });
  }
}

customElements.define('nav-sidebar', NavSidebar);
