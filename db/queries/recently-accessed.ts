import "server-only";
import type { IntelligenceLibraryItem } from "@/db/queries/intelligence-library";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { itelItems, sources, users } from "@/db/schema";
import { requireApprovedUser } from "@/lib/auth/access";
import {
  orderExistingItems,
  storedItemIds,
  uuidPattern,
} from "@/lib/intelligence-library/recently-accessed-history";

export async function recordRecentlyAccessed(itemId: string): Promise<boolean> {
  const user = await requireApprovedUser();

  if (!uuidPattern.test(itemId)) {
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
                and (entry.value #>> '{}') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
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
  const ids = storedItemIds(profile?.recentlyAccessed);

  if (ids.length === 0) return [];

  const items = await db
    .select({
      itemId: itelItems.itemId,
      sourceId: itelItems.sourceId,
      sourceName: sources.name,
      sourceUrl: itelItems.sourceUrl,
      publishedAt: itelItems.publishedAt,
      title: itelItems.title,
      tldr: itelItems.tldr,
      exploitationType: itelItems.exploitationType,
      platform: itelItems.platform,
      technology: itelItems.technology,
      affectedPopulation: itelItems.affectedPopulation,
      offenderTactic: itelItems.offenderTactic,
      geography: itelItems.geography,
      intelType: itelItems.intelType,
      zapRelevance: itelItems.zapRelevance,
    })
    .from(itelItems)
    .innerJoin(sources, eq(itelItems.sourceId, sources.sourceId))
    .where(inArray(itelItems.itemId, ids));

  return orderExistingItems(ids, items);
}
