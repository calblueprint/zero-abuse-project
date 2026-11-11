import type { SearchParams } from "@/lib/validation/search-params";
import { getAllowedValues } from "@/lib/validation/search-params";

export const PROFILE_TABS = ["details", "access", "ai-processing"] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number];

export const PROFILE_TAB_LABELS: Record<ProfileTab, string> = {
  details: "Details",
  access: "Access",
  "ai-processing": "AI processing",
};

export const parseProfileTab = (params: SearchParams): ProfileTab =>
  getAllowedValues(params, "tab", PROFILE_TABS)[0] ?? "details";
