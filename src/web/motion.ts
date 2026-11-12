/** 尊重「减少动态效果」：JS 侧平滑滚动统一走这里（配合 base.css） */
export function scrollBehavior(): 'smooth' | 'auto' {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}
