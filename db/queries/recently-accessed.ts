import "server-only";
import type { IntelligenceLibraryItem } from "@/db/queries/intelligence-library";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { intelligenceLibraryItemSelection } from "@/db/queries/intelligence-library";
import { itelItems, sources, users } from "@/db/schema";
import { requireApprovedUser } from "@/lib/auth/access";
import {
  orderExistingItems,
  parseRecentlyAccessedItemIds,
} from "@/lib/intelligence-library/recently-accessed-history";
import { isUuid, UUID_PATTERN } from "@/lib/validation/uuid";

export async function recordRecentlyAccessed(itemId: string): Promise<boolean> {
  const user = await requireApprovedUser();

  if (!isUuid(itemId)) {
    throw new Error("Invalid intelligence item ID");
  }

  const id = itemId.toLowerCase();
  const [updatedUser] = await db
    .update(users)
    .set({
      recentlyAccessed: sql`(
        jsonb_build_array(${id}::text) || coalesce(
          (
            select jsonb_agg(previous.item_id order by previous.first_position)
            from (
              select lower(entry.value #>> '{}') as item_id,
                min(entry.position) as first_position
              from jsonb_array_elements(
                case
                  when jsonb_typeof(${users.recentlyAccessed}::jsonb) = 'array'
                    then ${users.recentlyAccessed}::jsonb
                  else '[]'::jsonb
                end
              ) with ordinality as entry(value, position)
              where jsonb_typeof(entry.value) = 'string'
                and (entry.value #>> '{}') ~* ${UUID_PATTERN.source}
                and lower(entry.value #>> '{}') <> ${id}
              group by lower(entry.value #>> '{}')
              order by min(entry.position)
              limit 2
            ) as previous
          ),
          '[]'::jsonb
        )
      )::json`,
    })
    .where(
      and(
        eq(users.userId, user.userId),
        sql`exists (
          select 1 from ${itelItems}
          where ${itelItems.itemId} = ${id}::uuid
        )`,
      ),
    )
    .returning({ userId: users.userId });

  return Boolean(updatedUser);
}

export async function getRecentlyAccessedItems(): Promise<
  IntelligenceLibraryItem[]
> {
  const user = await requireApprovedUser();
  const [profile] = await db
    .select({ recentlyAccessed: users.recentlyAccessed })
    .from(users)
    .where(eq(users.userId, user.userId))
    .limit(1);
  const ids = parseRecentlyAccessedItemIds(profile?.recentlyAccessed);

  if (ids.length === 0) return [];

  const items = await db
    .select(intelligenceLibraryItemSelection)
    .from(itelItems)
    .innerJoin(sources, eq(itelItems.sourceId, sources.sourceId))
    .where(inArray(itelItems.itemId, ids));

  return orderExistingItems(ids, items);
}
