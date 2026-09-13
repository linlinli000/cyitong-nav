import type { Entry } from '../content.config';
import { escapeHtml } from './html-escape';

export interface CardData {
  title: string;
  icon: string;
  qr?: string;
  qrNote?: string;
  entries?: string;
}

export const NAV_OPEN_CARD_EVENT = 'nav-open-card';

export interface CardSource {
  title: string;
  url: string;
  icon: string;
  qr?: boolean;
  qrNote?: string;
  entries?: Entry[];
}

const HTML_ATTR: Record<keyof CardData, string> = {
  title: 'data-title',
  icon: 'data-icon',
  qr: 'data-qr',
  qrNote: 'data-qr-note',
  entries: 'data-entries',
};

export function toCardData(src: CardSource): CardData {
  const hasQr = !!src.qr;
  return {
    title: src.title,
    icon: src.icon,
    qr: hasQr ? src.url : undefined,
    qrNote: hasQr ? src.qrNote : undefined,
    entries: src.entries?.length ? JSON.stringify(src.entries) : undefined,
  };
}

/** 属性名 → 值（值 undefined 即不带属性）。SSR 用 {...} 展开，字符串拼 DOM 用 toCardDataHtml */
export function toDataAttrs(data: CardData): Record<string, string> {
  const out: Record<string, string> = {};
  (Object.keys(HTML_ATTR) as (keyof CardData)[]).forEach((k) => {
    const v = data[k];
    if (v !== undefined) out[HTML_ATTR[k]] = v;
  });
  return out;
}

export function toCardDataHtml(data: CardData): string {
  return Object.entries(toDataAttrs(data))
    .map(([k, v]) => ` ${k}="${escapeHtml(v)}"`)
    .join('');
}

export function toCardDataFromDataset(ds: DOMStringMap): CardData {
  return {
    title: ds.title ?? '链接',
    icon: ds.icon ?? '',
    qr: ds.qr || undefined,
    qrNote: ds.qrNote || undefined,
    entries: ds.entries || undefined,
  };
}
