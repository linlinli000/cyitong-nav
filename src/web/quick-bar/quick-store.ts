/** 常用磁贴存储：pinned（手动固定/添加，顺序即存储顺序）、hidden（移除后不再自动出现）与最近使用记账；URL 一律存浏览器规范化形态（a.href） */
import { storageGetJson, storageSetJson } from '../storage';

export interface QuickSite {
  url: string;
  title: string;
  icon: string;
}

export const QUICK_PINNED_KEY = 'nav:pinned-sites';
export const QUICK_HIDDEN_KEY = 'nav:hidden-sites';
export const RECENT_KEY = 'nav:recent-sites';
/** 与磁贴行展示上限一致：pin 满即拒绝新增，不做顶替 */
export const MAX_PINS = 8;
/** 最近使用存储上限（展示上限在 quick-bar.ts） */
export const MAX_STORE = 20;
/** 打开"添加快捷方式"对话框（quick-bar 派发、nav-quick-add 监听），detail 携带 opener 供关后还焦 */
export const QUICK_ADD_OPEN_EVENT = 'nav-quick-add:open';
/** pinned/hidden 变更后派发，quick-bar 监听重渲染 */
export const QUICK_STORE_CHANGED_EVENT = 'quick-store-changed';

/** URL 须为 http(s)：localStorage 条目清洗与用户输入校验共用此判定 */
export function isHttpUrl(url: string): boolean {
  try {
    return /^https?:$/.test(new URL(url).protocol);
  } catch {
    return false;
  }
}

/** 读取并清洗：缺字段、非 http(s) 协议的条目整条丢弃 */
export function loadPins(): QuickSite[] {
  const raw = storageGetJson<QuickSite[]>(QUICK_PINNED_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (r): r is QuickSite =>
      !!r &&
      typeof r.url === 'string' &&
      isHttpUrl(r.url) &&
      typeof r.title === 'string' &&
      !!r.title &&
      typeof r.icon === 'string',
  );
}

/** pinned 可能含 dataURL 图标（体积大），写失败必须让调用方可见，不能静默 */
export function savePins(items: QuickSite[]): boolean {
  try {
    localStorage.setItem(QUICK_PINNED_KEY, JSON.stringify(items.slice(0, MAX_PINS)));
    return true;
  } catch {
    return false;
  }
}

export function loadHidden(): Set<string> {
  const raw = storageGetJson<string[]>(QUICK_HIDDEN_KEY, []);
  return new Set(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []);
}

export function saveHidden(urls: Set<string>): void {
  storageSetJson(QUICK_HIDDEN_KEY, [...urls]);
}

/** 最近使用：记账来源 LinkCard/搜索结果/磁贴（统一 a[data-title]），仅要求字段齐全，协议由记账侧过滤 */
export function loadRecents(): QuickSite[] {
  return storageGetJson<QuickSite[]>(RECENT_KEY, []).filter(
    (r): r is QuickSite => Boolean(r && r.url && r.title && r.icon),
  );
}

/** 输入补全 https:// 后校验；非法或非 http(s) 返回空串 */
export function normalizeUrl(raw: string): string {
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  return isHttpUrl(candidate) ? new URL(candidate).href : '';
}
