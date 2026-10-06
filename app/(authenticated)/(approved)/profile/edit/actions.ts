"use server";

import type { OnboardingState } from "@/actions/onboarding/validation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  parseOnboardingFormData,
  validateEmail,
} from "@/actions/onboarding/validation";
import { updateUserProfile } from "@/actions/supabase/profile";
import { createSupabaseServerClient } from "@/actions/supabase/server";
import { getAuthEmails } from "@/lib/auth";
import { requireApprovedUser } from "@/lib/auth/access";

async function siteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

  if (configuredUrl) {
    return configuredUrl;
  }

  return (await headers()).get("origin") ?? "http://localhost:3000";
}

export async function submitProfileUpdate(
  _prevState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireApprovedUser();
  const result = parseOnboardingFormData(formData);
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const emailError = validateEmail(email);

  if (!result.success || emailError) {
    return {
      fields: { ...result.fields, email },
      errors: {
        ...(!result.success && result.errors),
        ...(emailError && { email: emailError }),
      },
    };
  }

  try {
    await updateUserProfile(user.userId, result.data);
  } catch (error) {
    console.error("Profile update failed:", error);
    return {
      fields: { ...result.fields, email },
      errors: { form: "Something went wrong. Please try again." },
    };
  }

  revalidatePath("/profile", "layout");

  const currentEmail = (await getAuthEmails()).email ?? "";
  if (email === currentEmail.toLowerCase()) {
    return { fields: { ...result.fields, email }, message: "Profile saved." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${await siteUrl()}/auth/callback?next=/profile` },
  );

  if (error) {
    console.error("Email change request failed:", error);
    return {
      fields: { ...result.fields, email },
      errors: { email: "We couldn't start your email change. Try again." },
      message: "Your other changes were saved.",
    };
  }

  return {
    fields: { ...result.fields, email: currentEmail },
    message:
      "Profile saved. To finish changing your email, open the confirmation links we sent to your current and new addresses.",
  };
}
