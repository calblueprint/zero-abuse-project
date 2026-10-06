"use server";

import type { OnboardingState } from "@/actions/onboarding/validation";
import { redirect } from "next/navigation";
import { parseOnboardingFormData } from "@/actions/onboarding/validation";
import { completeOnboarding } from "@/actions/supabase/profile";
import { requireVerifiedAuthUser } from "@/lib/auth";
import { getInitialUserAccess } from "@/lib/auth/access";

export async function submitOnboarding(
  _prevState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireVerifiedAuthUser();
  const result = parseOnboardingFormData(formData);

  if (!result.success) {
    return { fields: result.fields, errors: result.errors };
  }

  try {
    await completeOnboarding(
      user,
      result.data,
      getInitialUserAccess(user.email),
    );
  } catch (error) {
    console.error("Onboarding failed:", error);
    return {
      fields: result.fields,
      errors: { form: "Something went wrong. Please try again." },
    };
  }

  redirect("/");
}
