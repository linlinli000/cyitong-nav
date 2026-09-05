/** TopBar 快捷下拉（div[data-menu] 增强）*/
const PANEL_ATTR = 'data-menu-panel';
const BTN_ATTR = 'data-menu-btn';
const ITEM_ATTR = 'data-menu-item';
const LEAVE_DELAY_MS = 150;

const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-menu]'));
const timers = new Map<HTMLElement, number>();

function isOpen(root: HTMLElement): boolean {
  return !!root.querySelector<HTMLElement>(`[${PANEL_ATTR}]`)?.classList.contains('open');
}

function openRoot(root: HTMLElement): void {
  if (isOpen(root)) return;
  roots.forEach(closeRoot);
  root.querySelector<HTMLElement>(`[${PANEL_ATTR}]`)?.classList.add('open');
  root.querySelector<HTMLElement>(`[${BTN_ATTR}]`)?.setAttribute('aria-expanded', 'true');
}

function closeRoot(root: HTMLElement): void {
  const t = timers.get(root);
  if (t !== undefined) {
    window.clearTimeout(t);
    timers.delete(root);
  }
  root.querySelector<HTMLElement>(`[${PANEL_ATTR}]`)?.classList.remove('open');
  root.querySelector<HTMLElement>(`[${BTN_ATTR}]`)?.setAttribute('aria-expanded', 'false');
}

function closeAll(): void {
  roots.forEach(closeRoot);
}

function scheduleClose(root: HTMLElement): void {
  const t = timers.get(root);
  if (t !== undefined) window.clearTimeout(t);
  timers.set(
    root,
    window.setTimeout(() => closeRoot(root), LEAVE_DELAY_MS),
  );
}

function cancelClose(root: HTMLElement): void {
  const t = timers.get(root);
  if (t !== undefined) {
    window.clearTimeout(t);
    timers.delete(root);
  }
}

roots.forEach((root) => {
  const btn = root.querySelector<HTMLButtonElement>(`button[${BTN_ATTR}]`);
  const panel = root.querySelector<HTMLElement>(`[${PANEL_ATTR}]`);
  if (!btn || !panel) return;

  root.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch') return;
    cancelClose(root);
    if (!isOpen(root)) openRoot(root);
  });
  root.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'touch') return;
    if (isOpen(root)) scheduleClose(root);
  });

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!isOpen(root)) openRoot(root);
  });

  root.addEventListener('click', (e) => {
    if ((e.target as Element).closest(`[${ITEM_ATTR}]`)) closeAll();
  });
});

document.addEventListener('click', () => closeAll());

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const opener = roots
    .find(isOpen)
    ?.querySelector<HTMLElement>(`[${BTN_ATTR}]`);
  closeAll();
  opener?.focus();
});
