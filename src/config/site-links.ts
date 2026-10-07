/** 站点级导航链接与品牌回链：页脚/侧栏/顶栏共用，路径与文案改一处即可 */
export const SITE_LINKS = [
  { href: '/about/', label: '关于本站', icon: 'lucide:info' },
  { href: '/contribute/', label: '投稿与反馈', icon: 'lucide:messages-square' },
] as const;

/** 品牌链接目标：首页锚到页顶，内容页回首页 */
export function brandHref(isHome: boolean): string {
  return isHome ? '#top' : '/';
}
