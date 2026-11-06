import type { SearchParams } from "@/lib/validation/search-params";
import INTELLIGENCE_TAXONOMY from "@/lib/intelligence-library/taxonomy";
import { getAllowedValues, getValues } from "@/lib/validation/search-params";
import { isUuid } from "@/lib/validation/uuid";

export type IntelligenceFilters = {
  exploitationTypes: string[];
  platforms: string[];
  technologies: string[];
  affectedPopulations: string[];
  offenderTactics: string[];
  geographies: string[];
  intelTypes: string[];
  zapRelevances: string[];
  sourceIds: string[];
  hasInvalidSourceIds: boolean;
  publishedFrom?: Date;
  publishedTo?: Date;
};

const parseDate = (value: string | undefined) => {
  if (!value) return undefined;

  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const parsed = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day)),
    );

    return parsed.getUTCFullYear() === Number(year) &&
      parsed.getUTCMonth() === Number(month) - 1 &&
      parsed.getUTCDate() === Number(day)
      ? parsed
      : undefined;
  }

  return undefined;
};

export const parseIntelligenceFilters = (
  params: SearchParams,
): IntelligenceFilters => {
  const publishedFrom = parseDate(getValues(params, "publishedFrom")[0]);
  const publishedTo = parseDate(getValues(params, "publishedTo")[0]);
  const requestedSourceIds = getValues(params, "sourceId");
  const sourceIds = requestedSourceIds.filter(isUuid);

  return {
    exploitationTypes: getAllowedValues(
      params,
      "exploitationType",
      INTELLIGENCE_TAXONOMY.exploitationTypes,
    ),
    platforms: getAllowedValues(
      params,
      "platform",
      INTELLIGENCE_TAXONOMY.platforms,
    ),
    technologies: getAllowedValues(
      params,
      "technology",
      INTELLIGENCE_TAXONOMY.technologies,
    ),
    affectedPopulations: getAllowedValues(
      params,
      "affectedPopulation",
      INTELLIGENCE_TAXONOMY.affectedPopulations,
    ),
    offenderTactics: getAllowedValues(
      params,
      "offenderTactic",
      INTELLIGENCE_TAXONOMY.offenderTactics,
    ),
    geographies: getValues(params, "geography"),
    intelTypes: getAllowedValues(
      params,
      "intelType",
      INTELLIGENCE_TAXONOMY.intelTypes,
    ),
    zapRelevances: getValues(params, "zapRelevance"),
    sourceIds,
    hasInvalidSourceIds: sourceIds.length !== requestedSourceIds.length,
    publishedFrom,
    publishedTo,
  };
};
