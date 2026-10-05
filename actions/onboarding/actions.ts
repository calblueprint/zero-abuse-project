"use server";

import type {
  OnboardingFields,
  OnboardingState,
} from "@/actions/onboarding/validation";
import { redirect } from "next/navigation";
import { completeOnboarding } from "@/actions/supabase/profile";
import { requireVerifiedAuthUser } from "@/lib/auth";

export async function submitOnboarding(
  _prevState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const fields: OnboardingFields = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    organization: String(formData.get("organization") ?? ""),
  };
  const user = await requireVerifiedAuthUser();
  let result;

  try {
    result = await completeOnboarding(user, fields);
  } catch (error) {
    console.error("Onboarding failed:", error);
    return {
      fields,
      errors: { form: "Something went wrong. Please try again." },
    };
  }

  if (!result.success) {
    return { fields, errors: result.errors };
  }

  redirect("/");
}
