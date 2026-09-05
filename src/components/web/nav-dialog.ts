/** <nav-dialog>：文档级拦截 a[data-mirrors]/a[data-qr] 点击 → 二维码/镜像弹窗（覆盖搜索与网格卡片） */
import QRCode from 'qrcode';
import { escapeHtml } from './html-escape';
import type { Mirror } from '../../content.config';
import { iconEl } from './icons';

class NavDialog extends HTMLElement {
  private dlg: HTMLDialogElement | null = null;

  private onDocClick = (e: MouseEvent): void => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-mirrors], a[data-qr]');
    if (!a) return;
    e.preventDefault();
    const title = a.dataset.title ?? '链接';

    if (a.dataset.mirrors) {
      try {
        const mirrors = JSON.parse(a.dataset.mirrors) as Mirror[];
        if (mirrors.length) {
          this.openMirrors(title, mirrors);
          return;
        }
      } catch {
        /* 非法 JSON：忽略镜像，继续走二维码 */
      }
    }
    if (a.dataset.qr) {
      void this.openQr(title, a.dataset.qr, a.dataset.qrNote);
    }
  };

  connectedCallback(): void {
    this.innerHTML = `
      <dialog class="m-auto w-[min(90vw,22rem)] rounded-2xl border border-line bg-card p-5 text-ink shadow-2xl backdrop:bg-black/50">
        <div class="flex items-center justify-between gap-4">
          <h3 data-role="title" class="truncate text-base font-semibold"></h3>
          <button type="button" data-role="close" class="shrink-0 text-muted transition-colors hover:text-ink" aria-label="关闭">
            ${iconEl('x', 'h-5 w-5')}
          </button>
        </div>
        <div data-role="body" class="mt-4"></div>
        <div class="mt-5 flex justify-end">
          <button type="button" data-role="close"
            class="rounded-lg bg-surface px-3 py-1.5 text-sm text-muted transition-colors hover:text-ink">关闭</button>
        </div>
      </dialog>`;

    this.dlg = this.querySelector('dialog');
    this.dlg!.addEventListener('click', (e) => {
      if (e.target === this.dlg) this.dlg?.close();
    });
    this.querySelectorAll('[data-role="close"]').forEach((btn) =>
      btn.addEventListener('click', () => this.dlg?.close()),
    );

    document.addEventListener('click', this.onDocClick);
  }

  disconnectedCallback(): void {
    document.removeEventListener('click', this.onDocClick);
  }

  private async openQr(title: string, url: string, note?: string): Promise<void> {
    this.dlg!.querySelector('[data-role="title"]')!.textContent = title;
    const body = this.dlg!.querySelector('[data-role="body"]')!;
    body.innerHTML = '';
    const img = document.createElement('img');
    img.alt = `${title} 二维码`;
    img.className = 'mx-auto h-64 w-64 rounded-xl bg-white p-2';
    body.appendChild(img);
    if (note) {
      const p = document.createElement('p');
      p.className = 'mt-3 text-center text-sm text-muted';
      p.textContent = note;
      body.appendChild(p);
    }
    try {
      img.src = await QRCode.toDataURL(url, { width: 256, margin: 1, errorCorrectionLevel: 'M' });
    } catch {
      body.innerHTML = '<p class="py-8 text-center text-sm text-muted">二维码生成失败</p>';
    }
    if (!this.dlg!.open) this.dlg!.showModal();
  }

  private openMirrors(title: string, mirrors: Mirror[]): void {
    this.dlg!.querySelector('[data-role="title"]')!.textContent = title;
    this.dlg!.querySelector('[data-role="body"]')!.innerHTML = `
      <ul class="space-y-2">
        ${mirrors
          .map(
            (m) => `
          <li>
            <a href="${escapeHtml(m.url)}" target="_blank" rel="noopener noreferrer"
              class="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink transition-colors hover:border-brand">
              <span>${escapeHtml(m.label)}</span>
              <span class="text-brand">↗</span>
            </a>
          </li>`,
          )
          .join('')}
      </ul>`;
    if (!this.dlg!.open) this.dlg!.showModal();
  }
}

customElements.define('nav-dialog', NavDialog);
