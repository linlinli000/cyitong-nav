/** 尊重系统「减少动态效果」：JS 侧平滑滚动统一走这里，与 global.css 的 media query 配套 */
export function scrollBehavior(): 'smooth' | 'auto' {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}
