import "server-only";
import rawPatterns from "@/mocks/emerging-patterns.json";

export type PatternPriority = "High" | "Moderate" | "Unassessed";
export type PatternReviewStatus = "Needs review" | "Confirmed";
export type PatternEvidence =
  "Corroborated" | "Single source" | "Needs corroboration" | "Contradictory";
export type PatternReview =
  "Awaiting review" | "AI suggested" | "Reviewed" | "Flagged";

export interface EmergingPattern {
  id: string;
  title: string;
  description: string;
  surfacedAt: string;
  supportingItemCount: number;
  sourceCount: number;
  priority: PatternPriority;
  reviewStatus: PatternReviewStatus;
  review: PatternReview;
  reviewedBy?: string;
  saved: boolean;
  archived: boolean;
  evidence: PatternEvidence;
  topic: string;
  platform: string;
  population: string;
}

const priorities: PatternPriority[] = ["High", "Moderate", "Unassessed"];
const reviewStatuses: PatternReviewStatus[] = ["Needs review", "Confirmed"];
const evidenceValues: PatternEvidence[] = [
  "Corroborated",
  "Single source",
  "Needs corroboration",
  "Contradictory",
];
const reviewValues: PatternReview[] = [
  "Awaiting review",
  "AI suggested",
  "Reviewed",
  "Flagged",
];

function isEmergingPattern(value: unknown): value is EmergingPattern {
  if (!value || typeof value !== "object") return false;
  const pattern = value as Record<string, unknown>;
  return (
    typeof pattern.id === "string" &&
    typeof pattern.title === "string" &&
    typeof pattern.description === "string" &&
    typeof pattern.surfacedAt === "string" &&
    typeof pattern.supportingItemCount === "number" &&
    typeof pattern.sourceCount === "number" &&
    priorities.includes(pattern.priority as PatternPriority) &&
    reviewStatuses.includes(pattern.reviewStatus as PatternReviewStatus) &&
    reviewValues.includes(pattern.review as PatternReview) &&
    evidenceValues.includes(pattern.evidence as PatternEvidence) &&
    typeof pattern.topic === "string" &&
    typeof pattern.platform === "string" &&
    typeof pattern.population === "string" &&
    typeof pattern.saved === "boolean" &&
    typeof pattern.archived === "boolean" &&
    (pattern.reviewedBy === undefined || typeof pattern.reviewedBy === "string")
  );
}

/** Mock-provider seam: replace this JSON import with the real data provider in a future sprint. */
export async function getEmergingPatterns(): Promise<EmergingPattern[]> {
  if (!Array.isArray(rawPatterns) || !rawPatterns.every(isEmergingPattern)) {
    throw new Error("Invalid emerging patterns mock data");
  }
  return rawPatterns.map(pattern => ({ ...pattern }));
}
