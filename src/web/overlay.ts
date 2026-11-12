/** 浮层公共契约：互斥广播与 Esc 归属（modal dialog 的 Esc 由浏览器消费，非模态不得连带关闭） */

const OPEN_EVENT = 'nav-overlay-open';

/** 打开任何浮层前广播：其余已开浮层让位（抽屉互斥、历史面板让位、modal 盖抽屉） */
export function announceOverlayOpen(name: string): void {
  document.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: name }));
}

/** 订阅互斥广播；detail 非自身时调用 yieldClose。返回退订函数 */
export function onOverlayOpen(name: string, yieldClose: () => void): () => void {
  const fn = (e: Event): void => {
    if ((e as CustomEvent<string>).detail !== name) yieldClose();
  };
  document.addEventListener(OPEN_EVENT, fn);
  return () => document.removeEventListener(OPEN_EVENT, fn);
}

export function isDialogEsc(e: KeyboardEvent): boolean {
  return !!(e.target as Element).closest?.('dialog[open]');
}