import type { SearchParams } from "@/lib/validation/search-params";
import IntelligenceLibrary from "@/components/intelligence-library/IntelligenceLibrary";
import {
  getIntelligenceLibraryFilterOptions,
  getIntelligenceLibraryItems,
} from "@/db/queries/intelligence-library";
import { getRecentlyAccessedItems } from "@/db/queries/recently-accessed";
import { requireApprovedUser } from "@/lib/auth/access";
import { parseIntelligenceFilters } from "@/lib/intelligence-library/filters";

type IntelligenceLibraryPageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function IntelligenceLibraryPage({
  searchParams,
}: IntelligenceLibraryPageProps) {
  await requireApprovedUser();
  const filters = parseIntelligenceFilters(await searchParams);
  // One query at a time: db/index.ts has a single pooled connection, and
  // queries sent on it together never return through Supabase's pooler.
  const items = await getIntelligenceLibraryItems(filters);
  const options = await getIntelligenceLibraryFilterOptions();
  const recentlyAccessedItems = await getRecentlyAccessedItems();

  return (
    <IntelligenceLibrary
      filters={filters}
      items={items}
      options={options}
      recentlyAccessedItems={recentlyAccessedItems}
    />
  );
}
