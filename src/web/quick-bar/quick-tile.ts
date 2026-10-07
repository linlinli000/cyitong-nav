/** 常用磁贴完整结构（容器 > 链接）：SSG(SearchPanel) 与客户端(quick-bar.ts) 共用此函数，改结构只改这里；管理操作统一走右键/长按菜单 */
import { escapeHtml } from '../html-escape';
import { iconEl } from '../icons';
import type { QuickSite } from './quick-store';
import { siteIconHtml } from '../site-icon';

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
        ${siteIconHtml(item.icon, item.title, 'h-10 w-10 rounded-xl object-cover', { alt: '', size: 40 })}
        <span class="max-w-20 truncate">${escapeHtml(item.title)}</span>
      </a>
      ${opts.pinned ? `<span class="quick-pin-flag" aria-hidden="true">${iconEl('pin', 'h-2.5 w-2.5')}</span>` : ''}
    </div>`;
}

/** 行尾常驻的"添加快捷方式"格（双端常显，不靠 hover）；加号套 40px 容器盒与其他磁贴图标对齐 */
export function quickAddHtml(): string {
  return `
    <button type="button" data-quick-add class="quick-tile add-tile" aria-label="添加快捷方式" title="添加快捷方式">
      <span class="grid h-10 w-10 place-items-center rounded-xl bg-surface">${iconEl('plus', 'h-5 w-5')}</span>
      <span class="max-w-20 truncate">添加</span>
    </button>`;
}
