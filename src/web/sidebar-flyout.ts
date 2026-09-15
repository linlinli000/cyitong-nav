/** 侧栏收起态的浮出容器：子链接面板与底部链接迷你提示共用 */
import { CloseGate } from './close-gate';

const FLYOUT_PAD = 8;
const CLOSE_DELAY_MS = 150;

/** 浮层锚点：分类组或底部链接 */
function anchorOf(target: Element): HTMLElement | null {
  return target.closest<HTMLElement>('.sidebar-group, .sidebar-footer-link');
}

export class SidebarFlyout {
  private el: HTMLDivElement | null = null;
  private trigger: HTMLElement | null = null;
  private gate = new CloseGate(CLOSE_DELAY_MS, () => this.close(false));
  private suppressFocusOpen = false;

  constructor(
    private readonly host: HTMLElement,
    private readonly canOpen: () => boolean,
  ) {}

  // ── 生命周期 ──

  mount(): void {
    if (this.el) return;

    const el = document.createElement('div');
    el.className = 'sidebar-flyout';
    el.addEventListener('pointerenter', this.onSelfEnter);
    el.addEventListener('pointerleave', this.onSelfLeave);
    el.addEventListener('click', this.onSelfClick);
    el.addEventListener('keydown', this.onSelfKeydown);
    el.addEventListener('focusout', this.onSelfFocusOut);
    this.host.append(el);
    this.el = el;

    document.addEventListener('scroll', this.onDocScroll, true);
    document.addEventListener('click', this.onDocClickCapture, true);
  }

  destroy(): void {
    this.gate.cancel();
    document.removeEventListener('scroll', this.onDocScroll, true);
    document.removeEventListener('click', this.onDocClickCapture, true);
    this.el?.remove();
    this.el = null;
    this.trigger = null;
  }

  isOpen(): boolean {
    return !!this.el?.classList.contains('open');
  }

  // ── 宿主委托的事件 ──

  onPointerOver = (e: PointerEvent): void => {
    if (!this.canOpen()) return;
    this.openFor(e.target as Element, false);
  };

  onPointerOut = (e: PointerEvent): void => {
    const item = anchorOf(e.target as Element);
    if (!item) return;
    const rel = e.relatedTarget as Node | null;
    if (rel && (item.contains(rel) || this.el?.contains(rel))) return;
    this.gate.schedule();
  };

  onFocusIn = (e: FocusEvent): void => {
    if (!this.canOpen() || this.suppressFocusOpen) return;
    this.openFor(e.target as Element, false);
  };

  onFocusOut = (e: FocusEvent): void => {
    const item = anchorOf(e.target as Element);
    if (!item) return;
    const rel = e.relatedTarget as Node | null;
    if (!rel || (!item.contains(rel) && !this.el?.contains(rel))) this.close(false);
  };

  onKeydown = (e: KeyboardEvent): void => {
    if (!this.canOpen()) return;
    const toggle = (e.target as Element).closest<HTMLElement>('.sidebar-cat-toggle');
    if (!toggle) return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const group = toggle.closest<HTMLElement>('.sidebar-group');
      if (group) this.openGroup(group, true);
    } else if (e.key === 'ArrowLeft' && this.isOpen()) {
      e.preventDefault();
      this.close(true);
    }
  };

  onItemClick = (e: MouseEvent): void => {
    if ((e.target as Element).closest('.sidebar-footer-link')) this.close(false);
  };

  // ── 浮层自身的事件 ──

  private onSelfEnter = (): void => this.gate.cancel();
  private onSelfLeave = (): void => this.gate.schedule();

  private onSelfClick = (e: MouseEvent): void => {
    if ((e.target as Element).closest('a.sub-link')) this.close(false);
  };

  private onSelfFocusOut = (e: FocusEvent): void => {
    const rel = e.relatedTarget as Node | null;
    if (!rel || !this.el?.contains(rel)) this.close(false);
  };

  private onSelfKeydown = (e: KeyboardEvent): void => {
    const isDown = e.key === 'ArrowDown';
    const isUp = e.key === 'ArrowUp';
    if (!isDown && !isUp && e.key !== 'Escape') return;

    if (isDown || isUp) {
      e.preventDefault();
      const links = Array.from(this.el?.querySelectorAll<HTMLAnchorElement>('a.sub-link') ?? []);
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
    this.close(true);
  };

  private onDocScroll = (): void => this.close(false);

  private onDocClickCapture = (e: MouseEvent): void => {
    if (!this.isOpen()) return;
    const t = e.target as Element;
    if (!this.el?.contains(t) && !t.closest('.sidebar-cat-toggle')) this.close(false);
  };

  // ── 打开/关闭 ──

  private openFor(target: Element, moveFocus: boolean): void {
    const group = target.closest<HTMLElement>('.sidebar-group');
    if (group) {
      if (!this.shownFor(group)) this.openGroup(group, moveFocus);
      return;
    }
    const link = target.closest<HTMLElement>('.sidebar-footer-link');
    if (link && !this.shownFor(link)) this.openTip(link);
  }

  /** 组内指针移动会反复触发 pointerover，避免重复重建浮层 DOM */
  private shownFor(item: HTMLElement): boolean {
    if (!this.isOpen()) return false;
    const trigger = item.classList.contains('sidebar-group')
      ? item.querySelector<HTMLElement>('.sidebar-cat-toggle')
      : item;
    return this.trigger === trigger;
  }

  private openGroup(group: HTMLElement, moveFocus: boolean): void {
    if (!this.canOpen() || !this.el) return;
    this.gate.cancel();

    const sub = group.querySelector<HTMLElement>('.sidebar-sub');
    if (!sub) return;

    const title = document.createElement('div');
    title.className = 'sidebar-flyout-title';
    title.textContent = group.querySelector('.sidebar-cat-name')?.textContent ?? '';

    this.el.classList.remove('sidebar-tip');
    this.el.replaceChildren(title, sub.cloneNode(true));
    this.trigger = group.querySelector<HTMLElement>('.sidebar-cat-toggle');
    this.layout(group, false);

    if (moveFocus) this.moveFocusTo(this.el.querySelector<HTMLElement>('a.sub-link'));
  }

  private openTip(link: HTMLElement): void {
    if (!this.canOpen() || !this.el) return;
    this.gate.cancel();

    const label = document.createElement('span');
    label.className = 'sidebar-tip-text';
    label.textContent = link.querySelector('.sidebar-footer-label')?.textContent?.trim() ?? '';
    if (!label.textContent) return;

    this.el.classList.add('sidebar-tip');
    this.el.replaceChildren(label);
    this.trigger = link;
    this.layout(link, true);
  }

  close(returnFocus: boolean): void {
    this.gate.cancel();
    if (!this.isOpen()) return;
    this.el!.classList.remove('open');
    if (returnFocus) this.moveFocusTo(this.trigger);
  }

  /** focus() 会触发 focusin 重开浮层，移焦点时临时挂起 */
  private moveFocusTo(target: HTMLElement | null): void {
    this.suppressFocusOpen = true;
    target?.focus();
    window.setTimeout(() => {
      this.suppressFocusOpen = false;
    }, 0);
  }

  private layout(anchor: HTMLElement, centerVertical: boolean): void {
    if (!this.el) return;
    const r = anchor.getBoundingClientRect();
    this.el.classList.add('open');
    const fw = this.el.offsetWidth;
    const fh = this.el.offsetHeight;
    const maxTop = Math.max(FLYOUT_PAD, window.innerHeight - fh - FLYOUT_PAD);
    this.el.style.left = `${Math.max(FLYOUT_PAD, Math.min(r.right + FLYOUT_PAD, window.innerWidth - fw - FLYOUT_PAD))}px`;
    const top = centerVertical ? r.top + r.height / 2 - fh / 2 : r.top;
    this.el.style.top = `${Math.min(maxTop, Math.max(FLYOUT_PAD, top))}px`;
  }
}
