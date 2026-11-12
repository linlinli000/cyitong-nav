/** 磁贴完整结构（容器 > 链接）：SSG 与客户端共用，改结构只改这里 */
import { escapeHtml } from '../shared/html-escape';
import { iconEl } from '../shared/icons';
import type { QuickSite } from './quick-store';
import { siteIconHtml } from '../shared/site-icon';

interface QuickTileOpts {
  /** 已固定：磁贴右上角显示纯指示图钉（不可点，操作走右键/长按菜单） */
  pinned?: boolean;
  /** SSG 默认集标记：首帧由 quick-bar 读出数据后缓存 */
  isDefault?: boolean;
}

export function quickTileHtml(item: QuickSite, opts: QuickTileOpts = {}): string {
  return `
    <div class="quick-tile-wrap">
      <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer"
        data-title="${escapeHtml(item.title)}" data-icon="${escapeHtml(item.icon)}"${opts.isDefault ? ' data-quick-default' : ''}
        title="${escapeHtml(item.title)}" aria-haspopup="menu" class="quick-tile">
        ${siteIconHtml(item.icon, item.title, 'quick-tile-icon', { alt: '', size: 22 })}
        <span>${escapeHtml(item.title)}</span>
      </a>
      ${opts.pinned ? `<span class="quick-pin-flag" aria-hidden="true">${iconEl('pin', 'h-2.5 w-2.5')}</span>` : ''}
    </div>`;
}

/** 行尾常驻的"添加快捷方式"格：与胶囊磁贴同高（36px），加号套 22px 盒与图标对齐 */
export function quickAddHtml(): string {
  return `
    <button type="button" data-quick-add class="add-tile" aria-label="添加快捷方式" title="添加快捷方式">
      <span class="add-tile-icon">${iconEl('plus', 'h-4 w-4')}</span>
      <span>添加</span>
    </button>`;
}
