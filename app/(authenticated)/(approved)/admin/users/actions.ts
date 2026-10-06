"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/access";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function updateApprovalStatus(
  userId: string,
  approvalStatus: "approved" | "rejected",
) {
  const admin = await requireAdmin();

  if (!uuidPattern.test(userId)) {
    redirect("/admin/users?notice=invalid-user");
  }

  const [updatedUser] = await db
    .update(users)
    .set({
      approvalStatus,
      approvalDecidedBy: admin.userId,
      approvalDecidedAt: new Date().toISOString(),
    })
    .where(and(eq(users.userId, userId), eq(users.approvalStatus, "pending")))
    .returning({ userId: users.userId });

  if (!updatedUser) {
    redirect("/admin/users?notice=already-reviewed");
  }

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function approveUser(userId: string) {
  await updateApprovalStatus(userId, "approved");
}

export async function rejectUser(userId: string) {
  await updateApprovalStatus(userId, "rejected");
}
