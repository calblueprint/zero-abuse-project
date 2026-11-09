import type { SearchParams } from "@/lib/validation/search-params";
import IntelligenceItemsView from "@/components/intelligence-library/IntelligenceItemsView";
import {
  getIntelligenceLibraryFilterOptions,
  getIntelligenceLibraryItems,
} from "@/db/queries/intelligence-library";
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
  const [items, options] = await Promise.all([
    getIntelligenceLibraryItems(filters),
    getIntelligenceLibraryFilterOptions(),
  ]);

  return (
    <IntelligenceItemsView filters={filters} items={items} options={options} />
  );
}
