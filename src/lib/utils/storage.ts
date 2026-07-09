export function safeGet<T>(key: string, def: T): T {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : def;
  } catch { return def; }
}

export function safeSet(key: string, val: unknown): void {
  try {
    localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
  } catch { /* storage full or disabled */ }
}
