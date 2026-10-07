/** <nav-search>：站内/引擎搜索、历史、键盘导航 */
import {
  ENGINES,
  SCOPE_TABS,
  engineUrlFor,
  isSearchScope,
  placeholderFor,
  type SearchScope,
} from '../../config/search-engines';
import { queryTokens, searchSites, type SiteRecord } from '../search-utils';
import { NAV_OPEN_CARD_EVENT, toCardData, toCardDataHtml } from '../card-attrs';
import { escapeHtml } from '../html-escape';
import { iconEl } from '../icons';
import { siteIconHtml } from '../site-icon';
import { BREAKPOINT_MD } from '../breakpoints';
import { watchScrollFade } from '../scroll-fade';
import { storageGetJson, storageSetJson } from '../storage';

const SCOPE_KEY = 'nav:scope';
const MAX_HISTORY = 10;
const historyKey = (scope: SearchScope): string => `nav:history:${scope}`;
const engineKey = (scope: SearchScope): string => `nav:engine:${scope}`;
const modeKey = (scope: SearchScope, engine: number): string => `nav:mode:${scope}:${engine}`;

function loadScope(): SearchScope {
  const s = storageGetJson<string>(SCOPE_KEY, 'search');
  return isSearchScope(s) ? s : 'search';
}

/** 命中词高亮：原文定位分段转义，避免在转义文本上误伤实体 */
function markHit(text: string, tokens: string[]): string {
  if (!text) return '';
  if (tokens.length === 0) return escapeHtml(text);
  const re = new RegExp(
    tokens.filter(Boolean).map((tk) => tk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
    'gi',
  );
  let out = '';
  let last = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    out += escapeHtml(text.slice(last, i)) + `<mark class="search-hit">${escapeHtml(m[0])}</mark>`;
    last = i + m[0].length;
  }
  return out + escapeHtml(text.slice(last));
}

class NavSearch extends HTMLElement {
  private scope: SearchScope = loadScope();
  private engineIdx = 0;
  private modeIdx = 0;
  private query = '';
  private records: SiteRecord[] = [];
  private results: SiteRecord[] = [];
  private tokens: string[] = [];
  private history: string[] = [];
  private cursor = -1;
  private rowEls: HTMLAnchorElement[] = [];

  private input: HTMLInputElement | null = null;
  private dropdown: HTMLElement | null = null;
  private ctxBtn: HTMLButtonElement | null = null;
  private ctxLabel: HTMLElement | null = null;
  private ctxMenu: HTMLElement | null = null;
  private stopFades: (() => void)[] = [];

  private onDocKeydown = (e: KeyboardEvent): void => {
    if (e.isComposing) return;
    const tag = (e.target as HTMLElement).tagName;
    if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      this.input?.focus();
    }
  };

  private onDocClick = (e: MouseEvent): void => {
    // 菜单选中重渲染后目标已摘出 DOM，contains 会误判，故按传播路径判断归属
    if (e.composedPath().includes(this)) return;
    this.hideDropdown();
    this.closeCtxMenu();
  };

  connectedCallback(): void {
    this.records = this.readIndex();
    this.engineIdx = this.loadEngineIdx(this.scope);
    this.history = this.loadHistory(this.scope);
    this.cacheRefs();
    this.applyScopeState();
    // /?q=xxx（JSON-LD SearchAction）预填展开
    const urlQ = new URLSearchParams(location.search).get('q');
    if (urlQ) {
      this.query = urlQ;
      if (this.input) this.input.value = urlQ;
      this.updateDropdown();
    }
    // 新标签页：仅桌面精确指针自动聚焦，触屏不抢焦点
    if (window.matchMedia(`(min-width: ${BREAKPOINT_MD}px) and (pointer: fine)`).matches) {
      this.input?.focus({ preventScroll: true });
    }
    this.stopFades = [...this.querySelectorAll<HTMLElement>('[data-fade-x]')].map((el) =>
      watchScrollFade(el),
    );

    this.addEventListener('input', this.onInput);
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('click', this.onClick);
    this.addEventListener('keydown', this.onKeydown);
    document.addEventListener('keydown', this.onDocKeydown);
    document.addEventListener('click', this.onDocClick);
  }

  disconnectedCallback(): void {
    this.stopFades.forEach((stop) => stop());
    this.stopFades = [];
    document.removeEventListener('keydown', this.onDocKeydown);
    document.removeEventListener('click', this.onDocClick);
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
    const idx = storageGetJson<number>(engineKey(scope), 0);
    const len = ENGINES[scope]?.length ?? 0;
    return typeof idx === 'number' && idx >= 0 && idx < len ? idx : 0;
  }

  private loadModeIdx(scope: SearchScope, engine: number): number {
    const idx = storageGetJson<number>(modeKey(scope, engine), 0);
    const len = ENGINES[scope]?.[engine]?.modes?.length ?? 0;
    return typeof idx === 'number' && idx >= 0 && idx < len ? idx : 0;
  }

  private loadHistory(scope: SearchScope): string[] {
    const h = storageGetJson<string[]>(historyKey(scope), []);
    return Array.isArray(h) ? h.filter((x): x is string => typeof x === 'string') : [];
  }

  private cacheRefs(): void {
    this.input = this.querySelector<HTMLInputElement>('[data-role="input"]');
    this.dropdown = this.querySelector<HTMLElement>('[data-role="dropdown"]');
    this.ctxBtn = this.querySelector<HTMLButtonElement>('[data-role="ctx-btn"]');
    this.ctxLabel = this.querySelector<HTMLElement>('[data-role="ctx-label"]');
    this.ctxMenu = this.querySelector<HTMLElement>('[data-role="ctx-menu"]');
  }

  /** 按 scope/engineIdx 同步 SSR 静态标记 */
  private applyScopeState(): void {
    // 类型下标与 UI 解耦：即使类型按钮不在 DOM，占位符/搜索 URL 也要用到
    this.modeIdx = this.loadModeIdx(this.scope, this.engineIdx);
    this.syncCtxLabel();
    if (this.ctxMenu && !this.ctxMenu.hidden) this.renderCtxMenu();
    if (this.input) this.input.placeholder = this.currentPlaceholder();
  }

  // ── 上下文芯片（范围+引擎+类型 统一选择器） ──

  private syncCtxLabel(): void {
    if (!this.ctxLabel) return;
    if (this.scope === 'site') {
      this.ctxLabel.innerHTML = `${iconEl('logo', 'h-3.5 w-3.5 shrink-0')}<span>站内</span>`;
      return;
    }
    // 标签只显示引擎·类型（范围由菜单/占位符承担）；无类型显示引擎名
    const engine = ENGINES[this.scope][this.engineIdx];
    const mode = engine.modes?.[this.modeIdx];
    const text = mode?.label ?? engine.name;
    this.ctxLabel.innerHTML = `${iconEl(engine.icon, 'h-3.5 w-3.5 shrink-0')}<span>${escapeHtml(text)}</span>`;
  }

  private renderCtxMenu(): void {
    if (!this.ctxMenu) return;
    const scopeGroup = this.ctxGroup(
      '范围',
      SCOPE_TABS.map(
        (t) => `
      <button type="button" role="option" aria-selected="${t.id === this.scope}" data-pick-scope="${t.id}"
        class="ctx-item${t.id === this.scope ? ' active' : ''}">${t.icon ? iconEl(t.icon, 'h-3.5 w-3.5 shrink-0') : ''}${escapeHtml(t.label)}</button>`,
      ).join(''),
    );
    if (this.scope === 'site') {
      this.ctxMenu.innerHTML = scopeGroup;
      return;
    }
    const engine = ENGINES[this.scope][this.engineIdx];
    const engineGroup = this.ctxGroup(
      '引擎',
      ENGINES[this.scope]
        .map(
          (e, i) => `
        <button type="button" role="option" aria-selected="${i === this.engineIdx}"
          data-pick-engine="${i}"
          class="ctx-item${i === this.engineIdx ? ' active' : ''}">
          ${iconEl(e.icon, 'h-3.5 w-3.5 shrink-0')}${escapeHtml(e.name)}
        </button>`,
        )
        .join(''),
    );
    const modeGroup = engine.modes?.length
      ? this.ctxGroup(
          '类型',
          engine.modes
            .map(
              (m, i) => `
            <button type="button" role="option" aria-selected="${i === this.modeIdx}" data-pick-mode="${i}"
              class="ctx-item${i === this.modeIdx ? ' active' : ''}">${escapeHtml(m.label)}</button>`,
            )
            .join(''),
        )
      : '';
    this.ctxMenu.innerHTML = scopeGroup + engineGroup + modeGroup;
  }

  /** listbox 子级须为 option/group：分组标题对读屏隐藏 */
  private ctxGroup(label: string, items: string): string {
    return `<div class="ctx-cap" aria-hidden="true">${label}</div><div class="ctx-row" role="group" aria-label="${label}">${items}</div>`;
  }

  private toggleCtxMenu(): void {
    if (!this.ctxMenu || !this.ctxBtn) return;
    const open = this.ctxMenu.hidden;
    if (open) {
      this.hideDropdown();
      this.renderCtxMenu();
    }
    this.ctxMenu.hidden = !open;
    this.ctxBtn.setAttribute('aria-expanded', String(open));
  }

  private closeCtxMenu(): void {
    if (this.ctxMenu && !this.ctxMenu.hidden) this.ctxMenu.hidden = true;
    this.ctxBtn?.setAttribute('aria-expanded', 'false');
  }

  private currentPlaceholder(): string {
    if (this.scope === 'site') return placeholderFor(this.scope, this.engineIdx);
    const engine = ENGINES[this.scope][this.engineIdx];
    const mode = engine.modes?.[this.modeIdx];
    return mode ? `在 ${engine.name} 搜索${mode.label}…` : placeholderFor(this.scope, this.engineIdx);
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
    // 输入框接管时收起 ctx 菜单，两面板不并存
    this.closeCtxMenu();
    if (this.query) this.updateDropdown();
    else this.showHistory();
  };

  private onClick = (e: MouseEvent): void => {
    const t = e.target as HTMLElement;

    if (t.closest('[data-role="ctx-btn"]')) {
      this.toggleCtxMenu();
      return;
    }
    const pickScope = t.closest<HTMLButtonElement>('[data-pick-scope]');
    if (pickScope) {
      const scope = pickScope.dataset.pickScope;
      if (isSearchScope(scope)) {
        this.switchScope(scope);
        this.renderCtxMenu();
        this.ctxBtn?.focus();
      }
      return;
    }
    // 引擎项只在当前 scope 菜单里渲染，无需再校验
    const pickEngine = t.closest<HTMLButtonElement>('[data-pick-engine]');
    if (pickEngine) {
      this.setEngine(Number(pickEngine.dataset.pickEngine));
      this.renderCtxMenu();
      this.ctxBtn?.focus();
      return;
    }
    const pickMode = t.closest<HTMLButtonElement>('[data-pick-mode]');
    if (pickMode) {
      this.setMode(Number(pickMode.dataset.pickMode));
      this.renderCtxMenu();
      this.ctxBtn?.focus();
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
    if (e.isComposing) return;
    const t = e.target as HTMLElement;
    // Esc 对芯片/菜单也生效；方向键与 Enter 仅在输入框内
    const onCtx = t.closest('[data-role="ctx-btn"], [data-role="ctx-menu"]') != null;
    if (t !== this.input && !onCtx) return;
    switch (e.key) {
      case 'Escape':
        if (this.ctxMenu && !this.ctxMenu.hidden) {
          this.closeCtxMenu();
          // 菜单已消费 Esc，阻断传播避免文档级监听连带反应
          e.stopPropagation();
        } else if (t === this.input) {
          this.query = '';
          this.input!.value = '';
          this.hideDropdown();
        }
        e.preventDefault();
        break;
      case 'ArrowDown':
        if (t !== this.input) return;
        this.moveCursor(1);
        e.preventDefault();
        break;
      case 'ArrowUp':
        if (t !== this.input) return;
        this.moveCursor(-1);
        e.preventDefault();
        break;
      case 'Enter':
        if (t !== this.input) return;
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
  }

  private setEngine(i: number): void {
    this.engineIdx = i;
    storageSetJson(engineKey(this.scope), i);
    this.applyScopeState();
  }

  private setMode(i: number): void {
    this.modeIdx = i;
    storageSetJson(modeKey(this.scope, this.engineIdx), i);
    this.applyScopeState();
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
      const mode = engine.modes?.[this.modeIdx];
      this.dropdown.innerHTML = `
        <div role="option" aria-selected="false" aria-disabled="true" class="flex items-center gap-3 px-4 py-3 text-sm text-muted">
          ${iconEl('search', 'h-4 w-4')}
          <span>按回车在 <span class="font-medium text-brand">${engine.name}</span> 中搜索${mode ? `<span class="text-brand">${escapeHtml(mode.label)}</span>` : ''}「<span class="text-ink">${escapeHtml(this.query)}</span>」</span>
        </div>`;
      this.showDropdown();
    }
  }

  private renderResults(): void {
    const d = this.dropdown!;
    if (this.results.length === 0) {
      d.innerHTML = `<div class="px-4 py-10 text-center text-sm text-muted">未找到相关链接，试试换个关键词</div>`;
      this.rowEls = [];
      return;
    }
    d.innerHTML = this.results
      .map(
        (r, i) => `
        <a href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer"${toCardDataHtml(toCardData(r))}
          role="option" aria-selected="false" id="nav-search-opt-${i}"
          title="${escapeHtml(`${r.title} · ${r.catName}/${r.subName}（首字母 ${r.pinyinFirst}）`)}"
          class="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-surface/60">
          ${siteIconHtml(r.icon, r.title, 'h-8 w-8 shrink-0 rounded-lg object-cover')}
          <span class="min-w-0 flex-1">
            <span class="flex min-w-0 items-center gap-1.5">
              <span class="min-w-0 truncate text-sm font-semibold text-ink">${markHit(r.title, this.tokens)}</span>
              ${r.badge ? `<span class="shrink-0 rounded bg-brand/10 px-1 py-0.5 text-chip font-medium leading-none text-brand">${escapeHtml(r.badge)}</span>` : ''}
            </span>
            ${r.desc ? `<span class="mt-0.5 block truncate text-note text-muted">${markHit(r.desc, this.tokens)}</span>` : ''}
          </span>
          <span class="flex shrink-0 items-center pl-2">
            <span class="max-w-36 truncate rounded-full border border-line/80 bg-surface/70 px-1.5 py-px text-chip text-muted">${escapeHtml(r.catName)} · ${escapeHtml(r.subName)}</span>
          </span>
        </a>`,
      )
      .join('');
    this.rowEls = [...d.querySelectorAll<HTMLAnchorElement>('a[data-title]')];
    this.applyCursor();
  }

  private applyCursor(): void {
    this.rowEls.forEach((a, i) => {
      const active = i === this.cursor;
      a.classList.toggle('search-row-active', active);
      a.setAttribute('aria-selected', String(active));
    });
    const active = this.cursor >= 0 ? this.rowEls[this.cursor] : null;
    if (active?.id) this.input?.setAttribute('aria-activedescendant', active.id);
    else this.input?.removeAttribute('aria-activedescendant');
  }

  private showHistory(): void {
    const d = this.dropdown;
    if (!d) return;
    if (this.history.length === 0) {
      this.hideDropdown();
      return;
    }
    this.rowEls = [];
    this.cursor = -1;
    d.innerHTML = `
      <div class="flex items-center justify-between px-3 py-2 text-note text-muted">
        <span>最近搜索</span>
        <button type="button" data-clear-history class="rounded px-1.5 py-0.5 transition-colors hover:text-ink">清空</button>
      </div>
      ${this.history
        .map(
          (h, i) => `
          <button type="button" data-history="${escapeHtml(h)}"
            role="option" aria-selected="false" id="nav-search-hist-${i}"
            class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-surface/60">
            <span class="text-muted">${iconEl('history', 'h-3.5 w-3.5')}</span>
            <span class="truncate">${escapeHtml(h)}</span>
          </button>`,
        )
        .join('')}
    `;
    this.showDropdown();
  }

  private showDropdown(): void {
    if (!this.dropdown) return;
    this.dropdown.hidden = false;
    this.input?.setAttribute('aria-expanded', 'true');
  }

  private hideDropdown(): void {
    if (!this.dropdown) return;
    this.dropdown.hidden = true;
    this.input?.setAttribute('aria-expanded', 'false');
    this.input?.removeAttribute('aria-activedescendant');
  }

  // ── 键盘导航与搜索动作 ──

  private moveCursor(dir: number): void {
    if (this.scope !== 'site') return;
    const n = this.results.length;
    if (n === 0) return;
    this.cursor = (this.cursor + dir + n) % n;
    this.applyCursor();
    this.rowEls[this.cursor]?.scrollIntoView({ block: 'nearest' });
  }

  private doSearch(): void {
    const q = this.query.trim();
    if (!q) return;
    this.closeCtxMenu();

    if (this.scope === 'site') {
      const target = this.cursor >= 0 && this.results[this.cursor] ? this.results[this.cursor] : this.results[0];
      if (target) this.openResult(target);
    } else {
      const engine = ENGINES[this.scope][this.engineIdx];
      window.open(engineUrlFor(engine, this.modeIdx, q), '_blank', 'noopener');
    }
    this.saveHistory(q);
    this.hideDropdown();
  }

  private openResult(r: SiteRecord): void {
    const data = toCardData(r);
    if (!data.qr && !data.entries) {
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
