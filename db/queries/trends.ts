import "server-only";
import type { EmergingPattern } from "@/lib/intelligence-library/pattern-filters";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { itelItems, trends } from "@/db/schema";
import { parseClassificationLabels } from "@/lib/intelligence-library/format-intel-type";
import {
  evidenceOptions,
  reviewOptions,
} from "@/lib/intelligence-library/pattern-filters";
import { toIsoTimestamp } from "@/lib/utils";

export type LatestTrend = {
  trendId: string;
  title: string;
  itemCount: number;
  emergedAt: string | null;
};

const trendSelection = {
  trendId: trends.trendId,
  title: trends.title,
  itemCount: sql<number>`coalesce(cardinality(${trends.itemIds}), 0)`.mapWith(
    Number,
  ),
  emergedAt: trends.emergedAt,
};
const newestFirst = [desc(trends.emergedAt), desc(trends.trendId)];

export const getLatestTrends = async (limit: number) => {
  const rows = await db
    .select({
      ...trendSelection,
      // Window functions run before LIMIT, so this counts every trend.
      total: sql<number>`count(*) over ()`.mapWith(Number),
    })
    .from(trends)
    // trend_id breaks ties between trends inserted in the same transaction.
    .orderBy(...newestFirst)
    .limit(limit);

  const latestTrends: LatestTrend[] = rows.map(row => ({
    trendId: row.trendId,
    title: row.title,
    itemCount: row.itemCount,
    emergedAt: toIsoTimestamp(row.emergedAt),
  }));

  return { trends: latestTrends, total: rows[0]?.total ?? 0 };
};

export async function getEmergingPatterns(): Promise<EmergingPattern[]> {
  const rows = await db
    .select({
      ...trendSelection,
      description: trends.description,
      signal: trends.signalStatus,
      evidence: trends.evidenceStatus,
      reviewed: sql<boolean>`${trends.reviewedBy} is not null`,
      topic: trends.patternType,
      sourceCount: sql<number>`count(distinct ${itelItems.sourceId})`.mapWith(
        Number,
      ),
      platforms: sql<
        (string | null)[]
      >`array_agg(distinct ${itelItems.platform})`,
      populations: sql<
        (string | null)[]
      >`array_agg(distinct ${itelItems.affectedPopulation})`,
    })
    .from(trends)
    .leftJoin(itelItems, sql`${itelItems.itemId} = any(${trends.itemIds})`)
    .groupBy(trends.trendId)
    .orderBy(...newestFirst);

  return rows.map(row => {
    const signal = row.signal?.trim().toLowerCase();
    const evidence = row.evidence?.trim().toLowerCase();
    const confirmed = signal === "confirmed" || signal === "reviewed";
    return {
      id: row.trendId,
      title: row.title,
      description: row.description ?? "",
      surfacedAt: toIsoTimestamp(row.emergedAt)?.slice(0, 10) ?? null,
      supportingItemCount: row.itemCount,
      sourceCount: row.sourceCount,
      // The trends schema has no priority or per-user bookmark fields.
      priority: "Unassessed",
      saved: false,
      archived: signal === "archived",
      reviewStatus: confirmed ? "Confirmed" : "Needs review",
      review:
        reviewOptions.find(option => option.toLowerCase() === signal) ??
        (confirmed || row.reviewed ? "Reviewed" : "Awaiting review"),
      evidence:
        evidenceOptions.find(option => option.toLowerCase() === evidence) ??
        (row.sourceCount === 1 ? "Single source" : "Needs corroboration"),
      topic: row.topic ?? "",
      platforms: [...new Set(row.platforms.flatMap(parseClassificationLabels))],
      populations: [
        ...new Set(row.populations.flatMap(parseClassificationLabels)),
      ],
    };
  });
}
