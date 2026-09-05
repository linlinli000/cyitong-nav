/**
 * 运行期图标：字形来自 Layout 构建期注入的 symbol sprite（lucide 为主，
 * 引擎 chip 用 simple-icons 品牌字形），组件只写 `<use href>`，不存 path。
 */

/** 运行期用到的 lucide 图标语义名（sprite 生成与 <use> 引用共用此单一清单） */
export const RUNTIME_ICON_NAMES = ['search', 'history', 'x', 'chevron-up', 'sun', 'moon'] as const;

/** 组装一个引用 sprite 符号的 <svg>。尺寸/显隐类在调用侧给；sun/moon 的 data-icon 走 extra 传入 */
export function iconEl(name: string, cls: string, extra = ''): string {
  return `<svg class="${cls}" aria-hidden="true"${extra}><use href="#icon-${name}"/></svg>`;
}
