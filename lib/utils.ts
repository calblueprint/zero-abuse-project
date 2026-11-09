/**
 * Random number generator built on top of Math.random().
 *
 * @param min The minimum value (inclusive)
 * @param max The maximum value (inclusive)
 * @returns A random number between min and max.
 */
export function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Drizzle returns timestamptz columns as raw Postgres text, which Safari
 * can't parse. Normalizes to ISO for the client; null when missing or
 * unparseable (e.g. Postgres 'infinity').
 */
export function toIsoTimestamp(value: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
