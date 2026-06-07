/** Dialog — 二维码弹窗 */

import type { LinkItem } from '../data/links';
import { iconSvg } from '../data/icons';

interface DialogState {
  overlay: HTMLElement;
  card: HTMLElement;
  title: HTMLElement;
  content: HTMLElement;
  qrcodeLibLoaded: boolean;
  qrcodeLoading: boolean;
}

const dialog: DialogState = {} as DialogState;

// 初始化弹窗
export function initDialog(): void {
  const overlay = document.createElement('div');
  overlay.id = 'dialog-overlay';
  overlay.className = 'hidden';
  overlay.innerHTML = `
    <div class="bg-mask"></div>
    <div id="dialog-card" class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 overflow-auto">
      <div class="flex items-center justify-between mb-4">
        <h4 id="dialog-title" class="text-base font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-2"></h4>
        <button id="dialog-close" class="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div id="dialog-content" class="text-sm text-gray-600 dark:text-slate-400"></div>
    </div>
  `;

  document.body.appendChild(overlay);

  dialog.overlay = overlay;
  dialog.card = overlay.querySelector('#dialog-card')!;
  dialog.title = overlay.querySelector('#dialog-title')!;
  dialog.content = overlay.querySelector('#dialog-content')!;

  overlay.querySelector('#dialog-close')!.addEventListener('click', closeDialog);
  overlay.querySelector('.bg-mask')!.addEventListener('click', closeDialog);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDialog();
  });
}

// 显示二维码弹窗
export function showQrDialog(link: LinkItem): void {
  dialog.title.innerHTML = `
    ${link.icon ? iconSvg(link.icon, 'w-5 h-5 text-primary') : ''}
    <span>${escapeHtml(link.title)}</span>
  `;

  dialog.content.innerHTML = `
    <p class="mb-4">${escapeHtml(link.qrNote || '请使用手机扫码访问')}</p>
    <div id="qrcode-container" class="flex justify-center"></div>
    <p class="mt-3 text-xs text-gray-400 dark:text-slate-500">
      <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener" class="text-primary hover:underline">
        或点击此处直接打开 →
      </a>
    </p>
  `;

  dialog.overlay.classList.remove('hidden');

  loadQRCode(link.url);
}

function closeDialog(): void {
  dialog.overlay.classList.add('hidden');
  dialog.title.innerHTML = '';
  dialog.content.innerHTML = '';
}

function loadQRCode(url: string): void {
  if (dialog.qrcodeLibLoaded) {
    generateQR(url);
    return;
  }

  // 脚本正在加载中，等待加载完成后直接用缓存生成
  if (dialog.qrcodeLoading) {
    const check = setInterval(() => {
      if (dialog.qrcodeLibLoaded) {
        clearInterval(check);
        generateQR(url);
      }
    }, 100);
    return;
  }

  dialog.qrcodeLoading = true;
  const script = document.createElement('script');
  script.src = 'https://lib.baomitu.com/qrcodejs/1.0.0/qrcode.min.js';
  script.onload = () => {
    dialog.qrcodeLibLoaded = true;
    dialog.qrcodeLoading = false;
    generateQR(url);
  };
  script.onerror = () => {
    dialog.qrcodeLoading = false;
    const container = document.getElementById('qrcode-container');
    if (container) {
      container.innerHTML = '<p class="text-red-400">二维码加载失败，请直接点击链接访问</p>';
    }
  };
  document.head.appendChild(script);
}

function generateQR(url: string): void {
  const container = document.getElementById('qrcode-container');
  if (!container) return;
  try {
    // @ts-expect-error QRCode CDN 加载
    new QRCode(container, {
      text: url,
      width: 200,
      height: 200,
      colorDark: '#1A5FA8',
      colorLight: '#ffffff',
    });
  } catch {
    container.innerHTML = `<p class="text-red-400">二维码生成失败<br><a href="${url}" target="_blank" class="text-primary hover:underline">直接访问 →</a></p>`;
  }
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
