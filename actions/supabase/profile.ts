import "server-only";
import type { OnboardingFields } from "@/actions/onboarding/validation";
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
  userId: string,
  profile: OnboardingFields,
) {
  const values = {
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    organization: profile.organization,
    onboardingComplete: true,
  };

  await db
    .insert(users)
    .values({
      userId,
      ...values,
    })
    .onConflictDoUpdate({ target: users.userId, set: values });
}
