import "server-only";
import type { OnboardingFields } from "@/actions/onboarding/validation";
import type { InitialUserAccess } from "@/lib/auth/access";
import type { VerifiedAuthUser } from "@/lib/auth/user";
import { eq, getTableColumns } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { users } from "@/db/schema";

const approver = alias(users, "approver");

export async function getUserProfile(userId: string) {
  const [row] = await db
    .select({
      ...getTableColumns(users),
      approverFirstName: approver.firstName,
      approverLastName: approver.lastName,
    })
    .from(users)
    .leftJoin(approver, eq(approver.userId, users.approvalDecidedBy))
    .where(eq(users.userId, userId))
    .limit(1);

  if (!row) return null;

  const { approverFirstName, approverLastName, ...profile } = row;
  return {
    ...profile,
    approverName:
      approverFirstName === null
        ? null
        : `${approverFirstName} ${approverLastName}`,
  };
}

export async function completeOnboarding(
  user: VerifiedAuthUser,
  profile: OnboardingFields,
  access: InitialUserAccess,
) {
  const profileValues = {
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: user.email.trim().toLowerCase(),
    phone: profile.phone,
    organization: profile.organization || null,
    role: profile.role || null,
    onboardingComplete: true,
  };

  await db
    .insert(users)
    .values({
      userId: user.id,
      ...profileValues,
      ...access,
      approvalDecidedAt:
        access.approvalStatus === "approved" ? new Date().toISOString() : null,
    })
    .onConflictDoUpdate({ target: users.userId, set: profileValues });
}

export async function updateUserProfile(
  userId: string,
  profile: OnboardingFields,
) {
  await db
    .update(users)
    .set({
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      organization: profile.organization || null,
      role: profile.role || null,
    })
    .where(eq(users.userId, userId));
}
