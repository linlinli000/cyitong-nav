/** <nav-search>：站内/引擎搜索、历史、键盘导航 */
import { ENGINES, PLACEHOLDERS, SCOPE_TABS, engineUrl, type SearchScope } from '../../data/search-engines';
import { searchSites, type SiteRecord } from './search-utils';
import { escapeHtml as escapeAttr } from './html-escape';
import { iconEl } from './icons';
import { storageGetJson, storageSetJson } from './storage';

const HISTORY_KEY = 'nav:history';
const SCOPE_KEY = 'nav:scope';
const MAX_HISTORY = 10;

class NavSearch extends HTMLElement {
  private scope: SearchScope = loadScope();
  private engineIdx = 0;
  private query = '';
  private records: SiteRecord[] = [];
  private results: SiteRecord[] = [];
  private history: string[] = storageGetJson<string[]>(HISTORY_KEY, []);
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
    this.engineIdx = this.loadEngineIdx();
    this.render();
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

  private dialogAttrs(r: SiteRecord): string {
    const qr = r.qr
      ? ` data-qr="${escapeAttr(r.url)}"${r.qrNote ? ` data-qr-note="${escapeAttr(r.qrNote)}"` : ''}`
      : '';
    const mirrors = r.mirrors?.length ? ` data-mirrors="${escapeAttr(JSON.stringify(r.mirrors))}"` : '';
    return `${qr}${mirrors}`;
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

  private loadEngineIdx(): number {
    const idx = storageGetJson<number>(`nav:engine:${this.scope}`, 0);
    const len = ENGINES[this.scope]?.length ?? 0;
    return typeof idx === 'number' && idx >= 0 && idx < len ? idx : 0;
  }

  private render(): void {
    const { scope } = this;
    const placeholder =
      scope === 'site' ? PLACEHOLDERS.site : `在 ${ENGINES[scope][this.engineIdx].name} 中搜索…`;
    this.innerHTML = `
      <div class="mb-2 flex justify-center sm:mb-3">
        <div class="inline-flex flex-wrap items-center justify-center gap-1 rounded-full border border-line/80 bg-surface/60 p-1 backdrop-blur-md sm:gap-1.5">
          ${SCOPE_TABS.map(
            (tab) => `
            <button type="button" data-scope="${tab.id}"
              class="inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium transition-all sm:px-5 sm:py-2 sm:text-sm ${
                tab.id === scope
                  ? 'bg-white font-semibold text-brand shadow-sm dark:bg-brand dark:text-on-accent'
                  : 'text-muted hover:bg-white/60 hover:text-ink dark:hover:bg-white/10'
              }">
              ${tab.label}
            </button>`,
          ).join('')}
        </div>
      </div>

      <div class="relative mx-auto w-full max-w-[45rem]">
        <div
          class="flex items-center gap-1.5 rounded-2xl border border-line bg-field py-1.5 pl-3.5 pr-1 shadow-[var(--shadow-field)] transition-all sm:gap-2 sm:pl-5 sm:pr-1.5">
          <input type="text" autocomplete="off" spellcheck="false" value="${escapeAttr(this.query)}"
            placeholder="${placeholder}"
            aria-label="搜索"
            class="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted sm:text-base" />
          <button type="button" data-role="submit" aria-label="搜索"
            class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand text-white transition-colors hover:bg-brand-dark active:scale-95 sm:h-10 sm:w-10 dark:text-on-accent">
            ${iconEl('search', 'h-4 w-4 sm:h-5 sm:w-5')}
          </button>
        </div>

        <div data-role="dropdown"
          class="search-dropdown absolute inset-x-0 top-full z-30 mt-1.5 hidden max-h-96 overflow-y-auto rounded-xl border border-line bg-field shadow-[var(--shadow-dropdown)]"></div>
      </div>

      ${scope === 'site'
        ? `<div class="mt-2 flex justify-center sm:mt-3">
            <span class="inline-flex items-center gap-1 rounded-full border border-line/80 bg-surface/60 px-3.5 py-1 text-[13px] text-muted backdrop-blur-md sm:px-4 dark:bg-black/20">本网站已收录<span class="font-semibold text-brand">${this.records.length}</span>个常用链接</span>
          </div>`
        : `<div class="mt-2 flex overflow-x-auto scrollbar-hide sm:mt-3">
            <div class="mx-auto flex shrink-0 items-center gap-2">
              ${ENGINES[scope]
                .map(
                  (e, i) => `
                  <button type="button" data-engine="${i}"
                    class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-line/80 px-2.5 py-1 text-[13px] backdrop-blur-md transition-all sm:px-3 ${
                      i === this.engineIdx
                        ? 'border-transparent bg-white font-semibold text-brand shadow-sm dark:bg-brand dark:text-on-accent'
                        : 'bg-surface/60 text-muted hover:text-ink dark:bg-black/20'
                    }">
                    ${iconEl(e.icon, 'h-3.5 w-3.5')}
                    ${e.name}
                  </button>`,
                )
                .join('')}
            </div>
          </div>`}
    `;
    this.input = this.querySelector('input');
    this.dropdown = this.querySelector('[data-role="dropdown"]');
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
    if (engBtn) {
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
      storageSetJson(HISTORY_KEY, []);
      this.showHistory();
      return;
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

  // ── 状态切换 ──

  private switchScope(scope: SearchScope): void {
    if (scope === this.scope) return;
    this.scope = scope;
    storageSetJson(SCOPE_KEY, scope);
    this.engineIdx = this.loadEngineIdx();
    this.query = '';
    this.cursor = -1;
    this.hideDropdown();
    this.render();
    this.input?.focus();
  }

  private setEngine(i: number): void {
    this.engineIdx = i;
    storageSetJson(`nav:engine:${this.scope}`, i);
    this.render();
    this.input?.focus();
  }

  // ── 下拉面板 ──

  private updateDropdown(): void {
    if (!this.query) {
      this.showHistory();
      return;
    }
    if (this.scope === 'site') {
      this.results = searchSites(this.records, this.query);
      this.renderResults();
      this.showDropdown();
    } else {
      const engine = ENGINES[this.scope][this.engineIdx];
      this.dropdown!.innerHTML = `
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
        <a href="${escapeAttr(r.url)}" target="_blank" rel="noopener noreferrer"${this.dialogAttrs(r)} data-title="${escapeAttr(r.title)}" data-icon="${escapeAttr(r.icon)}"
          class="flex items-center gap-3 px-3 py-2 transition-colors ${
            i === this.cursor ? 'bg-surface/80' : 'hover:bg-surface/60'
          }">
          <img src="${escapeAttr(r.icon)}" alt="" loading="lazy" class="h-8 w-8 shrink-0 rounded-lg object-cover"
            onerror="this.style.display='none'">
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium text-ink">${escapeAttr(r.title)}</span>
            <span class="block truncate text-xs text-muted">${escapeAttr(r.catName)} · ${escapeAttr(r.subName)}${
              r.qr ? ' · 扫码' : ''
            }${r.mirrors?.length ? ' · 镜像' : ''}</span>
          </span>
          <span class="shrink-0 text-xs text-muted">${escapeAttr(r.pinyinFirst)}</span>
        </a>`,
      )
      .join('');
  }

  private showHistory(): void {
    const d = this.dropdown!;
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
    if (r.mirrors?.length || r.qr) {
      const a = document.createElement('a');
      a.href = r.url;
      a.dataset.title = r.title;
      a.dataset.icon = r.icon;
      if (r.qr) {
        a.dataset.qr = r.url;
        a.dataset.qrNote = r.qrNote ?? '';
      }
      if (r.mirrors?.length) a.dataset.mirrors = JSON.stringify(r.mirrors);
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      window.open(r.url, '_blank', 'noopener');
    }
  }

  private replayHistory(q: string): void {
    this.query = q;
    if (this.input) this.input.value = q;
    this.cursor = -1;
    this.doSearch();
  }

  private saveHistory(q: string): void {
    this.history = [q, ...this.history.filter((h) => h !== q)].slice(0, MAX_HISTORY);
    storageSetJson(HISTORY_KEY, this.history);
  }
}

function loadScope(): SearchScope {
  const s = storageGetJson<string>(SCOPE_KEY, 'search');
  return SCOPE_TABS.some((t) => t.id === s) ? (s as SearchScope) : 'search';
}

customElements.define('nav-search', NavSearch);
