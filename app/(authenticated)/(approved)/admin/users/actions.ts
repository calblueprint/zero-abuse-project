"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/access";
import { isUuid } from "@/lib/validation/uuid";

async function updateApprovalStatus(
  userId: string,
  approvalStatus: "approved" | "rejected",
  currentStatus: "pending" | "rejected" = "pending",
) {
  const admin = await requireAdmin();

  if (!isUuid(userId)) {
    redirect("/admin/users?notice=invalid-user");
  }

  const [updatedUser] = await db
    .update(users)
    .set({
      approvalStatus,
      approvalDecidedBy: admin.userId,
      approvalDecidedAt: new Date().toISOString(),
    })
    .where(
      and(eq(users.userId, userId), eq(users.approvalStatus, currentStatus)),
    )
    .returning({ userId: users.userId });

  if (!updatedUser) {
    redirect(
      `/admin/users?notice=${currentStatus === "pending" ? "already-reviewed" : "user-changed"}`,
    );
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

export async function restoreUser(userId: string) {
  await updateApprovalStatus(userId, "approved", "rejected");
}

export async function promoteUser(userId: string) {
  await requireAdmin();

  if (!isUuid(userId)) {
    redirect("/admin/users?notice=invalid-user");
  }

  const [updatedUser] = await db
    .update(users)
    .set({ isAdmin: true })
    .where(
      and(
        eq(users.userId, userId),
        eq(users.approvalStatus, "approved"),
        eq(users.isAdmin, false),
      ),
    )
    .returning({ userId: users.userId });

  if (!updatedUser) {
    redirect("/admin/users?notice=user-changed");
  }

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function demoteUser(userId: string) {
  const admin = await requireAdmin();

  if (!isUuid(userId)) {
    redirect("/admin/users?notice=invalid-user");
  }

  if (userId === admin.userId) {
    redirect("/admin/users?notice=self-change");
  }

  const result = await db.transaction(async transaction => {
    // Serialize demotions so two admins cannot both remove the final admin.
    await transaction.execute(sql`select pg_advisory_xact_lock(320032)`);

    const [{ activeAdmins }] = await transaction
      .select({ activeAdmins: count() })
      .from(users)
      .where(
        and(eq(users.isAdmin, true), eq(users.approvalStatus, "approved")),
      );

    if (activeAdmins <= 1) {
      return "last-admin";
    }

    const [updatedUser] = await transaction
      .update(users)
      .set({ isAdmin: false })
      .where(
        and(
          eq(users.userId, userId),
          eq(users.isAdmin, true),
          eq(users.approvalStatus, "approved"),
        ),
      )
      .returning({ userId: users.userId });

    return updatedUser ? "updated" : "user-changed";
  });

  if (result !== "updated") {
    redirect(`/admin/users?notice=${result}`);
  }

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function revokeUser(userId: string) {
  const admin = await requireAdmin();

  if (!isUuid(userId)) {
    redirect("/admin/users?notice=invalid-user");
  }

  if (userId === admin.userId) {
    redirect("/admin/users?notice=self-change");
  }

  const [updatedUser] = await db
    .update(users)
    .set({
      approvalStatus: "rejected",
      approvalDecidedBy: admin.userId,
      approvalDecidedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(users.userId, userId),
        eq(users.approvalStatus, "approved"),
        eq(users.isAdmin, false),
      ),
    )
    .returning({ userId: users.userId });

  if (!updatedUser) {
    redirect("/admin/users?notice=user-changed");
  }

  revalidatePath("/admin/users");
  redirect("/admin/users");
}
