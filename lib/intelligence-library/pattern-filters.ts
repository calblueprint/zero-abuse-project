export type PatternPriority = (typeof priorityOptions)[number];
export type PatternReviewStatus = "Needs review" | "Confirmed";
export type PatternEvidence = (typeof evidenceOptions)[number];
export type PatternReview = (typeof reviewOptions)[number];

export interface EmergingPattern {
  id: string;
  title: string;
  description: string;
  surfacedAt: string | null;
  supportingItemCount: number;
  sourceCount: number;
  priority: PatternPriority;
  reviewStatus: PatternReviewStatus;
  review: PatternReview;
  saved: boolean;
  archived: boolean;
  evidence: PatternEvidence;
  topic: string;
  platforms: string[];
  populations: string[];
}

export type PatternFilters = {
  date: string;
  priorities: string[];
  evidence: string[];
  review: string[];
  topic: string[];
  platform: string[];
  population: string[];
  customFrom: string;
  customTo: string;
};
export const emptyPatternFilters: PatternFilters = {
  date: "",
  priorities: [],
  evidence: [],
  review: [],
  topic: [],
  platform: [],
  population: [],
  customFrom: "",
  customTo: "",
};
export const dateOptions = [
  "30 days",
  "60 days",
  "90 days",
  "Custom date range",
] as const;
export const priorityOptions = ["High", "Moderate", "Unassessed"] as const;
export const evidenceOptions = [
  "Corroborated",
  "Single source",
  "Needs corroboration",
  "Contradictory",
] as const;
export const reviewOptions = [
  "Awaiting review",
  "AI suggested",
  "Reviewed",
  "Flagged",
] as const;
export const getActiveFilterCount = (f: PatternFilters) =>
  Number(Boolean(f.date || f.customFrom || f.customTo)) +
  [
    f.priorities,
    f.evidence,
    f.review,
    f.topic,
    f.platform,
    f.population,
  ].filter(values => values.length > 0).length;
export const getPatternFilterOptions = (p: EmergingPattern[]) => ({
  topic: [...new Set(p.map(x => x.topic).filter(Boolean))],
  platform: [...new Set(p.flatMap(x => x.platforms))],
  population: [...new Set(p.flatMap(x => x.populations))],
});
export function matchesPatternFilters(
  p: EmergingPattern,
  f: PatternFilters,
  referenceDate: Date,
) {
  const days = Number(f.date.split(" ")[0]);
  const cutoff = new Date(referenceDate);
  cutoff.setUTCDate(cutoff.getUTCDate() - (Number.isFinite(days) ? days : 0));
  const inSet = (values: string[], value: string) =>
    !values.length || values.includes(value);
  return (
    (!days ||
      f.date === "Custom date range" ||
      (p.surfacedAt !== null &&
        p.surfacedAt >= cutoff.toISOString().slice(0, 10))) &&
    (f.date !== "Custom date range" ||
      ((!f.customFrom || (p.surfacedAt && p.surfacedAt >= f.customFrom)) &&
        (!f.customTo || (p.surfacedAt && p.surfacedAt <= f.customTo)))) &&
    inSet(f.priorities, p.priority) &&
    inSet(f.evidence, p.evidence) &&
    inSet(f.review, p.review) &&
    inSet(f.topic, p.topic) &&
    (!f.platform.length ||
      p.platforms.some(value => f.platform.includes(value))) &&
    (!f.population.length ||
      p.populations.some(value => f.population.includes(value)))
  );
}
