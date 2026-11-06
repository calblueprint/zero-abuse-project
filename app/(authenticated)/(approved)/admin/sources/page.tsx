import { asc } from "drizzle-orm";
import AppShell from "@/components/AppShell";
import { db } from "@/db";
import { sources } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/access";
import { getInitials, toIsoTimestamp } from "@/lib/utils";
import SourcesView from "./SourcesView";

export default async function AdminSourcesPage() {
  const admin = await requireAdmin();
  const sourceList = await db
    .select({
      sourceId: sources.sourceId,
      name: sources.name,
      tier: sources.tier,
      type: sources.type,
      baseUrl: sources.baseUrl,
      isActive: sources.isActive,
      lastCrawledAt: sources.lastCrawledAt,
      addedAt: sources.addedAt,
    })
    .from(sources)
    .orderBy(asc(sources.name));

  return (
    <AppShell
      initials={getInitials(admin.firstName, admin.lastName)}
      isAdmin={admin.isAdmin}
    >
      <SourcesView
        sources={sourceList.map(source => ({
          ...source,
          lastCrawledAt: toIsoTimestamp(source.lastCrawledAt),
          addedAt: toIsoTimestamp(source.addedAt),
        }))}
        now={new Date().toISOString()}
      />
    </AppShell>
  );
}
