import type { SearchParams } from "@/lib/validation/search-params";
import IntelligenceLibraryView from "@/components/intelligence-library/IntelligenceLibraryView";
import { getIntelligenceItemsViewData } from "@/db/queries/intelligence-library";
import { getEmergingPatterns } from "@/db/queries/trends";
import { requireApprovedUser } from "@/lib/auth/access";
import { parseIntelligenceFilters } from "@/lib/intelligence-library/filters";

export const metadata = { title: "Intelligence Library" };

export default async function IntelligenceLibraryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireApprovedUser();
  const params = await searchParams;
  const filters = parseIntelligenceFilters(params);
  const [patterns, { items, options }] = await Promise.all([
    getEmergingPatterns(),
    getIntelligenceItemsViewData(filters),
  ]);

  return (
    <IntelligenceLibraryView
      initialPatterns={patterns}
      intelligenceItems={items}
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
