import INTELLIGENCE_TAXONOMY from "@/lib/intelligence-library/taxonomy";

export type IntelligenceFilters = {
  exploitationTypes: string[];
  platforms: string[];
  technologies: string[];
  affectedPopulations: string[];
  offenderTactics: string[];
  geographies: string[];
  intelTypes: string[];
  sourceIds: string[];
  hasInvalidSourceIds: boolean;
  publishedFrom?: Date;
  publishedTo?: Date;
};

export type IntelligenceFilterParams = {
  [key: string]: string | string[] | undefined;
};

const getValues = (params: IntelligenceFilterParams, key: string) => {
  const value = params[key];
  const values = Array.isArray(value) ? value : value ? [value] : [];

  return [...new Set(values.map(item => item.trim()).filter(Boolean))];
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const getAllowedValues = (
  params: IntelligenceFilterParams,
  key: string,
  allowedValues: readonly string[],
) => {
  const allowed = new Set(allowedValues);
  return getValues(params, key).filter(value => allowed.has(value));
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
  params: IntelligenceFilterParams,
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
    sourceIds,
    hasInvalidSourceIds: sourceIds.length !== requestedSourceIds.length,
    publishedFrom,
    publishedTo,
  };
};
