/** <nav-dialog>：文档级拦截 a[data-entries]/a[data-qr] 点击 → 入口/二维码弹窗 */
import { escapeHtml } from '../html-escape';
import type { Entry } from '../../content.config';
import { iconEl } from '../icons';
import { NAV_OPEN_CARD_EVENT, toCardDataFromDataset, type CardData } from '../card-attrs';

class NavDialog extends HTMLElement {
  private dlg: HTMLDialogElement | null = null;

  private onDocClick = (e: MouseEvent): void => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-entries], a[data-qr]');
    if (!a) return;
    e.preventDefault();
    this.openFromData(toCardDataFromDataset(a.dataset));
  };

  private onOpenCard = (e: Event): void => {
    e.preventDefault();
    this.openFromData((e as CustomEvent<CardData>).detail);
  };

  private openFromData(d: CardData): void {
    if (d.entries) {
      try {
        const entries = JSON.parse(d.entries) as Entry[];
        if (entries.length) {
          this.openEntries(d.title, d.icon, entries);
          return;
        }
      } catch {}
    }
    if (d.qr) void this.openQr(d.title, d.icon, d.qr, d.qrNote);
  }

  connectedCallback(): void {
    this.innerHTML = `
      <dialog class="m-auto w-[min(90vw,22rem)] rounded-2xl border border-line bg-card p-5 text-ink shadow-[var(--shadow-menu)] backdrop:bg-black/50">
        <div class="flex items-center justify-between gap-4">
          <div class="flex min-w-0 items-center gap-2">
            <img data-role="icon" alt="" class="hidden h-6 w-6 shrink-0 rounded-md object-contain">
            <h3 data-role="title" class="truncate text-base font-semibold"></h3>
          </div>
          <button type="button" data-role="close" class="shrink-0 text-muted transition-colors hover:text-ink" aria-label="关闭">
            ${iconEl('x', 'h-5 w-5')}
          </button>
        </div>
        <div data-role="body" class="mt-4"></div>
      </dialog>`;

    this.dlg = this.querySelector('dialog');
    this.dlg!.addEventListener('click', (e) => {
      if (e.target === this.dlg) this.dlg?.close();
    });
    this.querySelectorAll('[data-role="close"]').forEach((btn) =>
      btn.addEventListener('click', () => this.dlg?.close()),
    );

    document.addEventListener('click', this.onDocClick);
    document.addEventListener(NAV_OPEN_CARD_EVENT, this.onOpenCard);
  }

  disconnectedCallback(): void {
    document.removeEventListener('click', this.onDocClick);
    document.removeEventListener(NAV_OPEN_CARD_EVENT, this.onOpenCard);
  }

  private setHeader(title: string, icon: string): void {
    const t = this.dlg!.querySelector('[data-role="title"]')!;
    t.textContent = title;
    const img = this.dlg!.querySelector<HTMLImageElement>('[data-role="icon"]')!;
    img.alt = title;
    if (icon) {
      img.src = icon;
      img.classList.remove('hidden');
    } else {
      img.removeAttribute('src');
      img.classList.add('hidden');
    }
  }

  private async openQr(title: string, icon: string, url: string, note?: string): Promise<void> {
    this.setHeader(title, icon);
    const body = this.dlg!.querySelector('[data-role="body"]')!;
    body.innerHTML = '';
    const go = document.createElement('a');
    go.href = url;
    go.target = '_blank';
    go.rel = 'noopener noreferrer';
    go.title = url;
    go.className =
      'mb-3 flex items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-ink transition-colors hover:border-brand sm:hidden';
    go.innerHTML = `
      <span class="min-w-0">
        <span class="block truncate text-sm font-medium">移动端点击此处打开链接</span>
        <span class="block truncate text-xs text-muted">${escapeHtml(url)}</span>
      </span>
      <span class="shrink-0 text-brand">↗</span>`;
    body.appendChild(go);
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
      const { default: QRCode } = await import('qrcode');
      img.src = await QRCode.toDataURL(url, { width: 256, margin: 1, errorCorrectionLevel: 'M' });
    } catch {
      body.innerHTML = '<p class="py-8 text-center text-sm text-muted">二维码生成失败</p>';
    }
    if (!this.dlg!.open) this.dlg!.showModal();
  }

  private openEntries(title: string, icon: string, entries: Entry[]): void {
    this.setHeader(title, icon);
    this.dlg!.querySelector('[data-role="body"]')!.innerHTML = `
      <ul class="space-y-2">
        ${entries
          .map(
            (entry) => `
          <li>
            <a href="${escapeHtml(entry.url)}" target="_blank" rel="noopener noreferrer"
              class="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-ink transition-colors hover:border-brand">
              <span class="min-w-0" title="${escapeHtml(entry.url)}">
                <span class="block truncate text-sm font-medium">${escapeHtml(entry.label)}</span>
                <span class="block truncate text-xs text-muted">${escapeHtml(entry.url)}</span>
              </span>
              <span class="shrink-0 text-brand">↗</span>
            </a>
          </li>`,
          )
          .join('')}
      </ul>`;
    if (!this.dlg!.open) this.dlg!.showModal();
  }
}

customElements.define('nav-dialog', NavDialog);
