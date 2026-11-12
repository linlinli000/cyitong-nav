/** 浮层贴边定位：夹进视口 + 放不下翻转 */
export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** 锚点下方居中放置，放不下翻到上方 */
export function placeBelow(
  anchor: DOMRect,
  width: number,
  height: number,
  gap = 6,
  pad = 8,
): { left: number; top: number; side: 'bottom' | 'top' } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const below = anchor.bottom + gap + height <= vh - pad;
  const above = anchor.top - gap - height >= pad;
  const side: 'bottom' | 'top' =
    below ? 'bottom' : above ? 'top' : anchor.top > vh - anchor.bottom ? 'top' : 'bottom';
  const top = clamp(
    side === 'bottom' ? anchor.bottom + gap : anchor.top - gap - height,
    pad,
    Math.max(pad, vh - pad - height),
  );
  const left = clamp(
    anchor.left + anchor.width / 2 - width / 2,
    pad,
    Math.max(pad, vw - pad - width),
  );
  return { left, top, side };
}
