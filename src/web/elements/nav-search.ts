/** <nav-search>：站内/引擎搜索、历史、键盘导航。 */
import { ENGINES, SCOPE_TABS, engineUrl, placeholderFor, type SearchScope } from '../../data/search-engines';
import { queryTokens, searchSites, type SiteRecord } from '../search-utils';
import { NAV_OPEN_CARD_EVENT, toCardData, toCardDataHtml } from '../card-attrs';
import { escapeHtml as escapeAttr } from '../html-escape';
import { iconEl } from '../icons';
import { firstLetter } from '../img-fallback';
import { storageGetJson, storageSetJson } from '../storage';

const SCOPE_KEY = 'nav:scope';
const MAX_HISTORY = 10;
const historyKey = (scope: SearchScope): string => `nav:history:${scope}`;

function loadScope(): SearchScope {
  const s = storageGetJson<string>(SCOPE_KEY, 'search');
  return SCOPE_TABS.some((t) => t.id === s) ? (s as SearchScope) : 'search';
}

/** 命中词高亮 */
function markHit(text: string, tokens: string[]): string {
  if (!text) return '';
  const esc = escapeAttr(text);
  if (tokens.length === 0) return esc;
  const re = new RegExp(
    tokens.filter(Boolean).map((tk) => tk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
    'gi',
  );
  return esc.replace(re, (m) => `<mark class="search-hit">${m}</mark>`);
}

class NavSearch extends HTMLElement {
  private scope: SearchScope = loadScope();
  private engineIdx = 0;
  private query = '';
  private records: SiteRecord[] = [];
  private results: SiteRecord[] = [];
  private tokens: string[] = [];
  private history: string[] = [];
  private cursor = -1;

  private input: HTMLInputElement | null = null;
  private dropdown: HTMLElement | null = null;

  private handleGlobalKey = (e: KeyboardEvent): void => {
    const tag = (e.target as HTMLElement).tagName;
    if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      this.input?.focus();
    }
  };

  private handleDocClick = (e: MouseEvent): void => {
    if (this.contains(e.target as Node)) return;
    this.hideDropdown();
  };

  connectedCallback(): void {
    this.records = this.readIndex();
    this.engineIdx = this.loadEngineIdx(this.scope);
    this.history = this.loadHistory(this.scope);
    this.cacheRefs();
    this.applyScopeState();

    this.addEventListener('input', this.onInput);
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('click', this.onClick);
    this.addEventListener('keydown', this.onKeydown);
    document.addEventListener('keydown', this.handleGlobalKey);
    document.addEventListener('click', this.handleDocClick);
  }

  disconnectedCallback(): void {
    document.removeEventListener('keydown', this.handleGlobalKey);
    document.removeEventListener('click', this.handleDocClick);
  }

  private readIndex(): SiteRecord[] {
    try {
      const el = document.getElementById('site-index');
      if (!el?.textContent) return [];
      return JSON.parse(el.textContent) as SiteRecord[];
    } catch {
      return [];
    }
  }

  private loadEngineIdx(scope: SearchScope): number {
    const idx = storageGetJson<number>(`nav:engine:${scope}`, 0);
    const len = ENGINES[scope]?.length ?? 0;
    return typeof idx === 'number' && idx >= 0 && idx < len ? idx : 0;
  }

  private loadHistory(scope: SearchScope): string[] {
    return storageGetJson<string[]>(historyKey(scope), []);
  }

  private cacheRefs(): void {
    this.input = this.querySelector<HTMLInputElement>('[data-role="input"]');
    this.dropdown = this.querySelector<HTMLElement>('[data-role="dropdown"]');
  }

  /** 按当前 scope/engineIdx 同步 SSR 静态标记 */
  private applyScopeState(): void {
    this.querySelectorAll<HTMLButtonElement>('[data-scope]').forEach((b) => {
      const on = b.dataset.scope === this.scope;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });

    const footer = this.querySelector<HTMLElement>('[data-role="site-footer"]');
    this.querySelectorAll<HTMLElement>('[data-role="engine-bar"]').forEach((bar) => {
      bar.hidden = bar.dataset.engineScope !== this.scope;
    });
    if (footer) footer.hidden = this.scope !== 'site';

    if (this.scope !== 'site') {
      this.querySelectorAll<HTMLButtonElement>(
        `[data-role="engine-bar"][data-engine-scope="${this.scope}"] [data-engine]`,
      ).forEach((b) => b.classList.toggle('active', Number(b.dataset.engine) === this.engineIdx));
    }

    if (this.input) this.input.placeholder = placeholderFor(this.scope, this.engineIdx);
  }

  // ── 事件（委托到宿主元素） ──

  private onInput = (e: Event): void => {
    if (e.target !== this.input) return;
    this.query = this.input!.value;
    this.cursor = -1;
    this.updateDropdown();
  };

  private onFocusIn = (e: FocusEvent): void => {
    if (e.target !== this.input) return;
    if (this.query) this.updateDropdown();
    else this.showHistory();
  };

  private onClick = (e: MouseEvent): void => {
    const t = e.target as HTMLElement;

    const scopeBtn = t.closest<HTMLButtonElement>('[data-scope]');
    if (scopeBtn) {
      this.switchScope(scopeBtn.dataset.scope as SearchScope);
      return;
    }
    const engBtn = t.closest<HTMLButtonElement>('[data-engine]');
    if (engBtn && engBtn.dataset.engineScope === this.scope) {
      this.setEngine(Number(engBtn.dataset.engine));
      return;
    }
    if (t.closest('[data-role="submit"]')) {
      this.doSearch();
      return;
    }
    const histBtn = t.closest<HTMLButtonElement>('[data-history]');
    if (histBtn) {
      this.replayHistory(histBtn.dataset.history ?? '');
      return;
    }
    if (t.closest('[data-clear-history]')) {
      this.history = [];
      storageSetJson(historyKey(this.scope), []);
      this.showHistory();
      return;
    }
    const resultLink = t.closest<HTMLAnchorElement>('a[data-title]');
    if (resultLink) {
      this.saveHistory(this.query.trim());
    }
  };

  private onKeydown = (e: KeyboardEvent): void => {
    if (e.target !== this.input) return;
    switch (e.key) {
      case 'Escape':
        this.query = '';
        this.input!.value = '';
        this.hideDropdown();
        e.preventDefault();
        break;
      case 'ArrowDown':
        this.moveCursor(1);
        e.preventDefault();
        break;
      case 'ArrowUp':
        this.moveCursor(-1);
        e.preventDefault();
        break;
      case 'Enter':
        this.doSearch();
        e.preventDefault();
        break;
    }
  };

  // ── 状态切换（只改标记，不重建面板 DOM） ──

  private switchScope(scope: SearchScope): void {
    if (scope === this.scope) return;
    this.scope = scope;
    storageSetJson(SCOPE_KEY, scope);
    this.engineIdx = this.loadEngineIdx(scope);
    this.history = this.loadHistory(scope);
    this.query = '';
    this.cursor = -1;
    if (this.input) this.input.value = '';
    this.hideDropdown();
    this.applyScopeState();
    this.input?.focus();
  }

  private setEngine(i: number): void {
    this.engineIdx = i;
    storageSetJson(`nav:engine:${this.scope}`, i);
    this.applyScopeState();
    this.input?.focus();
  }

  // ── 下拉面板 ──

  private updateDropdown(): void {
    if (!this.dropdown) return;
    if (!this.query.trim()) {
      this.showHistory();
      return;
    }
    if (this.scope === 'site') {
      this.tokens = queryTokens(this.query);
      this.results = searchSites(this.records, this.query);
      this.renderResults();
      this.showDropdown();
    } else {
      const engine = ENGINES[this.scope][this.engineIdx];
      this.dropdown.innerHTML = `
        <div class="flex items-center gap-3 px-4 py-3 text-sm text-muted">
          ${iconEl('search', 'h-4 w-4')}
          <span>按回车在 <span class="font-medium text-brand">${engine.name}</span> 中搜索「<span class="text-ink">${escapeAttr(this.query)}</span>」</span>
        </div>`;
      this.showDropdown();
    }
  }

  private renderResults(): void {
    const d = this.dropdown!;
    if (this.results.length === 0) {
      d.innerHTML = `<div class="px-4 py-10 text-center text-sm text-muted">未找到相关链接，试试换个关键词</div>`;
      return;
    }
    d.innerHTML = this.results
      .map(
        (r, i) => `
        <a href="${escapeAttr(r.url)}" target="_blank" rel="noopener noreferrer"${toCardDataHtml(toCardData(r))}
          title="${escapeAttr(`${r.title} · ${r.catName}/${r.subName}（首字母 ${r.pinyinFirst}）`)}"
          class="flex items-center gap-3 px-3 py-2 transition-colors ${
            i === this.cursor ? 'bg-surface/80' : 'hover:bg-surface/60'
          }">
          <img src="${escapeAttr(r.icon)}" alt="" loading="lazy" class="h-8 w-8 shrink-0 rounded-lg object-cover"
            data-letter="${escapeAttr(firstLetter(r.title))}">
          <span class="min-w-0 flex-1">
            <span class="flex min-w-0 items-center gap-1.5">
              <span class="min-w-0 truncate text-sm font-semibold text-ink">${markHit(r.title, this.tokens)}</span>
              ${r.mirrors?.length ? '<span class="shrink-0 rounded bg-brand/10 px-1 py-0.5 text-[10px] font-medium leading-none text-brand">镜像</span>' : ''}
              ${r.qr ? '<span class="shrink-0 rounded bg-brand/10 px-1 py-0.5 text-[10px] font-medium leading-none text-brand">扫码</span>' : ''}
            </span>
            ${r.desc ? `<span class="mt-0.5 block truncate text-xs text-muted">${markHit(r.desc, this.tokens)}</span>` : ''}
          </span>
          <span class="flex shrink-0 items-center pl-2">
            <span class="max-w-36 truncate rounded-full border border-line/80 bg-surface/70 px-1.5 py-px text-[10px] text-muted">${escapeAttr(r.catName)} · ${escapeAttr(r.subName)}</span>
          </span>
        </a>`,
      )
      .join('');
  }

  private showHistory(): void {
    const d = this.dropdown;
    if (!d) return;
    if (this.history.length === 0) {
      this.hideDropdown();
      return;
    }
    d.innerHTML = `
      <div class="flex items-center justify-between px-3 py-2 text-xs text-muted">
        <span>最近搜索</span>
        <button type="button" data-clear-history class="rounded px-1.5 py-0.5 transition-colors hover:text-ink">清空</button>
      </div>
      ${this.history
        .map(
          (h) => `
          <button type="button" data-history="${escapeAttr(h)}"
            class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-surface/60">
            <span class="text-muted">${iconEl('history', 'h-3.5 w-3.5')}</span>
            <span class="truncate">${escapeAttr(h)}</span>
          </button>`,
        )
        .join('')}
    `;
    this.showDropdown();
  }

  private showDropdown(): void {
    this.dropdown?.classList.remove('hidden');
  }

  private hideDropdown(): void {
    this.dropdown?.classList.add('hidden');
  }

  // ── 键盘导航与搜索动作 ──

  private moveCursor(dir: number): void {
    if (this.scope !== 'site') return;
    const n = this.results.length;
    if (n === 0) return;
    this.cursor = (this.cursor + dir + n) % n;
    this.renderResults();
    this.dropdown?.querySelectorAll('a')[this.cursor]?.scrollIntoView({ block: 'nearest' });
  }

  private doSearch(): void {
    const q = this.query.trim();
    if (!q) return;

    if (this.scope === 'site') {
      const target = this.cursor >= 0 && this.results[this.cursor] ? this.results[this.cursor] : this.results[0];
      if (target) this.openResult(target);
    } else {
      const engine = ENGINES[this.scope][this.engineIdx];
      window.open(engineUrl(engine, q), '_blank', 'noopener');
    }
    this.saveHistory(q);
    this.hideDropdown();
  }

  private openResult(r: SiteRecord): void {
    const data = toCardData(r);
    if (!data.qr && !data.mirrors) {
      window.open(r.url, '_blank', 'noopener');
      return;
    }
    const open = new CustomEvent(NAV_OPEN_CARD_EVENT, { detail: data, bubbles: true, cancelable: true });
    this.dispatchEvent(open);
    if (!open.defaultPrevented) window.open(r.url, '_blank', 'noopener');
  }

  private replayHistory(q: string): void {
    this.query = q;
    if (this.input) this.input.value = q;
    this.cursor = -1;
    this.doSearch();
  }

  private saveHistory(q: string): void {
    this.history = [q, ...this.history.filter((h) => h !== q)].slice(0, MAX_HISTORY);
    storageSetJson(historyKey(this.scope), this.history);
  }
}

customElements.define('nav-search', NavSearch);
