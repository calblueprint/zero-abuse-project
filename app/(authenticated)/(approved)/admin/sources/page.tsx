import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { sources, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/access";
import AddSourceForm from "./AddSourceForm";
import Source from "./Source";

type AdminSourcesPageProps = {
  searchParams: Promise<{ notice?: string }>;
};

const notices = {
  "source-added": "Source added.",
  "source-reactivated": "Source reactivated.",
  "invalid-source": "The selected source is invalid.",
  "source-changed": "That source has changed. Please try again.",
} as const;

export default async function AdminSourcesPage({
  searchParams,
}: AdminSourcesPageProps) {
  await requireAdmin();
  const { notice } = await searchParams;

  const sourceList = await db
    .select({
      sourceId: sources.sourceId,
      name: sources.name,
      tier: sources.tier,
      type: sources.type,
      baseUrl: sources.baseUrl,
      isActive: sources.isActive,
      addedAt: sources.addedAt,
      addedBy: sql<
        string | null
      >`${users.firstName} || ' ' || ${users.lastName}`,
    })
    .from(sources)
    .leftJoin(users, eq(sources.addedBy, users.userId))
    .orderBy(desc(sources.isActive), asc(sources.name));

  return (
    <main>
      <h1>Sources</h1>
      {notice && Object.hasOwn(notices, notice) && (
        <p role="status">{notices[notice as keyof typeof notices]}</p>
      )}
      <AddSourceForm />
      <h2>All sources</h2>
      {sourceList.length === 0 ? (
        <p>No sources yet.</p>
      ) : (
        <ul>
          {sourceList.map(source => (
            <Source key={source.sourceId} source={source} />
          ))}
        </ul>
      )}
    </main>
  );
}
