/** 站内搜索：多分隔符分词 + 多字段加权 + bigram-Dice 模糊回退 + 稳定排序 */

import type { Mirror } from '../../content.config';

export interface SiteRecord {
  id: string;
  title: string;
  pinyin: string;
  pinyinFirst: string;
  url: string;
  catId: string;
  catName: string;
  subName: string;
  qr?: boolean;
  qrNote?: string;
  mirrors?: Mirror[];
  icon: string;
}

const FIELD = { title: 100, cat: 45, sub: 40, pinyin: 30, first: 22, url: 18 } as const;

function bigramDice(a: string, b: string): number {
  if (a.length < 2 || b.length < 2) return 0;
  const grams = new Map<string, number>();
  for (let i = 0; i + 1 < a.length; i++) {
    const g = a.slice(i, i + 2);
    grams.set(g, (grams.get(g) ?? 0) + 1);
  }
  let overlap = 0;
  for (let i = 0; i + 1 < b.length; i++) {
    const g = b.slice(i, i + 2);
    const n = grams.get(g) ?? 0;
    if (n > 0) {
      overlap++;
      grams.set(g, n - 1);
    }
  }
  return (2 * overlap) / Math.max(1, a.length - 1 + b.length - 1);
}

function tokenScore(rec: SiteRecord, tok: string): number {
  const t = tok.toLowerCase();
  const title = rec.title.toLowerCase();

  if (title === t) return FIELD.title;
  if (title.startsWith(t)) return Math.round(FIELD.title * 0.8);
  if (title.includes(t)) return Math.round(FIELD.title * 0.55);

  if (rec.pinyinFirst.toLowerCase().startsWith(t)) return Math.round(FIELD.first * 0.9);
  if (rec.pinyin.toLowerCase().includes(t)) return FIELD.pinyin;

  if (rec.catName.toLowerCase().includes(t)) return FIELD.cat;
  if (rec.subName.toLowerCase().includes(t)) return FIELD.sub;

  if (t.length >= 3) {
    if (rec.url.toLowerCase().includes(t)) return FIELD.url;
    const dice = Math.max(bigramDice(title, t), bigramDice(rec.pinyin, t));
    if (dice >= 0.35) return Math.round(FIELD.title * 0.4 * dice);
  }

  return 0;
}

function tokenize(query: string): string[] {
  return query.toLowerCase().split(/[\s,，、;；.。]+/).filter(Boolean);
}

export function searchSites(records: SiteRecord[], query: string, limit = 30): SiteRecord[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const scored: { rec: SiteRecord; score: number }[] = [];
  for (const rec of records) {
    let score = 0;
    for (const tok of tokens) {
      const s = tokenScore(rec, tok);
      if (s === 0) {
        score = 0;
        break;
      }
      score += s;
    }
    if (score > 0) scored.push({ rec, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.rec.pinyinFirst.localeCompare(b.rec.pinyinFirst))
    .slice(0, limit)
    .map((x) => x.rec);
}
