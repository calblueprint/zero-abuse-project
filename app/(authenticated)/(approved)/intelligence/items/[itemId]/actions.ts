"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { itelItems } from "@/db/schema";
import { requireApprovedUser } from "@/lib/auth/access";
import { isUuid } from "@/lib/validation/uuid";

export type SummaryUpdateResult = {
  ok: boolean;
  message: string;
  summary?: string;
  editedAt?: string;
};

export async function updateIntelItemSummary(
  itemId: string,
  summary: string,
): Promise<SummaryUpdateResult> {
  await requireApprovedUser();
  if (!isUuid(itemId))
    return { ok: false, message: "Invalid intelligence item ID." };
  if (typeof summary !== "string" || !summary.trim()) {
    return { ok: false, message: "Enter a summary before saving." };
  }
  const trimmed = summary.trim();
  if (trimmed.length > 10000) {
    return { ok: false, message: "Summary must be 10,000 characters or less." };
  }
  const editedAt = new Date().toISOString();
  try {
    const [updated] = await db
      .update(itelItems)
      .set({ tldr: trimmed, editedAt })
      .where(eq(itelItems.itemId, itemId))
      .returning({ itemId: itelItems.itemId });
    if (!updated) return { ok: false, message: "Intelligence item not found." };
    revalidatePath(`/intelligence/items/${itemId}`);
    revalidatePath("/intelligence-library");
    revalidatePath("/intelligence");
    return { ok: true, message: "Summary saved.", summary: trimmed, editedAt };
  } catch (error) {
    console.error("Unable to update intelligence item summary:", error);
    return {
      ok: false,
      message: "Unable to save the summary. Please try again.",
    };
  }
}
