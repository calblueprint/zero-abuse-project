import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import IntelItemView from "@/components/intelligence-item/IntelItemView";
import { getIntelligenceItem } from "@/db/queries/intelligence-item";
import { requireApprovedUser } from "@/lib/auth/access";
import { isUuid } from "@/lib/validation/uuid";

export const metadata = { title: "Intelligence item" };

export default async function IntelItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const user = await requireApprovedUser();
  const { itemId } = await params;
  if (!isUuid(itemId)) notFound();
  const item = await getIntelligenceItem(itemId);
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
