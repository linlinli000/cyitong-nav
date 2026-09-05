/**
 * <nav-dialog> 弹窗：二维码（qrcode 包生成）+ 镜像站列表
 * 通过文档级事件委托拦截所有 a[data-mirrors] / a[data-qr] 点击（含搜索结果与网格卡片）。
 */
import QRCode from 'qrcode';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]!);
}

const CLOSE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>';

class NavDialog extends HTMLElement {
  private dlg: HTMLDialogElement | null = null;

  private onDocClick = (e: MouseEvent): void => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-mirrors], a[data-qr]');
    if (!a) return;
    e.preventDefault();
    const title = a.dataset.title ?? '链接';

    if (a.dataset.mirrors) {
      try {
        const mirrors = JSON.parse(a.dataset.mirrors) as { label: string; url: string }[];
        if (mirrors.length) {
          this.openMirrors(title, mirrors);
          return;
        }
      } catch {
        /* 非法 JSON：回退到二维码或默认跳转 */
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
            ${CLOSE_SVG}
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

  private openMirrors(title: string, mirrors: { label: string; url: string }[]): void {
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
