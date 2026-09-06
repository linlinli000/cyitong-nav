/** 站内搜索：归一化分词 + 多字段加权 + 首字母宽容匹配 + 语义 tiebreak + bigram-Dice 模糊回退 */

import type { Mirror } from '../../content.config';

export interface SiteRecord {
  id: string;
  title: string;
  desc: string;
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

const FIELD = { title: 100, cat: 33, sub: 47, pinyin: 30, desc: 24, url: 18 } as const;

const FULLWIDTH = /[！-～]/g;
const SPACES = /[　 ]/g;

function toHalf(s: string): string {
  return s
    .replace(FULLWIDTH, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(SPACES, ' ');
}

function norm(s: string): string {
  return toHalf(s).toLowerCase();
}

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

function isSubseq(s: string, q: string): boolean {
  let i = 0;
  for (const ch of s) {
    if (ch === q[i]) i++;
    if (i === q.length) return true;
  }
  return i === q.length;
}

function tokenScore(rec: SiteRecord, tok: string): number {
  const t = tok;
  const title = norm(rec.title);

  if (title === t) return FIELD.title;
  if (title.startsWith(t)) return Math.round(FIELD.title * 0.8);
  if (title.includes(t)) return Math.round(FIELD.title * 0.55);

  const fi = norm(rec.pinyinFirst);
  if (fi.startsWith(t)) return 32;
  if (t.length >= 2 && fi.includes(t)) return 24;
  if (t.length >= 2 && isSubseq(fi, t)) return 15;

  if (norm(rec.pinyin).includes(t)) return FIELD.pinyin;

  if (norm(rec.subName).includes(t)) return FIELD.sub;
  if (norm(rec.catName).includes(t)) return FIELD.cat;
  if (norm(rec.desc).includes(t)) return FIELD.desc;

  if (t.length >= 3) {
    if (norm(rec.url).includes(t)) return FIELD.url;
    const dice = Math.max(bigramDice(title, t), bigramDice(norm(rec.pinyin), t));
    if (dice >= 0.35) return Math.round(FIELD.title * 0.28 * dice);
  }

  return 0;
}

function extraHits(rec: SiteRecord, tok: string): number {
  const t = tok;
  let n = 0;
  if (norm(rec.title).includes(t)) n++;
  if (norm(rec.pinyinFirst).includes(t)) n++;
  if (norm(rec.pinyin).includes(t)) n++;
  if (norm(rec.catName).includes(t)) n++;
  if (norm(rec.subName).includes(t)) n++;
  if (norm(rec.desc).includes(t)) n++;
  if (t.length >= 3 && norm(rec.url).includes(t)) n++;
  return n;
}

export function queryTokens(query: string): string[] {
  return norm(query).split(/[\s,，、;；。]+/).filter(Boolean);
}

export function searchSites(records: SiteRecord[], query: string, limit = 30): SiteRecord[] {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return [];

  const scored: { rec: SiteRecord; score: number; extra: number }[] = [];
  for (const rec of records) {
    let score = 0;
    let extra = 0;
    for (const tok of tokens) {
      const s = tokenScore(rec, tok);
      if (s === 0) {
        score = 0;
        break;
      }
      score += s;
      extra += extraHits(rec, tok);
    }
    if (score > 0) scored.push({ rec, score, extra });
  }

  return scored
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.extra - a.extra ||
        norm(a.rec.pinyinFirst).localeCompare(norm(b.rec.pinyinFirst)),
    )
    .slice(0, limit)
    .map((x) => x.rec);
}
