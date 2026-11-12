/**
 * <nav-tools>：移动端工具箱抽屉。与侧栏同用普通 div + 遮罩，
 * 不用 <dialog>（其 ::backdrop 走 top layer，会盖住另一抽屉）。
 */
import { lockScroll, unlockScroll } from '../scroll-lock';
import { announceOverlayOpen, isDialogEsc, onOverlayOpen } from '../overlay';

class NavTools extends HTMLElement {
  private panel: HTMLElement | null = null;
  private backdrop: HTMLElement | null = null;
  private opener: HTMLElement | null = null;

  private isOpen(): boolean {
    return this.panel ? !this.panel.hidden : false;
  }

  private onDocClick = (e: MouseEvent): void => {
    const btn = (e.target as Element).closest<HTMLElement>('[data-role="tools-open"]');
    if (!btn) return;
    this.opener = btn;
    // 同一个按钮兼作关闭（此时图标已是 ×）
    if (this.isOpen()) this.requestClose();
    else this.open();
  };

  private onPanelClick = (e: MouseEvent): void => {
    if (e.target === this.panel) this.requestClose();
  };

  private onBackdropClick = (): void => this.requestClose();

  private onDocKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape' || !this.isOpen()) return;
    if (isDialogEsc(e)) return;
    e.preventDefault();
    this.requestClose();
  };

  private onAnimationEnd = (e: AnimationEvent): void => {
    if (e.target !== this.panel) return;
    if (!this.panel?.classList.contains('closing')) return;
    this.panel.classList.remove('closing');
    this.panel.hidden = true;
    if (this.backdrop) this.backdrop.hidden = true;
    unlockScroll();
    this.syncExpanded(false);
    this.opener?.focus({ preventScroll: true });
  };

  /** 互斥让位订阅：其他浮层打开时立即收起，不等退出动画 */
  private unyield: (() => void) | null = null;

  /** 互斥场景立即关闭：不等退出动画，立刻让出层级 */
  private closeImmediately(): void {
    const panel = this.panel;
    if (!panel || panel.hidden) return;
    panel.classList.remove('closing');
    panel.hidden = true;
    if (this.backdrop) this.backdrop.hidden = true;
    unlockScroll();
    this.syncExpanded(false);
  }

  connectedCallback(): void {
    this.panel = this.querySelector<HTMLElement>('[data-role="tools-panel"]');
    this.backdrop = this.querySelector<HTMLElement>('[data-tools-backdrop]');
    document.addEventListener('click', this.onDocClick);
    document.addEventListener('keydown', this.onDocKeydown);
    this.unyield = onOverlayOpen('tools', () => this.closeImmediately());
    this.backdrop?.addEventListener('click', this.onBackdropClick);
    this.panel?.addEventListener('click', this.onPanelClick);
    this.panel?.addEventListener('animationend', this.onAnimationEnd);
  }

  disconnectedCallback(): void {
    document.removeEventListener('click', this.onDocClick);
    document.removeEventListener('keydown', this.onDocKeydown);
    this.unyield?.();
    this.backdrop?.removeEventListener('click', this.onBackdropClick);
    this.panel?.removeEventListener('click', this.onPanelClick);
    this.panel?.removeEventListener('animationend', this.onAnimationEnd);
    if (this.isOpen()) unlockScroll();
  }

  private open(): void {
    const panel = this.panel;
    if (!panel || !panel.hidden) return;
    // 先广播，让已打开的左侧侧栏 / 历史面板收起
    announceOverlayOpen('tools');
    panel.classList.remove('closing');
    panel.hidden = false;
    if (this.backdrop) this.backdrop.hidden = false;
    // 焦点落面板自身（tabindex="-1"），避免首条目焦点环
    panel.focus({ preventScroll: true });
    this.syncExpanded(true);
    lockScroll();
  }

  private syncExpanded(expanded: boolean): void {
    document.querySelectorAll('[data-role="tools-open"]').forEach((btn) => {
      btn.setAttribute('aria-expanded', String(expanded));
    });
  }

  /** 加 .closing 播完退出动画，animationend 再真正隐藏 */
  private requestClose(): void {
    const panel = this.panel;
    if (!panel || panel.hidden || panel.classList.contains('closing')) return;
    panel.classList.add('closing');
    // 立即隐藏自定义遮罩（不等动画），避免遮罩盖住正在打开的另一抽屉
    if (this.backdrop) this.backdrop.hidden = true;
  }
}

customElements.define('nav-tools', NavTools);
