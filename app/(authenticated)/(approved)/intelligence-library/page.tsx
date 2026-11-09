import IntelligenceLibraryPage from "@/components/intelligence-library/intelligence-library";
import { getIntelligenceLibraryItems } from "@/db/queries/intelligence-library";
import { requireApprovedUser } from "@/lib/auth/access";
import { getEmergingPatterns } from "@/lib/intelligence-library/emerging-patterns";
import { parseIntelligenceFilters } from "@/lib/intelligence-library/filters";

export default async function IntelligenceLibraryPreviewPage() {
  const user = await requireApprovedUser();
  const [patterns, intelligenceItems] = await Promise.all([
    getEmergingPatterns(),
    getIntelligenceLibraryItems(parseIntelligenceFilters({})),
  ]);

  return (
    <IntelligenceLibraryPage
      initialPatterns={patterns}
      intelligenceItems={intelligenceItems}
      firstName={user.firstName}
      lastName={user.lastName}
      isAdmin={user.isAdmin}
    />
  );
}
