/**
 * 顶部栏快速工具下拉（<div data-menu> 增强，无自定义元素注册）
 * - 主要交互为 hover：指针悬停立即展开，移出（含到面板外）短暂延迟后收起
 * - 点击按钮仍可开/合（触摸屏等无 hover 场景 + 键盘可达性）；点击面板外 / Esc 关闭
 * - 同组互斥：开一个自动关其他
 * 面板显隐走 global.css 的 [data-menu-panel] 过渡，此处只切 .open + aria-expanded。
 */
const PANEL_ATTR = 'data-menu-panel';
const BTN_ATTR = 'data-menu-btn';
const ITEM_ATTR = 'data-menu-item';
/** 移出后延迟关闭：给指针从按钮经过 6px 间隙到面板留时间 */
const LEAVE_DELAY_MS = 150;

const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-menu]'));

/** 每个根的收起定时器 */
const timers = new Map<HTMLElement, number>();

function isOpen(root: HTMLElement): boolean {
  return !!root.querySelector<HTMLElement>(`[${PANEL_ATTR}]`)?.classList.contains('open');
}

function openRoot(root: HTMLElement): void {
  if (isOpen(root)) return;
  roots.forEach(closeRoot); // 同组互斥
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

// 模块脚本按 defer 执行，TopBar 静态标记已就绪
roots.forEach((root) => {
  const btn = root.querySelector<HTMLButtonElement>(`button[${BTN_ATTR}]`);
  const panel = root.querySelector<HTMLElement>(`[${PANEL_ATTR}]`);
  if (!btn || !panel) return;

  // hover 开 / 移出收（面板与按钮都在 root 内，移入面板不会触发 leave）
  root.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch') return;
    cancelClose(root);
    if (!isOpen(root)) openRoot(root);
  });
  root.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'touch') return;
    if (isOpen(root)) scheduleClose(root);
  });

  // 点击仅负责“打开”（触摸屏 tap 先于 hover 打开它）；已在展开态时点击不再收起，
  // 避免桌面 hover 展开后一点按钮就关闭。收起走移出/外点/Esc/选中项。
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!isOpen(root)) openRoot(root);
  });

  // 选中某项后收起（新标签页打开仍先收起）
  root.addEventListener('click', (e) => {
    if ((e.target as Element).closest(`[${ITEM_ATTR}]`)) closeAll();
  });
});

// 点击面板外部任意处一律收起
document.addEventListener('click', () => closeAll());

// Esc：收起并还焦给当前展开按钮
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const opener = roots
    .find(isOpen)
    ?.querySelector<HTMLElement>(`[${BTN_ATTR}]`);
  closeAll();
  opener?.focus();
});
