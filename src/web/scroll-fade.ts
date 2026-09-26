/** 横向滚动容器端缘渐隐 */
const EDGE = 1;

export function updateScrollFade(el: HTMLElement): void {
  const max = el.scrollWidth - el.clientWidth;
  if (max <= EDGE) {
    el.dataset.fadeX = 'none';
    return;
  }
  const atStart = el.scrollLeft <= EDGE;
  const atEnd = el.scrollLeft >= max - EDGE;
  el.dataset.fadeX = atStart && atEnd ? 'none' : atStart ? 'end' : atEnd ? 'start' : 'both';
}

/** 挂载滚动/尺寸监听并同步初始态，返回卸载函数 */
export function watchScrollFade(el: HTMLElement): () => void {
  let raf = 0;
  const queue = (): void => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => updateScrollFade(el));
  };
  el.addEventListener('scroll', queue, { passive: true });
  const ro = new ResizeObserver(queue);
  ro.observe(el);
  updateScrollFade(el);
  return () => {
    cancelAnimationFrame(raf);
    el.removeEventListener('scroll', queue);
    ro.disconnect();
  };
}
