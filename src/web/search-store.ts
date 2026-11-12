/** 搜索历史/引擎/类型的 localStorage 读写：nav-search 与历史面板共用键与读取口径 */
import { ENGINES, type SearchScope } from '../config/search-engines';
import { storageGetJson, storageSetJson } from './storage';

export const MAX_HISTORY = 10;

const historyKey = (s: SearchScope): string => `nav:history:${s}`;
const engineKey = (s: SearchScope): string => `nav:engine:${s}`;
const modeKey = (s: SearchScope, e: number): string => `nav:mode:${s}:${e}`;

/** 读取口径：滤掉非字符串与纯空白条目，面板与下拉保持一致 */
export function readHistory(scope: SearchScope): string[] {
  const h = storageGetJson<string[]>(historyKey(scope), []);
  return Array.isArray(h)
    ? h.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    : [];
}

export function writeHistory(scope: SearchScope, items: string[]): void {
  storageSetJson(historyKey(scope), items);
}

/** 去重置顶并截断，返回新列表供调用方同步内存态 */
export function pushHistory(scope: SearchScope, q: string, current: string[]): string[] {
  const next = [q, ...current.filter((h) => h !== q)].slice(0, MAX_HISTORY);
  writeHistory(scope, next);
  return next;
}

export function loadEngineIdx(scope: SearchScope): number {
  const idx = storageGetJson<number>(engineKey(scope), 0);
  const len = ENGINES[scope]?.length ?? 0;
  return typeof idx === 'number' && idx >= 0 && idx < len ? idx : 0;
}

export function saveEngineIdx(scope: SearchScope, idx: number): void {
  storageSetJson(engineKey(scope), idx);
}

export function loadModeIdx(scope: SearchScope, engine: number): number {
  const idx = storageGetJson<number>(modeKey(scope, engine), 0);
  const len = ENGINES[scope]?.[engine]?.modes?.length ?? 0;
  return typeof idx === 'number' && idx >= 0 && idx < len ? idx : 0;
}

export function saveModeIdx(scope: SearchScope, engine: number, idx: number): void {
  storageSetJson(modeKey(scope, engine), idx);
}