import "server-only";
import type { OnboardingFields } from "@/actions/onboarding/validation";
import type { InitialUserAccess } from "@/lib/auth/access";
import type { VerifiedAuthUser } from "@/lib/auth/user";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function getUserProfile(userId: string) {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.userId, userId))
    .limit(1);
  return rows[0] ?? null;
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
    organization: profile.organization,
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
      organization: profile.organization,
    })
    .where(eq(users.userId, userId));
}
