import "server-only";
import type { IntelligenceFilters } from "@/lib/intelligence-library/filters";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lt,
  ne,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import { itelItems, sources } from "@/db/schema";
import INTELLIGENCE_TAXONOMY from "@/lib/intelligence-library/taxonomy";

export type IntelligenceLibraryItem = {
  itemId: string;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string | null;
  title: string | null;
  tldr: string | null;
  exploitationType: string | null;
  platform: string | null;
  technology: string | null;
  affectedPopulation: string | null;
  offenderTactic: string | null;
  geography: string | null;
  intelType: string | null;
};

export type IntelligenceLibraryFilterOptions = {
  exploitationTypes: string[];
  platforms: string[];
  technologies: string[];
  affectedPopulations: string[];
  offenderTactics: string[];
  geographies: string[];
  intelTypes: string[];
  sources: Array<{ sourceId: string; name: string }>;
};

const beginningOfFollowingUtcDay = (date: Date) => {
  const followingDay = new Date(date);
  followingDay.setUTCDate(followingDay.getUTCDate() + 1);
  return followingDay;
};

const getGeographyValues = async () => {
  const column = itelItems.geography;
  const rows = await db
    .selectDistinct({ value: column })
    .from(itelItems)
    .where(and(isNotNull(column), ne(column, "")))
    .orderBy(asc(column));

  return rows
    .map(row => row.value)
    .filter((value): value is string => value !== null);
};

export const getIntelligenceLibraryItems = async (
  filters: IntelligenceFilters,
): Promise<IntelligenceLibraryItem[]> => {
  const conditions = [
    filters.hasInvalidSourceIds ? sql`false` : undefined,
    filters.exploitationTypes.length
      ? inArray(itelItems.exploitationType, filters.exploitationTypes)
      : undefined,
    filters.platforms.length
      ? inArray(itelItems.platform, filters.platforms)
      : undefined,
    filters.technologies.length
      ? inArray(itelItems.technology, filters.technologies)
      : undefined,
    filters.affectedPopulations.length
      ? inArray(itelItems.affectedPopulation, filters.affectedPopulations)
      : undefined,
    filters.offenderTactics.length
      ? inArray(itelItems.offenderTactic, filters.offenderTactics)
      : undefined,
    filters.geographies.length
      ? inArray(itelItems.geography, filters.geographies)
      : undefined,
    filters.intelTypes.length
      ? inArray(itelItems.intelType, filters.intelTypes)
      : undefined,
    filters.sourceIds.length
      ? inArray(itelItems.sourceId, filters.sourceIds)
      : undefined,
    filters.publishedFrom
      ? gte(itelItems.publishedAt, filters.publishedFrom.toISOString())
      : undefined,
    filters.publishedTo
      ? lt(
          itelItems.publishedAt,
          beginningOfFollowingUtcDay(filters.publishedTo).toISOString(),
        )
      : undefined,
  ];

  return db
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
    })
    .from(itelItems)
    .innerJoin(sources, eq(itelItems.sourceId, sources.sourceId))
    .where(and(...conditions))
    .orderBy(desc(itelItems.publishedAt), desc(itelItems.itemId));
};

export const getIntelligenceLibraryFilterOptions =
  async (): Promise<IntelligenceLibraryFilterOptions> => {
    const geographies = await getGeographyValues();
    const sourceRows = await db
      .selectDistinct({ sourceId: sources.sourceId, name: sources.name })
      .from(sources)
      .innerJoin(itelItems, eq(sources.sourceId, itelItems.sourceId))
      .orderBy(asc(sources.name));

    return {
      exploitationTypes: [...INTELLIGENCE_TAXONOMY.exploitationTypes],
      platforms: [...INTELLIGENCE_TAXONOMY.platforms],
      technologies: [...INTELLIGENCE_TAXONOMY.technologies],
      affectedPopulations: [...INTELLIGENCE_TAXONOMY.affectedPopulations],
      offenderTactics: [...INTELLIGENCE_TAXONOMY.offenderTactics],
      geographies,
      intelTypes: [...INTELLIGENCE_TAXONOMY.intelTypes],
      sources: sourceRows,
    };
  };
