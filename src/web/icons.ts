/** 运行期图标：字形来自 Layout 构建期注入的 symbol sprite，组件只写 <use href> */
export const RUNTIME_ICON_NAMES = ['search', 'history', 'x', 'chevron-up', 'sun', 'moon'] as const;

export function iconEl(name: string, cls: string, extra = ''): string {
  return `<svg class="${cls}" aria-hidden="true"${extra}><use href="#icon-${name}"/></svg>`;
}
