/**
 * <nav-search> 搜索岛：站内搜索 + 引擎搜索 + 搜索历史
 * 站内数据来自 <script id="site-index"> 序列化索引（构建期注入）。
 */
import { ENGINES, PLACEHOLDERS, SCOPE_TABS, engineUrl, type SearchScope } from '../../data/search-engines';
import { searchSites, type SiteRecord } from './search-utils';

const HISTORY_KEY = 'nav:history';
const SCOPE_KEY = 'nav:scope';
const MAX_HISTORY = 10;

function storageGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function storageSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 隐私模式等场景忽略 */
  }
}

function escapeAttr(s: string): string {
  return s.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]!);
}

const SEARCH_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>';
const HISTORY_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path></svg>';

class NavSearch extends HTMLElement {
  private scope: SearchScope = loadScope();
  private engineIdx = 0;
  private query = '';
  private records: SiteRecord[] = [];
  private results: SiteRecord[] = [];
  private history: string[] = storageGet<string[]>(HISTORY_KEY, []);
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
    const idx = storageGet<number>(`nav:engine:${this.scope}`, 0);
    const len = ENGINES[this.scope]?.length ?? 0;
    return typeof idx === 'number' && idx >= 0 && idx < len ? idx : 0;
  }

  private render(): void {
    const { scope } = this;
    this.innerHTML = `
      <!-- 第一层：搜索范围选项卡（分段胶囊，沿用旧版设计；桌面 sm+ 放大一档与输入条协调） -->
      <div class="mb-3 flex justify-center sm:mb-4">
        <div class="inline-flex items-center gap-1 rounded-full border border-line bg-surface p-1 sm:gap-1.5 sm:p-1.5">
          ${SCOPE_TABS.map(
            (tab) => `
            <button type="button" data-scope="${tab.id}"
              class="shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium transition-all sm:px-5 sm:py-2 sm:text-sm ${
                tab.id === scope
                  ? 'bg-white text-brand shadow-sm dark:bg-brand dark:text-[#13161c]'
                  : 'text-muted hover:text-ink'
              }">
              ${tab.label}
            </button>`,
          ).join('')}
        </div>
      </div>

      <!-- 输入框与下拉共处一个 relative：下拉 absolute 紧贴输入框底、盖住下方按钮 -->
      <div class="relative">
        <div
          class="flex items-center gap-2 rounded-xl border border-line bg-field px-3 py-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all sm:gap-3 sm:px-4 sm:py-2 dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)]">
          <input type="text" autocomplete="off" spellcheck="false" value="${escapeAttr(this.query)}"
            placeholder="${PLACEHOLDERS[scope]}"
            aria-label="搜索"
            class="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-ink outline-none placeholder:text-muted sm:py-2 sm:text-[15px]" />
          <button type="button" data-role="submit" aria-label="搜索"
            class="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-brand text-white transition-colors hover:bg-brand-dark active:scale-95 sm:h-10 sm:w-10 dark:text-[#13161c]">
            ${SEARCH_SVG}
          </button>
        </div>

        <!-- 下拉：顶部盖住底部按钮；内容超高时 max-h + 内滚（search-dropdown 细滚动条） -->
        <div data-role="dropdown"
          class="search-dropdown absolute inset-x-0 top-full z-30 mt-1.5 hidden max-h-96 overflow-y-auto rounded-xl border border-line bg-field shadow-[0_4px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)]"></div>
      </div>

      <!-- 第三层：站内收录统计 / 搜索引擎按钮（同放大一档） -->
      <div class="mt-3 flex flex-wrap items-center justify-center gap-2 sm:mt-4">
        ${scope === 'site'
          ? `<span class="rounded-full bg-surface/70 px-3.5 py-1.5 text-[13px] text-muted sm:px-4 sm:text-sm dark:bg-black/25">本网站已收录 ${this.records.length} 个常用链接</span>`
          : ENGINES[scope]
              .map(
                (e, i) => `
                <button type="button" data-engine="${i}"
                  class="rounded-full border border-line/80 px-3 py-1.5 text-[13px] transition-all sm:px-4 sm:text-sm ${
                    i === this.engineIdx
                      ? 'border-transparent bg-white font-semibold text-brand shadow-sm dark:bg-brand dark:text-[#13161c]'
                      : 'bg-surface/60 text-muted hover:text-ink dark:bg-black/20'
                  }">
                  ${e.name}
                </button>`,
              )
              .join('')}
      </div>
    `;
    this.input = this.querySelector('input');
    this.dropdown = this.querySelector('[data-role="dropdown"]');
  }

  // ── 事件（委托到宿主元素，避免重渲染后丢失绑定） ──

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
      storageSet(HISTORY_KEY, []);
      this.showHistory();
      return;
    }
    // 结果项为 <a>：默认跳转；带二维码/镜像的由 <nav-dialog> 文档级委托拦截
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
    storageSet(SCOPE_KEY, scope);
    this.engineIdx = this.loadEngineIdx();
    this.query = '';
    this.cursor = -1;
    this.hideDropdown();
    this.render();
    this.input?.focus();
  }

  private setEngine(i: number): void {
    this.engineIdx = i;
    storageSet(`nav:engine:${this.scope}`, i);
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
          ${SEARCH_SVG}
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
        <a href="${escapeAttr(r.url)}" data-title="${escapeAttr(r.title)}"
          data-qr="${r.qr ? escapeAttr(r.url) : ''}"
          data-qr-note="${r.qr && r.qrNote ? escapeAttr(r.qrNote) : ''}"
          data-mirrors="${r.mirrors?.length ? escapeAttr(JSON.stringify(r.mirrors)) : ''}"
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
            <span class="text-muted">${HISTORY_SVG}</span>
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
      // 构造临时 <a> 并派发点击，让 <nav-dialog> 的文档级委托拦截
      const a = document.createElement('a');
      a.href = r.url;
      a.dataset.title = r.title;
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
    storageSet(HISTORY_KEY, this.history);
  }
}

function loadScope(): SearchScope {
  const s = storageGet<string>(SCOPE_KEY, 'site');
  return SCOPE_TABS.some((t) => t.id === s) ? (s as SearchScope) : 'site';
}

customElements.define('nav-search', NavSearch);
