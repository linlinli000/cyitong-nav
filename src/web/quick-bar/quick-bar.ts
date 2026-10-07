/** 常用磁贴行（#quick-bar）控制器：pinned→最近→SSG 默认集三层合并渲染；固定/移除统一走右键/长按菜单 */
import {
  MAX_PINS,
  MAX_STORE,
  QUICK_ADD_OPEN_EVENT,
  QUICK_HIDDEN_KEY,
  QUICK_PINNED_KEY,
  QUICK_STORE_CHANGED_EVENT,
  RECENT_KEY,
  isHttpUrl,
  loadHidden,
  loadPins,
  loadRecents,
  saveHidden,
  savePins,
  type QuickSite,
} from './quick-store';
import { quickAddHtml, quickTileHtml } from './quick-tile';
import { updateScrollFade, watchScrollFade } from '../scroll-fade';
import { storageSetJson } from '../storage';

/** 行内磁贴上限：桌面 8 磁贴 + 添加格横排；移动端 2 行×5 列网格同为 8 磁贴 + 添加格 = 9 格，窄屏横向滚动（网格布局见 global.css） */
const MAX_SHOW = 8;
const LONG_PRESS_MS = 500;
const MOVE_CANCEL_PX = 10;

let defaultItems: QuickSite[] | null = null;
let stopQuickFade: (() => void) | null = null;

/** SSG 默认磁贴只在首帧存在于 DOM，读出数据后缓存（innerHTML 重建后仍可用） */
function readDefaultItems(): QuickSite[] {
  if (defaultItems) return defaultItems;
  const wrap = document.getElementById('quick-tiles');
  defaultItems = wrap
    ? [...wrap.querySelectorAll<HTMLAnchorElement>('a[data-quick-default]')]
        .map((a) => ({ url: a.href, title: a.dataset.title ?? '', icon: a.dataset.icon ?? '' }))
        .filter((r) => r.url && r.title && r.icon)
    : [];
  return defaultItems;
}

function renderQuickBar(): void {
  const bar = document.getElementById('quick-bar');
  const wrap = document.getElementById('quick-tiles');
  if (!bar || !wrap) return;
  const hidden = loadHidden();
  const seen = new Set<string>();
  const tiles: string[] = [];
  const budget = MAX_SHOW;

  for (const p of loadPins()) {
    if (tiles.length >= budget) break;
    seen.add(p.url);
    tiles.push(quickTileHtml(p, { pinned: true }));
  }
  const fill = (items: QuickSite[]): void => {
    for (const it of items) {
      if (tiles.length >= budget) return;
      if (seen.has(it.url) || hidden.has(it.url)) continue;
      seen.add(it.url);
      tiles.push(quickTileHtml(it));
    }
  };
  fill(loadRecents());
  fill(readDefaultItems());

  // 行恒显：磁贴层空时仍保留常驻"添加"格，保证恢复入口
  wrap.innerHTML = tiles.join('') + quickAddHtml();
  if (stopQuickFade) updateScrollFade(bar);
  else stopQuickFade = watchScrollFade(bar);
}

/** 从磁贴 DOM 读回数据（href 已由浏览器规范化，与存储形态一致） */
function tileItemOf(el: Element): { item: QuickSite; a: HTMLAnchorElement } | null {
  const a = el.closest('.quick-tile-wrap')?.querySelector<HTMLAnchorElement>('a[data-title]');
  if (!a || !a.dataset.title) return null;
  return { item: { url: a.href, title: a.dataset.title, icon: a.dataset.icon ?? '' }, a };
}

function togglePin(item: QuickSite): void {
  const pins = loadPins();
  const i = pins.findIndex((p) => p.url === item.url);
  if (i >= 0) {
    pins.splice(i, 1);
  } else {
    if (pins.length >= MAX_PINS) {
      showToast(`最多固定 ${MAX_PINS} 个，先取消一个再试`);
      return;
    }
    pins.push(item);
    // 固定即解除"已移除"，否则渲染层过滤会让它不出现
    const hidden = loadHidden();
    hidden.delete(item.url);
    saveHidden(hidden);
  }
  if (!savePins(pins)) {
    showToast('保存失败，浏览器存储空间不足');
    return;
  }
  renderQuickBar();
}

function dismissTile(item: QuickSite): void {
  const hidden = loadHidden();
  hidden.add(item.url);
  saveHidden(hidden);
  if (!savePins(loadPins().filter((p) => p.url !== item.url))) {
    showToast('保存失败，浏览器存储空间不足');
  }
  renderQuickBar();
}

// ── 右键/长按菜单（触屏无 hover 的主操作路径） ──

let menuEl: HTMLElement | null = null;
let menuTile: HTMLAnchorElement | null = null;
let pressTimer: ReturnType<typeof setTimeout> | null = null;
let pressStart: { x: number; y: number } | null = null;
let suppressClick = false;

function closeTileMenu(): void {
  if (!menuEl || menuEl.hidden) return;
  menuEl.hidden = true;
  menuTile?.focus({ preventScroll: true });
  menuTile = null;
}

function openTileMenu(a: HTMLAnchorElement): void {
  const found = tileItemOf(a);
  if (!found) return;
  if (menuTile === a && menuEl && !menuEl.hidden) return;
  const pinned = loadPins().some((p) => p.url === found.item.url);
  if (!menuEl) {
    menuEl = document.createElement('div');
    menuEl.className = 'quick-menu';
    menuEl.setAttribute('role', 'menu');
    menuEl.hidden = true;
    document.body.appendChild(menuEl);
    menuEl.addEventListener('click', (e) => {
      const btn = (e.target as Element).closest('button');
      if (!btn) return;
      const current = menuTile ? tileItemOf(menuTile) : null;
      const url = current?.item.url;
      closeTileMenu();
      if (!current) return;
      if (btn.hasAttribute('data-menu-pin')) togglePin(current.item);
      else if (btn.hasAttribute('data-menu-dismiss')) dismissTile(current.item);
      focusTile(url);
    });
  }
  menuEl.innerHTML = `
    <button type="button" role="menuitem" data-menu-pin>${pinned ? '取消固定' : '固定'}</button>
    <button type="button" role="menuitem" data-menu-dismiss>移除</button>`;
  menuEl.hidden = false;
  // 磁贴下方居中，越界翻转/夹边
  const r = a.getBoundingClientRect();
  const mw = menuEl.offsetWidth;
  const mh = menuEl.offsetHeight;
  const x = Math.max(8, Math.min(r.left + r.width / 2 - mw / 2, window.innerWidth - mw - 8));
  let y = r.bottom + 6;
  if (y + mh > window.innerHeight - 8) y = r.top - mh - 6;
  menuEl.style.left = `${x}px`;
  menuEl.style.top = `${Math.max(8, y)}px`;
  menuTile = a;
  menuEl.querySelector('button')?.focus({ preventScroll: true });
}

/** 菜单动作重渲染后把焦点还给同址磁贴；磁贴已不在（移除）则还给添加格，避免焦点落 body */
function focusTile(url: string | undefined): void {
  if (!url) return;
  const wrap = document.getElementById('quick-tiles');
  const target =
    wrap?.querySelector<HTMLAnchorElement>(`a.quick-tile[href="${CSS.escape(url)}"]`) ??
    wrap?.querySelector<HTMLButtonElement>('[data-quick-add]');
  target?.focus({ preventScroll: true });
}

/** 长按 500ms 弹菜单；位移超阈值（滚动）或松手即取消。松手后的 click 由 capture 拦一次 */
function onPointerDown(e: PointerEvent): void {
  // 新按压开始即作废上次长按的拦击标记：触屏长按松手常不发 click，标记不能跨手势残留
  suppressClick = false;
  if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const a =
    e.target instanceof Element
      ? e.target.closest<HTMLAnchorElement>('.quick-tile-wrap a.quick-tile')
      : null;
  if (!a) return;
  pressStart = { x: e.clientX, y: e.clientY };
  pressTimer = setTimeout(() => {
    pressTimer = null;
    suppressClick = true;
    openTileMenu(a);
  }, LONG_PRESS_MS);
}

function onPointerMove(e: PointerEvent): void {
  if (!pressTimer || !pressStart) return;
  if (
    Math.abs(e.clientX - pressStart.x) > MOVE_CANCEL_PX ||
    Math.abs(e.clientY - pressStart.y) > MOVE_CANCEL_PX
  ) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
}

function onPointerEnd(): void {
  if (pressTimer) clearTimeout(pressTimer);
  pressTimer = null;
}

function onContextMenu(e: MouseEvent): void {
  if (!(e.target instanceof Element)) return;
  const a = e.target.closest<HTMLAnchorElement>('.quick-tile-wrap a.quick-tile');
  if (!a) return;
  // 原生长按/右键菜单被自定义菜单替代；与长按计时双通道（iOS 无 contextmenu），防重入
  e.preventDefault();
  if (pressTimer) clearTimeout(pressTimer);
  pressTimer = null;
  openTileMenu(a);
}

/** 长按弹菜单后拦掉紧随的 click，避免误触发磁贴链接 */
function onClickCapture(e: MouseEvent): void {
  if (!suppressClick) return;
  suppressClick = false;
  e.preventDefault();
  e.stopPropagation();
}

let toastTimer: number | null = null;

function showToast(msg: string): void {
  let el = document.querySelector('.quick-toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'quick-toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('show'), 2200);
}

/** 加号格派发打开添加弹窗 + 点击记账（卡片/搜索结果/磁贴统一走 a[data-title]） */
function onDocClick(e: MouseEvent): void {
  if (!(e.target instanceof Element)) return;
  // 菜单外任意点击即关（菜单内部点击由自身 handler 处理，长按那一下已被 capture 拦掉）
  if (menuEl && !menuEl.hidden && !e.target.closest('.quick-menu')) closeTileMenu();
  if (e.target.closest('[data-quick-add]')) {
    document.dispatchEvent(
      new CustomEvent(QUICK_ADD_OPEN_EVENT, { detail: { opener: e.target.closest('button') } }),
    );
    return;
  }
  const el = e.target.closest<HTMLAnchorElement>('a[data-title]');
  if (!el) return;
  const item: QuickSite = { url: el.href, title: el.dataset.title ?? '', icon: el.dataset.icon ?? '' };
  if (!item.title || !item.icon || !isHttpUrl(item.url)) return;
  const prev = loadRecents();
  storageSetJson(RECENT_KEY, [item, ...prev.filter((r) => r.url !== item.url)].slice(0, MAX_STORE));
  if (prev.length === 0 || prev[0].url !== item.url) setTimeout(renderQuickBar, 0);
}

/** 其他标签页改了磁贴数据时同步（storage 事件只在跨标签写入时触发，本页自己的写入不会） */
function onStorage(e: StorageEvent): void {
  if (e.key === null || e.key === QUICK_PINNED_KEY || e.key === QUICK_HIDDEN_KEY || e.key === RECENT_KEY) {
    renderQuickBar();
  }
}

let inited = false;

export function initQuickBar(): void {
  if (inited) return;
  inited = true;
  renderQuickBar();
  document.addEventListener(QUICK_STORE_CHANGED_EVENT, renderQuickBar);
  window.addEventListener('storage', onStorage);
  document.addEventListener('click', onDocClick);
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerEnd);
  document.addEventListener('pointercancel', onPointerEnd);
  document.addEventListener('contextmenu', onContextMenu);
  document.addEventListener('click', onClickCapture, true);
  document.addEventListener('scroll', closeTileMenu, { capture: true, passive: true });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeTileMenu();
  });
}
