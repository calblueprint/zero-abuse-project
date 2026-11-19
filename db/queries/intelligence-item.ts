import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { itelItems, sources } from "@/db/schema";
import { toIsoTimestamp } from "@/lib/utils";

// Each intel item currently has one source_id. There is no multi-source relation.
export async function getIntelligenceItem(itemId: string) {
  const [item] = await db
    .select({
      itemId: itelItems.itemId,
      title: itelItems.title,
      summary: itelItems.tldr,
      intelType: itelItems.intelType,
      publishedAt: itelItems.publishedAt,
      editedAt: itelItems.editedAt,
      sourceName: sources.name,
      sourceUrl: itelItems.sourceUrl,
      uploadFilename: itelItems.uploadFilename,
      sourceType: sources.type,
    })
    .from(itelItems)
    .innerJoin(sources, eq(itelItems.sourceId, sources.sourceId))
    .where(eq(itelItems.itemId, itemId))
    .limit(1);
  return item
    ? {
        ...item,
        publishedAt: toIsoTimestamp(item.publishedAt),
        editedAt: toIsoTimestamp(item.editedAt),
      }
    : null;
}

export type IntelligenceItemDetail = NonNullable<
  Awaited<ReturnType<typeof getIntelligenceItem>>
>;
