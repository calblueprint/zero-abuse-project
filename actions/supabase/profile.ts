import "server-only";
import type { VerifiedAuthUser } from "@/lib/auth";
import type { OnboardingErrors, OnboardingFields } from "@/lib/validation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  normalizePhoneNumber,
  validateOnboardingFields,
} from "@/lib/validation";

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
  fields: OnboardingFields,
) {
  const profile: OnboardingFields = {
    firstName: fields.firstName.trim(),
    lastName: fields.lastName.trim(),
    phone: normalizePhoneNumber(fields.phone),
    organization: fields.organization.trim(),
  };

  const errors: OnboardingErrors = validateOnboardingFields(profile);

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  const values = {
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
      ...values,
    })
    .onConflictDoUpdate({ target: users.userId, set: values });
  return { success: true };
}
