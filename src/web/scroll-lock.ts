/** body 滚动锁（引用计数）：多个浮层同开时，先关的不得释放后开的锁 */

let locks = 0;

export function lockScroll(): void {
  locks++;
  document.body.classList.add('overflow-hidden');
}

export function unlockScroll(): void {
  if (locks > 0 && --locks === 0) document.body.classList.remove('overflow-hidden');
}
