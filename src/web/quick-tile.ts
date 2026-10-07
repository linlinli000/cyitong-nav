/** 常用磁贴的内部结构（图标+文案）：SSG(SearchPanel) 与客户端(nav-hero) 共用，改结构只改这里 */
import { escapeHtml } from './html-escape';
import { siteIconHtml } from './site-icon';

export function quickTileInner(title: string, icon: string): string {
  return `
    ${siteIconHtml(icon, title, 'h-10 w-10 rounded-xl object-cover', { alt: '', size: 40 })}
    <span class="max-w-20 truncate">${escapeHtml(title)}</span>`;
}
