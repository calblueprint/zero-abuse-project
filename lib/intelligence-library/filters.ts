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
  publishedFrom?: Date;
  publishedTo?: Date;
};

export type IntelligenceFilterParams = {
  [key: string]: string | string[] | undefined;
};

const getValues = (params: IntelligenceFilterParams, key: string) => {
  const value = params[key];
  const values = Array.isArray(value) ? value : value ? [value] : [];

  return values.map(item => item.trim()).filter(Boolean);
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

  return {
    exploitationTypes: getValues(params, "exploitationType"),
    platforms: getValues(params, "platform"),
    technologies: getValues(params, "technology"),
    affectedPopulations: getValues(params, "affectedPopulation"),
    offenderTactics: getValues(params, "offenderTactic"),
    geographies: getValues(params, "geography"),
    intelTypes: getValues(params, "intelType"),
    zapRelevances: getValues(params, "zapRelevance"),
    sourceIds: getValues(params, "sourceId"),
    publishedFrom,
    publishedTo,
  };
};
