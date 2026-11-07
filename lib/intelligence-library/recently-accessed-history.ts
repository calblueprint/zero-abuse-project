import { isUuid } from "../validation/uuid.ts";

export function parseRecentlyAccessedItemIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const ids: string[] = [];

  for (const entry of value) {
    if (!isUuid(entry)) continue;
    const id = entry.toLowerCase();
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length === 3) break;
  }

  return ids;
}

export function orderExistingItems<T extends { itemId: string }>(
  ids: string[],
  items: T[],
): T[] {
  const itemsById = new Map(items.map(item => [item.itemId, item]));
  return ids.flatMap(id => {
    const item = itemsById.get(id);
    return item ? [item] : [];
  });
}
