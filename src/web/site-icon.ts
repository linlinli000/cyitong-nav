/** 站点图标 img：data-letter 由 img-fallback 在加载失败时换首字母色块（SSG 与客户端共用） */
import { escapeHtml } from './html-escape';
import { firstLetter } from './first-letter';

export interface SiteIconOpts {
  /** 装饰性图标传空串，默认用标题 */
  alt?: string;
  /** 固定宽高 px；动态插入、靠样式定尺寸的可不传 */
  size?: number;
}

export function siteIconHtml(icon: string, title: string, cls: string, opts: SiteIconOpts = {}): string {
  const { alt = title, size } = opts;
  const dim = size ? ` width="${size}" height="${size}"` : '';
  return `<img src="${escapeHtml(icon)}" alt="${escapeHtml(alt)}"${dim} loading="lazy" decoding="async" data-letter="${escapeHtml(firstLetter(title))}" class="${cls}">`;
}
