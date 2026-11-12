/** 顶栏「搜索历史」面板：tab 切换 4 类 scope，默认显示引擎搜索历史 */
import {
  ENGINES,
  SCOPE_TABS,
  engineUrlFor,
  type SearchScope,
} from '../config/search-engines';
import { escapeHtml } from './shared/html-escape';
import { storageGetJson, storageSetJson } from './storage';

const historyKey = (s: SearchScope): string => `nav:history:${s}`;
const engineKey = (s: SearchScope): string => `nav:engine:${s}`;
const modeKey = (s: SearchScope, e: number): string => `nav:mode:${s}:${e}`;

/** tab 顺序：引擎搜索置顶（默认页），其余按使用场景排列 */
export const HISTORY_TABS: SearchScope[] = ['search', 'site', 'community', 'literature'];
export const DEFAULT_HISTORY_TAB: SearchScope = 'search';

const LABEL = Object.fromEntries(SCOPE_TABS.map((t) => [t.id, t.label])) as Record<
  SearchScope,
  string
>;

const readHistory = (s: SearchScope): string[] => {
  const h = storageGetJson<string[]>(historyKey(s), []);
  return Array.isArray(h)
    ? h.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    : [];
};

/** 渲染 tab 条 + 当前分类列表 */
export function renderHistoryPanel(body: HTMLElement, active: SearchScope): void {
  const items = readHistory(active);
  const tabs = HISTORY_TABS.map((s) => {
    const n = readHistory(s).length;
    return `<button type="button" role="tab" aria-selected="${s === active}"
      class="history-tab${s === active ? ' active' : ''}" data-history-tab="${s}">
      ${escapeHtml(LABEL[s])}${n > 0 ? `<span class="count-badge">${n}</span>` : ''}
    </button>`;
  }).join('');

  body.innerHTML = `
    <div class="history-tabs" role="tablist" aria-label="搜索类型">${tabs}</div>
    <div class="history-pane" role="tabpanel" aria-label="${escapeHtml(LABEL[active])}">
      ${
        items.length
          ? items
              .map(
                (q) => `<button type="button" class="history-item" data-scope="${active}" data-q="${escapeHtml(q)}">
                  <svg class="h-3.5 w-3.5 shrink-0" aria-hidden="true"><use href="#icon-history"/></svg>
                  <span>${escapeHtml(q)}</span>
                </button>`,
              )
              .join('')
          : '<p class="history-empty">该分类还没有搜索记录</p>'
      }
    </div>`;
}

/** 回放一条历史：站内搜索交给首页 nav-search，其余走该 scope 上次使用的引擎与类型 */
export function replaySearch(scope: SearchScope, q: string): void {
  if (scope === 'site') {
    const input = document.querySelector<HTMLInputElement>('nav-search [data-role="input"]');
    if (input) {
      input.value = q;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus({ preventScroll: true });
      return;
    }
    // 内容页没有搜索框：带 ?q= 回首页，nav-search 会预填并展开结果
    location.href = `/?q=${encodeURIComponent(q)}`;
    return;
  }

  const engines = ENGINES[scope];
  const rawIdx = storageGetJson<number>(engineKey(scope), 0);
  const idx = typeof rawIdx === 'number' && rawIdx >= 0 && rawIdx < engines.length ? rawIdx : 0;
  const engine = engines[idx];
  const rawMode = storageGetJson<number>(modeKey(scope, idx), 0);
  const modeLen = engine.modes?.length ?? 0;
  const modeIdx = typeof rawMode === 'number' && rawMode >= 0 && rawMode < modeLen ? rawMode : 0;
  window.open(engineUrlFor(engine, modeIdx, q), '_blank', 'noopener');
}

export function clearScope(scope: SearchScope): void {
  storageSetJson(historyKey(scope), []);
}

export function clearAll(): void {
  SCOPE_TABS.forEach((t) => storageSetJson(historyKey(t.id), []));
}
