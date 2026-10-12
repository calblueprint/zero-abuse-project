import type { IntelligenceFilterParams } from "@/lib/intelligence-library/filters";
import IntelligenceLibrary from "@/components/intelligence-library/IntelligenceLibrary";
import {
  getIntelligenceLibraryFilterOptions,
  getIntelligenceLibraryItems,
} from "@/db/queries/intelligence-library";
import { requireApprovedUser } from "@/lib/auth/access";
import { parseIntelligenceFilters } from "@/lib/intelligence-library/filters";

type HomeProps = {
  searchParams: Promise<IntelligenceFilterParams>;
};

export default async function Home({ searchParams }: HomeProps) {
  await requireApprovedUser();
  const filters = parseIntelligenceFilters(await searchParams);
  const items = await getIntelligenceLibraryItems(filters);
  const options = await getIntelligenceLibraryFilterOptions();

  return (
    <IntelligenceLibrary filters={filters} items={items} options={options} />
  );
}
