import type { SearchParams } from "@/lib/validation/search-params";
import IntelligenceItemsView from "@/components/intelligence-library/IntelligenceItemsView";
import { getIntelligenceItemsViewData } from "@/db/queries/intelligence-library";
import { requireApprovedUser } from "@/lib/auth/access";
import { parseIntelligenceFilters } from "@/lib/intelligence-library/filters";

export const metadata = { title: "Intelligence items" };

type IntelligenceLibraryPageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function IntelligenceLibraryPage({
  searchParams,
}: IntelligenceLibraryPageProps) {
  await requireApprovedUser();
  const filters = parseIntelligenceFilters(await searchParams);
  const { items, options } = await getIntelligenceItemsViewData(filters);

  return (
    <IntelligenceItemsView filters={filters} items={items} options={options} />
  );
}
