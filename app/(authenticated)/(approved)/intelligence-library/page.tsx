import type { SearchParams } from "@/lib/validation/search-params";
import IntelligenceLibraryView from "@/components/intelligence-library/IntelligenceLibraryView";
import {
  getIntelligenceLibraryFilterOptions,
  getIntelligenceLibraryItems,
} from "@/db/queries/intelligence-library";
import { requireApprovedUser } from "@/lib/auth/access";
import { getEmergingPatterns } from "@/lib/intelligence-library/emerging-patterns";
import { parseIntelligenceFilters } from "@/lib/intelligence-library/filters";

export default async function IntelligenceLibraryPreviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireApprovedUser();
  const params = await searchParams;
  const filters = parseIntelligenceFilters(params);
  const [patterns, intelligenceItems, options] = await Promise.all([
    getEmergingPatterns(),
    getIntelligenceLibraryItems(filters),
    getIntelligenceLibraryFilterOptions(),
  ]);

  return (
    <IntelligenceLibraryView
      initialPatterns={patterns}
      intelligenceItems={intelligenceItems}
      itemFilters={filters}
      itemFilterOptions={options}
      initialView={params.view === "items" ? "items" : "patterns"}
      firstName={user.firstName}
      lastName={user.lastName}
      email={user.email}
      isAdmin={user.isAdmin}
    />
  );
}
