/** 首屏 hero：时钟+日期+按时段问候、常用磁贴行（全部客户端，数据只进 localStorage） */
import { quickTileInner } from './quick-tile';
import { updateScrollFade, watchScrollFade } from './scroll-fade';
import { storageGetJson, storageSetJson } from './storage';

const RECENT_KEY = 'nav:recent-sites';
const MAX_STORE = 20;
const MAX_SHOW = 8;
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

interface RecentSite {
  url: string;
  title: string;
  icon: string;
}

/** 读取并清洗最近使用记录（丢弃缺字段的脏数据，如历史格式残留） */
function loadRecents(): RecentSite[] {
  return storageGetJson<RecentSite[]>(RECENT_KEY, []).filter(
    (r): r is RecentSite => Boolean(r && r.url && r.title && r.icon),
  );
}

function greetingFor(h: number): string {
  if (h >= 5 && h < 11) return '早上好，今天想查什么？';
  if (h >= 11 && h < 14) return '中午好，今天想查什么？';
  if (h >= 14 && h < 18) return '下午好，今天想查什么？';
  if (h >= 18 && h < 23) return '晚上好，今天想查什么？';
  return '夜深了，注意休息';
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** 每秒对时，内容有变化才写 DOM */
function renderHeroClock(): void {
  const clock = document.getElementById('hero-clock');
  if (!clock) return;
  const now = new Date();
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  if (clock.textContent === time) return;
  clock.textContent = time;
  clock.setAttribute(
    'datetime',
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${time}`,
  );
  const date = document.getElementById('hero-date');
  if (date) date.textContent = `${now.getMonth() + 1}月${now.getDate()}日 周${WEEKDAYS[now.getDay()]}`;
  const greet = document.getElementById('hero-greeting');
  if (greet) greet.textContent = greetingFor(now.getHours());
}

/** 常用磁贴行：SSG 默认集与「最近使用」合并去重（最近在前），上限 8 个 */
function renderQuickBar(): void {
  const bar = document.getElementById('quick-bar');
  const wrap = document.getElementById('quick-tiles');
  if (!bar || !wrap) return;
  const recents = loadRecents();
  const defaults = [...wrap.querySelectorAll<HTMLAnchorElement>('a[data-quick-default]')];
  if (recents.length === 0 && defaults.length === 0) {
    bar.hidden = true;
    return;
  }
  const seen = new Set<string>();
  const tiles: HTMLAnchorElement[] = [];
  const push = (r: RecentSite) => {
    if (seen.has(r.url) || tiles.length >= MAX_SHOW) return;
    seen.add(r.url);
    const a = document.createElement('a');
    a.href = r.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.dataset.title = r.title;
    a.dataset.icon = r.icon;
    a.title = r.title;
    a.className = 'quick-tile';
    a.innerHTML = quickTileInner(r.title, r.icon);
    tiles.push(a);
  };
  recents.slice(0, MAX_SHOW).forEach(push);
  for (const el of defaults) {
    if (tiles.length >= MAX_SHOW) break;
    if (seen.has(el.href)) continue;
    seen.add(el.href);
    tiles.push(el);
  }
  wrap.replaceChildren(...tiles);
  bar.hidden = false;
  // 磁贴重排只改 scrollWidth 不触发 ResizeObserver，需手动重算端缘渐隐；监听只挂一次
  if (stopQuickFade) updateScrollFade(bar);
  else stopQuickFade = watchScrollFade(bar);
}

/** 记录一次站点打开，返回展示顺序是否变化 */
function recordRecent(el: HTMLAnchorElement): boolean {
  const title = el.dataset.title;
  const icon = el.dataset.icon;
  const url = el.href;
  if (!title || !icon || !/^https?:/.test(url)) return false;
  const prev = loadRecents();
  const rest = prev.filter((r) => r.url !== url);
  storageSetJson(RECENT_KEY, [{ url, title, icon }, ...rest].slice(0, MAX_STORE));
  return prev.length === 0 || prev[0].url !== url;
}

let inited = false;
let stopQuickFade: (() => void) | null = null;

export function initNavHero(): void {
  if (inited) return;
  inited = true;
  renderHeroClock();
  setInterval(renderHeroClock, 1000);
  renderQuickBar();
  // 卡片/搜索结果/常用行都是 a[data-title]，统一在这里记账
  document.addEventListener('click', (e) => {
    if (!(e.target instanceof Element)) return;
    const el = e.target.closest<HTMLAnchorElement>('a[data-title]');
    if (!el) return;
    if (recordRecent(el)) setTimeout(renderQuickBar, 0);
  });
}
