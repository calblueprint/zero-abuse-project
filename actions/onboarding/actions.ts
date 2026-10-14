"use server";

import type { OnboardingState } from "@/actions/onboarding/validation";
import { redirect } from "next/navigation";
import { parseOnboardingFormData } from "@/actions/onboarding/validation";
import { completeOnboarding } from "@/actions/supabase/profile";
import { getInitialUserAccess } from "@/lib/auth/access";
import { requireVerifiedAuthUser } from "@/lib/auth/user";

export async function submitOnboarding(
  _prevState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireVerifiedAuthUser();
  const result = parseOnboardingFormData(formData);

  if (!result.success) {
    return { fields: result.fields, errors: result.errors };
  }

  const access = getInitialUserAccess(user.email);

  try {
    await completeOnboarding(user, result.data, access);
  } catch (error) {
    console.error("Onboarding failed:", error);
    return {
      fields: result.fields,
      errors: { form: "Something went wrong. Please try again." },
    };
  }

  redirect(
    access.approvalStatus === "approved" ? "/welcome" : "/waiting-for-approval",
  );
}
