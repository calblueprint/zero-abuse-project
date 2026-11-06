import type { IntelligenceFilterParams } from "@/lib/intelligence-library/filters";
import IntelligenceLibrary from "@/components/intelligence-library/IntelligenceLibrary";
import {
  getIntelligenceLibraryFilterOptions,
  getIntelligenceLibraryItems,
} from "@/db/queries/intelligence-library";
import { getRecentlyAccessedItems } from "@/db/queries/recently-accessed";
import { requireApprovedUser } from "@/lib/auth/access";
import { parseIntelligenceFilters } from "@/lib/intelligence-library/filters";

type IntelligenceLibraryPageProps = {
  searchParams: Promise<IntelligenceFilterParams>;
};

export default async function IntelligenceLibraryPage({
  searchParams,
}: IntelligenceLibraryPageProps) {
  await requireApprovedUser();
  const filters = parseIntelligenceFilters(await searchParams);
  const [items, options, recentlyAccessedItems] = await Promise.all([
    getIntelligenceLibraryItems(filters),
    getIntelligenceLibraryFilterOptions(),
    getRecentlyAccessedItems(),
  ]);

  return (
    <IntelligenceLibrary
      filters={filters}
      items={items}
      options={options}
      recentlyAccessedItems={recentlyAccessedItems}
    />
  );
}
