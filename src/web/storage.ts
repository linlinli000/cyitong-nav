/** localStorage 安全读写：storageGet/Set 存字符串原值，Json 变体序列化结构数据。被禁用或损坏时静默回退 */

export function storageGet(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function storageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export function storageGetJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function storageSetJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
