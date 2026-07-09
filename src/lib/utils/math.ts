export function rnd(max: number, min = 0): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function evalBODMAS(nums: number[], ops: string[]): number {
  const n = nums.map(Number);
  const o = [...ops];
  let i = 0;
  while (i < o.length) {
    if (o[i] === '×' || o[i] === '*') {
      n[i] = n[i] * n[i + 1];
      n.splice(i + 1, 1); o.splice(i, 1);
    } else if (o[i] === '÷' || o[i] === '/') {
      n[i] = n[i] / n[i + 1];
      n.splice(i + 1, 1); o.splice(i, 1);
    } else { i++; }
  }
  let result = n[0];
  for (let j = 0; j < o.length; j++) {
    if (o[j] === '+') result += n[j + 1];
    else if (o[j] === '−' || o[j] === '-') result -= n[j + 1];
  }
  return result;
}

export function opSymbol(op: string): string {
  const map: Record<string, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' };
  return map[op] || op;
}

export function computeCustomAns(f: { a: number; b: number; op: string }): number {
  if (f.op === '+') return f.a + f.b;
  if (f.op === '-') return f.a - f.b;
  if (f.op === '*') return f.a * f.b;
  if (f.op === '/') return Math.round(f.a / f.b);
  return f.a * f.b;
}
