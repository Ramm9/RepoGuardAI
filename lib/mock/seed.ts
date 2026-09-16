/**
 * Deterministic pseudo-random source shared by the mock fixtures.
 *
 * Seeded rather than random so that a given repository, commit, or file always
 * produces the same numbers across reloads. A dashboard whose figures change on
 * every render cannot be reasoned about while building it.
 */

/** Mulberry32 — small, fast, well-distributed enough for fixture data. */
export function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return function random(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable numeric seed from a string, so keys map to reproducible fixtures. */
export function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function randomFor(input: string) {
  return createSeededRandom(hashSeed(input));
}

/** Integer in [min, max]. */
export function randomInt(random: () => number, min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min;
}

/** Float in [min, max] rounded to `decimals`. */
export function randomFloat(
  random: () => number,
  min: number,
  max: number,
  decimals = 1,
) {
  const factor = 10 ** decimals;
  return (
    Math.round((random() * (max - min) + min) * factor) / factor
  );
}

/** Pick one element deterministically. */
export function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

/**
 * Fixed reference instant for all fixture timestamps.
 *
 * Anchored rather than derived from the clock so relative times ("2m ago") stay
 * stable in snapshots. Fixtures are generated relative to this instant and then
 * shifted to the current time once, at read, by `lib/mock/clock.ts`.
 */
export const FIXTURE_EPOCH = new Date("2026-03-18T09:24:00.000Z");

/** ISO timestamp `minutesAgo` before the fixture epoch. */
export function minutesBeforeEpoch(minutesAgo: number): string {
  return new Date(FIXTURE_EPOCH.getTime() - minutesAgo * 60_000).toISOString();
}

/** ISO timestamp `daysAgo` before the fixture epoch. */
export function daysBeforeEpoch(daysAgo: number): string {
  return new Date(
    FIXTURE_EPOCH.getTime() - daysAgo * 24 * 60 * 60_000,
  ).toISOString();
}

/**
 * Shift a fixture timestamp so the newest fixture reads as "moments ago"
 * regardless of when the app is opened. Keeps the demo feeling live without
 * making the underlying data non-deterministic.
 */
export function toLiveTime(iso: string, now: number = Date.now()): string {
  const offset = now - FIXTURE_EPOCH.getTime();
  return new Date(new Date(iso).getTime() + offset).toISOString();
}
