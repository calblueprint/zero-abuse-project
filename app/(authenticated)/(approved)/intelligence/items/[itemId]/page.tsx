import { notFound } from "next/navigation";
import IntelItemView from "@/components/intelligence-item/IntelItemView";
import { getIntelligenceItem } from "@/db/queries/intelligence-item";
import { requireApprovedUser } from "@/lib/auth/access";
import { isUuid } from "@/lib/validation/uuid";

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
    <IntelItemView
      item={item}
      firstName={user.firstName}
      lastName={user.lastName}
      isAdmin={user.isAdmin}
    />
  );
}
