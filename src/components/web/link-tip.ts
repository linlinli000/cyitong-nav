/** 链接卡简介浮层：单例按视口空间自动上/下 + 三角指向卡片 */
const TILE_SEL = 'a.link-tile[data-desc]';
const HIDE_DELAY_MS = 90;
const GAP = 4;
const PAD = 8;
const ARROW_INSET = 10;

let pop: HTMLDivElement | null = null;
let hover: HTMLElement | null = null;
let shown: HTMLElement | null = null;
let hideTimer = 0;

function ensurePop(): HTMLDivElement {
  if (!pop) {
    pop = document.createElement('div');
    pop.className = 'link-tip-pop';
    pop.setAttribute('role', 'tooltip');
    document.body.appendChild(pop);
  }
  return pop;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function hide(): void {
  window.clearTimeout(hideTimer);
  if (!shown) return;
  shown = null;
  pop?.classList.remove('show');
}

function show(tile: HTMLElement): void {
  const desc = tile.dataset.desc;
  if (!desc) return;
  const p = ensurePop();
  p.textContent = desc;
  p.style.left = '-9999px';
  p.style.top = '0px';
  p.style.visibility = 'hidden';
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const ph = p.offsetHeight;
  const pw = p.offsetWidth;
  const r = tile.getBoundingClientRect();
  const roomBelow = vh - r.bottom - GAP - PAD;
  const roomAbove = r.top - GAP - PAD;
  const side = roomBelow >= ph ? 'bottom' : roomAbove >= ph ? 'top' : roomAbove > roomBelow ? 'top' : 'bottom';
  p.dataset.side = side;
  let top = side === 'bottom' ? r.bottom + GAP : r.top - GAP - ph;
  top = clamp(top, PAD, Math.max(PAD, vh - PAD - ph));
  const left = clamp(r.left + r.width / 2 - pw / 2, PAD, Math.max(PAD, vw - PAD - pw));
  const ax = clamp(r.left + r.width / 2 - left, ARROW_INSET, Math.max(ARROW_INSET, pw - ARROW_INSET));
  p.style.left = `${left}px`;
  p.style.top = `${top}px`;
  p.style.setProperty('--ax', `${ax}px`);
  p.style.visibility = '';
  shown = tile;
  p.classList.add('show');
}

function scheduleHide(): void {
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(hide, HIDE_DELAY_MS);
}

document.addEventListener(
  'pointerover',
  (e) => {
    if ((e as PointerEvent).pointerType && (e as PointerEvent).pointerType !== 'mouse') return;
    const tile = (e.target as Element).closest<HTMLElement>(TILE_SEL);
    if (tile === hover) return;
    hover = tile;
    window.clearTimeout(hideTimer);
    if (tile) show(tile);
    else scheduleHide();
  },
  { passive: true },
);

document.addEventListener('pointerout', (e) => {
  const from = (e.target as Element).closest<HTMLElement>(TILE_SEL);
  if (!from) return;
  const to = (e.relatedTarget as Element | null)?.closest?.<HTMLElement>(TILE_SEL);
  if (!to) scheduleHide();
});

document.addEventListener('focusin', (e) => {
  const tile = (e.target as Element).closest<HTMLElement>(TILE_SEL);
  if (!tile) return;
  window.clearTimeout(hideTimer);
  show(tile);
});

document.addEventListener('focusout', (e) => {
  const from = (e.target as Element).closest<HTMLElement>(TILE_SEL);
  if (!from) return;
  const to = (e.relatedTarget as Element | null)?.closest?.<HTMLElement>(TILE_SEL);
  if (!to) hide();
});

document.addEventListener(
  'scroll',
  () => {
    hover = null;
    hide();
  },
  { passive: true, capture: true },
);
window.addEventListener('resize', hide);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hide();
});
