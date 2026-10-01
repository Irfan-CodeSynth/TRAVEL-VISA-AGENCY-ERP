// Hand-rolled deterministic PRNG (no faker dependency).
// Same seed => same dataset on every run.

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  private next01: () => number;

  constructor(seed = 42) {
    this.next01 = mulberry32(seed);
  }

  next(): number {
    return this.next01();
  }

  int(min: number, max: number): number {
    return Math.floor(this.next01() * (max - min + 1)) + min;
  }

  float(min: number, max: number, decimals = 2): number {
    const v = this.next01() * (max - min) + min;
    const p = 10 ** decimals;
    return Math.round(v * p) / p;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next01() * arr.length)];
  }

  // Weighted pick: entries of [value, weight]
  weighted<T>(entries: readonly [T, number][]): T {
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = this.next01() * total;
    for (const [value, w] of entries) {
      r -= w;
      if (r <= 0) return value;
    }
    return entries[entries.length - 1][0];
  }

  chance(p: number): boolean {
    return this.next01() < p;
  }

  shuffle<T>(arr: readonly T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next01() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

// All timestamps derive from this single base so runs stay self-consistent.
export const DAY_MS = 86400000;
