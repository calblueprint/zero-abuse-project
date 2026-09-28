"use server";

import { redirect } from "next/navigation";
import { completeOnboarding } from "@/actions/supabase/profile";
import { getCurrentUserId } from "@/lib/auth";
import { OnboardingFields, OnboardingState } from "@/lib/validation";

export async function submitOnboarding(
  _prevState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const fields: OnboardingFields = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    organization: String(formData.get("organization") ?? ""),
  };
  const userId = await getCurrentUserId(); // TODO: replace with supabase.auth.getUser() once auth lands
  let result;

  try {
    result = await completeOnboarding(userId, fields);
  } catch (error) {
    console.error("Onboarding failed:", error);
    return {
      fields,
      errors: { form: "Something went wrong. Please try again." },
    };
  }

  if (!result.success) {
    return { fields, errors: result.errors };
  } else {
    redirect("/");
  }
}
