import type { IntelligenceFilterParams } from "@/lib/intelligence-library/filters";
import IntelligenceLibrary from "@/components/IntelligenceLibrary";
import {
  getIntelligenceLibraryFilterOptions,
  getIntelligenceLibraryItems,
} from "@/db/queries/intelligence-library";
import { parseIntelligenceFilters } from "@/lib/intelligence-library/filters";

type HomeProps = {
  searchParams: Promise<IntelligenceFilterParams>;
};

export default async function Home({ searchParams }: HomeProps) {
  const filters = parseIntelligenceFilters(await searchParams);
  const items = await getIntelligenceLibraryItems(filters);
  const options = await getIntelligenceLibraryFilterOptions();

  return (
    <IntelligenceLibrary filters={filters} items={items} options={options} />
  );
}
