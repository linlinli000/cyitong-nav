/** 图标加载失败换成同尺寸首字色块（客户端专用，委托 document 的 error） */
let registered = false;

export function registerLetterFallback(): void {
  if (registered) return;
  registered = true;
  document.addEventListener(
    'error',
    (e) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement) || !('letter' in img.dataset)) return;
      const s = document.createElement('span');
      s.className = `${img.className.replace(/\bobject-cover\b/, '')} icon-fallback`;
      s.textContent = img.dataset.letter ?? '·';
      s.style.fontSize = `${Math.max(12, Math.round((img.offsetHeight || 40) * 0.42))}px`;
      img.replaceWith(s);
    },
    true,
  );
}
