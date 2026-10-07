/** <nav-tools>：移动端工具箱抽屉，顶栏按钮开、遮罩/Esc 关 */
import { lockScroll, unlockScroll } from '../scroll-lock';

class NavTools extends HTMLElement {
  private dlg: HTMLDialogElement | null = null;
  private opener: HTMLElement | null = null;

  private onDocClick = (e: MouseEvent): void => {
    const btn = (e.target as Element).closest<HTMLElement>('[data-role="tools-open"]');
    if (!btn) return;
    this.opener = btn;
    this.open();
  };

  private onCancel = (e: Event): void => {
    // 拦截原生立即关闭，改走退出动画
    e.preventDefault();
    this.requestClose();
  };

  private onDlgClick = (e: MouseEvent): void => {
    if (e.target === this.dlg) this.requestClose();
  };

  private onAnimationEnd = (e: AnimationEvent): void => {
    // ::backdrop 的动画事件也会以 dialog 为 target，用 pseudoElement 排除
    if (e.target !== this.dlg || e.pseudoElement !== '') return;
    if (!this.dlg?.classList.contains('closing')) return;
    this.dlg.classList.remove('closing');
    this.dlg.close();
  };

  private onClose = (): void => {
    unlockScroll();
    this.syncExpanded(false);
    // 焦点归还触发按钮
    this.opener?.focus({ preventScroll: true });
  };

  connectedCallback(): void {
    this.dlg = this.querySelector<HTMLDialogElement>('dialog');
    document.addEventListener('click', this.onDocClick);
    this.dlg?.addEventListener('cancel', this.onCancel);
    this.dlg?.addEventListener('click', this.onDlgClick);
    this.dlg?.addEventListener('animationend', this.onAnimationEnd);
    this.dlg?.addEventListener('close', this.onClose);
  }

  disconnectedCallback(): void {
    document.removeEventListener('click', this.onDocClick);
    this.dlg?.removeEventListener('cancel', this.onCancel);
    this.dlg?.removeEventListener('click', this.onDlgClick);
    this.dlg?.removeEventListener('animationend', this.onAnimationEnd);
    this.dlg?.removeEventListener('close', this.onClose);
    if (this.dlg?.open) unlockScroll();
  }

  private open(): void {
    const dlg = this.dlg;
    if (!dlg || dlg.open) return;
    dlg.showModal();
    // 初始焦点落 dialog 自身（tabindex="-1"），避免首条目焦点环
    dlg.focus({ preventScroll: true });
    this.syncExpanded(true);
    lockScroll();
  }

  private syncExpanded(expanded: boolean): void {
    document.querySelectorAll('[data-role="tools-open"]').forEach((btn) => {
      btn.setAttribute('aria-expanded', String(expanded));
    });
  }

  /** <dialog> 的 close() 是瞬间移除：加 .closing 播完退出动画，animationend 再真正 close */
  private requestClose(): void {
    const dlg = this.dlg;
    if (!dlg || !dlg.open || dlg.classList.contains('closing')) return;
    dlg.classList.add('closing');
  }
}

customElements.define('nav-tools', NavTools);
