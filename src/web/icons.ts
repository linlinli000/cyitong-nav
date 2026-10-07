/** 运行期图标：字形来自 Layout 构建期注入的 symbol sprite，组件只写 <use href> */
export const RUNTIME_ICON_NAMES = ['search', 'history', 'x', 'logo'] as const;

/** 仅 SSR 静态引用的图标（顶栏/投稿页 GitHub、about 页浏览器卡片），同样进 sprite */
export const STATIC_ICON_NAMES = ['github', 'googlechrome', 'microsoftedge'] as const;

export function iconEl(name: string, cls: string, extra = ''): string {
  return `<svg class="${cls}" aria-hidden="true"${extra}><use href="#icon-${name}"/></svg>`;
}
