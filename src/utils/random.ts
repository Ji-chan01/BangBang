/**
 * Seeded pseudo-random number generator (PRNG).
 *
 * WHY: We need deterministic randomness for:
 * 1. Unit tests — same seed produces same results every run.
 * 2. Multiplayer — both peers generate the same arena from the same seed.
 * 3. Replay — a match can be replayed from its seed.
 *
 * ALGORITHM: "mulberry32" — a fast 32-bit PRNG with good distribution.
 * Not cryptographically secure, but perfect for games.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0; // Force integer
  }

  /** Returns a float in [0, 1). Same as Math.random() but deterministic. */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns an integer in [min, max] (inclusive). */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Returns a float in [min, max). */
  float(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /** Returns true with the given probability (0–1). */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /** Pick a random element from an array. */
  pick<T>(array: readonly T[]): T {
    const item = array[this.int(0, array.length - 1)];
    if (item === undefined) {
      throw new Error('Cannot pick from empty array');
    }
    return item;
  }

  /** Shuffle an array in place (Fisher-Yates). */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      const temp = array[i]!;
      array[i] = array[j]!;
      array[j] = temp;
    }
    return array;
  }
}
