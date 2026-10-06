"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/actions/auth/access";
import { db } from "@/db";
import { users } from "@/db/schema";

async function updateApprovalStatus(
  userId: string,
  approvalStatus: "approved" | "rejected",
) {
  await requireAdmin();

  const [updatedUser] = await db
    .update(users)
    .set({ approvalStatus })
    .where(and(eq(users.userId, userId), eq(users.approvalStatus, "pending")))
    .returning({ userId: users.userId });

  if (!updatedUser) {
    throw new Error("Pending user not found");
  }

  revalidatePath("/admin/users");
}

export async function approveUser(userId: string) {
  await updateApprovalStatus(userId, "approved");
}

export async function rejectUser(userId: string) {
  await updateApprovalStatus(userId, "rejected");
}
