import "server-only";
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
  return rows[0];
}

export async function completeOnboarding(
  userId: string,
  fields: OnboardingFields,
) {
  const profile: OnboardingFields = {
    firstName: fields.firstName.trim(),
    lastName: fields.lastName.trim(),
    email: fields.email.trim(),
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
    email: profile.email,
    phone: profile.phone,
    organization: profile.organization,
    onboardingComplete: true,
  };

  await db
    .insert(users)
    .values({
      userId: userId,
      ...values,
    })
    .onConflictDoUpdate({ target: users.userId, set: values });
  return { success: true };
}
