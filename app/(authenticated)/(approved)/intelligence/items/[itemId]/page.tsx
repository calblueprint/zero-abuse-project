import { cache } from "react";
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import IntelItemView from "@/components/intelligence-item/IntelItemView";
import { getIntelligenceItem } from "@/db/queries/intelligence-item";
import { requireApprovedUser } from "@/lib/auth/access";
import { isUuid } from "@/lib/validation/uuid";

const loadItem = cache(async (itemId: string) => {
  await requireApprovedUser();
  return isUuid(itemId) ? getIntelligenceItem(itemId) : null;
});

type ItemPageProps = { params: Promise<{ itemId: string }> };

export async function generateMetadata({ params }: ItemPageProps) {
  const item = await loadItem((await params).itemId);
  return { title: item?.title?.trim() || "Intelligence item" };
}

export default async function IntelItemPage({ params }: ItemPageProps) {
  const user = await requireApprovedUser();
  const { itemId } = await params;
  const item = await loadItem(itemId);
  if (!item) notFound();
  return (
    <AppShell
      firstName={user.firstName}
      lastName={user.lastName}
      email={user.email}
      isAdmin={user.isAdmin}
    >
      <IntelItemView key={item.itemId} item={item} isAdmin={user.isAdmin} />
    </AppShell>
  );
}
