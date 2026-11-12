/** 站点图标 img（SSG 与客户端共用） */
import { escapeHtml } from './html-escape';

/** 图标缺失时色块显示的字，空标题给中性点号 */
function firstLetter(title: string): string {
  return title.trim().charAt(0) || '·';
}

export interface SiteIconOpts {
  /** 装饰性图标传空串，默认用标题 */
  alt?: string;
  /** 固定宽高 px；动态插入、靠样式定尺寸的可不传 */
  size?: number;
}

export function siteIconHtml(icon: string, title: string, cls: string, opts: SiteIconOpts = {}): string {
  const { alt = title, size } = opts;
  const dim = size ? ` width="${size}" height="${size}"` : '';
  return `<img src="${escapeHtml(icon)}" alt="${escapeHtml(alt)}"${dim} loading="lazy" decoding="async" referrerpolicy="no-referrer" data-letter="${escapeHtml(firstLetter(title))}" class="${cls}">`;
}
