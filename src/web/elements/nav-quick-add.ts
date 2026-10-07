/** <nav-quick-add>：添加快捷方式对话框；图标解析 上传 > 站内收录（同 host 复用） > unavatar 抓取 > 首字母兜底 */
import { iconEl } from '../icons';
import {
  MAX_PINS,
  QUICK_ADD_OPEN_EVENT,
  QUICK_STORE_CHANGED_EVENT,
  loadPins,
  normalizeUrl,
  savePins,
  type QuickSite,
} from '../quick-bar/quick-store';
import type { SiteRecord } from '../search-utils';
import { siteIconHtml } from '../site-icon';

const MAX_ICON_PX = 96;
const MAX_FILE_BYTES = 2 * 1024 * 1024;

/** 位图压成 96px 正方形 PNG dataURL（contain 居中，透明底）；createImageBitmap 不支持 SVG，原样转 dataURL */
async function fileToIcon(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('unsupported type');
  if (file.size > MAX_FILE_BYTES) throw new Error('too large');
  if (file.type === 'image/svg+xml') {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('read failed'));
      reader.readAsDataURL(file);
    });
  }
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = MAX_ICON_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  const scale = Math.min(MAX_ICON_PX / bmp.width, MAX_ICON_PX / bmp.height);
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, (MAX_ICON_PX - w) / 2, (MAX_ICON_PX - h) / 2, w, h);
  bmp.close();
  return canvas.toDataURL('image/png');
}

function stripWww(host: string): string {
  return host.replace(/^www\./, '');
}

const INPUT_CLS =
  'quick-field min-w-0 flex-1 rounded-lg border border-line bg-field px-3 py-2 text-sm text-ink placeholder:text-muted';

class NavQuickAdd extends HTMLElement {
  private dlg: HTMLDialogElement | null = null;
  private opener: HTMLElement | null = null;
  private uploadedIcon = '';
  private previewTimer: ReturnType<typeof setTimeout> | null = null;

  connectedCallback(): void {
    this.innerHTML = `
      <dialog class="m-auto w-[min(90vw,24rem)] rounded-2xl border border-line bg-float backdrop-blur-md p-5 text-ink shadow-(--shadow-menu) backdrop:bg-black/40">
        <div class="flex items-center justify-between gap-4">
          <h3 class="text-base font-semibold">添加快捷方式</h3>
          <button type="button" data-role="close" class="shrink-0 text-muted transition-colors hover:text-ink" aria-label="关闭">
            ${iconEl('x', 'h-5 w-5')}
          </button>
        </div>
        <form data-role="form" class="mt-4" novalidate>
          <div class="flex items-center gap-3">
            <span class="w-13 shrink-0 text-right text-dense text-muted">网址：</span>
            <input data-role="url" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://example.com" aria-label="网址" class="${INPUT_CLS}" />
          </div>
          <div class="mt-3 flex items-center gap-3">
            <span class="w-13 shrink-0 text-right text-dense text-muted">名称：</span>
            <input data-role="title" type="text" maxlength="20" autocomplete="off" spellcheck="false" placeholder="留空则取域名" aria-label="名称" class="${INPUT_CLS}" />
          </div>
          <div class="mt-3 flex items-center gap-3">
            <span class="w-13 shrink-0 text-right text-dense text-muted">图标：</span>
            <span data-role="preview" class="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-surface"></span>
            <input data-role="file" type="file" accept="image/*" class="hidden" />
            <span class="min-w-0 truncate text-note text-muted" title="留空自动抓取；站内已收录的站点会复用其图标">留空自动抓取</span>
          </div>
          <p data-role="err" class="mt-2.5 hidden text-note text-danger"></p>
          <div class="mt-5 flex items-center gap-2">
            <button type="button" data-role="pick" class="btn-outline flex-1 rounded-xl py-2 text-sm">上传图片</button>
            <button type="submit" class="btn-brand flex-1 rounded-xl py-2 text-sm">添加</button>
          </div>
        </form>
      </dialog>`;

    this.dlg = this.querySelector('dialog');
    this.dlg?.addEventListener('click', (e) => {
      if (e.target === this.dlg) this.dlg?.close();
    });
    this.dlg?.addEventListener('close', () => this.opener?.focus({ preventScroll: true }));
    this.querySelectorAll('[data-role="close"]').forEach((btn) =>
      btn.addEventListener('click', () => this.dlg?.close()),
    );
    this.querySelector('[data-role="form"]')?.addEventListener('submit', (e) => this.onSubmit(e));
    this.querySelector('[data-role="pick"]')?.addEventListener('click', () =>
      this.querySelector<HTMLInputElement>('[data-role="file"]')?.click(),
    );
    this.querySelector('[data-role="file"]')?.addEventListener('change', (e) => {
      const input = e.target as HTMLInputElement;
      void this.onPickFile(input.files?.[0]);
      input.value = '';
    });
    for (const role of ['url', 'title']) {
      this.querySelector(`[data-role="${role}"]`)?.addEventListener('input', () => {
        if (this.previewTimer) clearTimeout(this.previewTimer);
        this.previewTimer = setTimeout(() => this.refreshPreview(), 250);
      });
    }

    document.addEventListener(QUICK_ADD_OPEN_EVENT, this.onOpenEvent);
  }

  disconnectedCallback(): void {
    document.removeEventListener(QUICK_ADD_OPEN_EVENT, this.onOpenEvent);
  }

  private onOpenEvent = (e: Event): void => {
    this.opener = (e as CustomEvent<{ opener?: HTMLElement }>).detail?.opener ?? null;
    this.open();
  };

  private open(): void {
    if (!this.dlg || this.dlg.open) return;
    this.uploadedIcon = '';
    this.querySelector<HTMLInputElement>('[data-role="url"]')!.value = '';
    this.querySelector<HTMLInputElement>('[data-role="title"]')!.value = '';
    this.querySelector('[data-role="preview"]')!.innerHTML = '';
    this.hideErr();
    this.dlg.showModal();
    this.querySelector<HTMLInputElement>('[data-role="url"]')?.focus();
  }

  private async onPickFile(file: File | undefined): Promise<void> {
    if (!file) return;
    try {
      this.uploadedIcon = await fileToIcon(file);
      this.hideErr();
      this.refreshPreview();
    } catch {
      this.uploadedIcon = '';
      this.showErr('图片读取失败：需 2MB 内的图片文件');
    }
  }

  private refreshPreview(): void {
    const preview = this.querySelector('[data-role="preview"]');
    if (!preview) return;
    const raw = this.querySelector<HTMLInputElement>('[data-role="url"]')?.value.trim() ?? '';
    const title = this.querySelector<HTMLInputElement>('[data-role="title"]')?.value.trim() ?? '';
    const icon = raw ? this.iconFor(raw) : this.uploadedIcon;
    preview.innerHTML = icon
      ? siteIconHtml(icon, title || '预览', 'h-10 w-10 rounded-xl object-cover', { alt: '', size: 40 })
      : '';
  }

  /** 站内收录匹配按去 www 的 host 相等；未命中走 unavatar 聚合抓取 */
  private iconFor(rawUrl: string): string {
    if (this.uploadedIcon) return this.uploadedIcon;
    let host = '';
    try {
      host = stripWww(new URL(rawUrl).hostname);
    } catch {
      return '';
    }
    if (!host) return '';
    const hit = this.readSiteIndex().find((r) => {
      try {
        return stripWww(new URL(r.url).hostname) === host;
      } catch {
        return false;
      }
    });
    return hit ? hit.icon : `https://unavatar.webp.se/google/${host}?w=96`;
  }

  private readSiteIndex(): SiteRecord[] {
    try {
      const el = document.getElementById('site-index');
      return el?.textContent ? (JSON.parse(el.textContent) as SiteRecord[]) : [];
    } catch {
      return [];
    }
  }

  private onSubmit(e: Event): void {
    e.preventDefault();
    const raw = this.querySelector<HTMLInputElement>('[data-role="url"]')?.value.trim() ?? '';
    if (!raw) return this.showErr('请填写网址');
    const url = normalizeUrl(raw);
    if (!url) return this.showErr('网址格式不对，需要 http(s) 链接');
    const pins = loadPins();
    if (pins.some((p) => p.url === url)) return this.showErr('该网址已在磁贴中');
    if (pins.length >= MAX_PINS) return this.showErr(`最多固定 ${MAX_PINS} 个，先取消一个再试`);
    const title =
      this.querySelector<HTMLInputElement>('[data-role="title"]')?.value.trim() ||
      stripWww(new URL(url).hostname);
    const item: QuickSite = { url, title, icon: this.iconFor(url) };
    if (!savePins([item, ...pins])) return this.showErr('保存失败，浏览器存储空间不足');
    document.dispatchEvent(new CustomEvent(QUICK_STORE_CHANGED_EVENT));
    this.dlg?.close();
  }

  private showErr(msg: string): void {
    const el = this.querySelector('[data-role="err"]');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  private hideErr(): void {
    this.querySelector('[data-role="err"]')?.classList.add('hidden');
  }
}

customElements.define('nav-quick-add', NavQuickAdd);
