import "server-only";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { trends } from "@/db/schema";
import { toIsoTimestamp } from "@/lib/utils";

export type LatestTrend = {
  trendId: string;
  title: string;
  itemCount: number;
  emergedAt: string | null;
};

export const getLatestTrends = async (limit: number) => {
  const rows = await db
    .select({
      trendId: trends.trendId,
      title: trends.title,
      itemCount:
        sql<number>`coalesce(cardinality(${trends.itemIds}), 0)`.mapWith(
          Number,
        ),
      emergedAt: trends.emergedAt,
      // Window functions run before LIMIT, so this counts every trend.
      total: sql<number>`count(*) over ()`.mapWith(Number),
    })
    .from(trends)
    // trend_id breaks ties between trends inserted in the same transaction.
    .orderBy(desc(trends.emergedAt), desc(trends.trendId))
    .limit(limit);

  const latestTrends: LatestTrend[] = rows.map(row => ({
    trendId: row.trendId,
    title: row.title,
    itemCount: row.itemCount,
    emergedAt: toIsoTimestamp(row.emergedAt),
  }));

  return { trends: latestTrends, total: rows[0]?.total ?? 0 };
};
