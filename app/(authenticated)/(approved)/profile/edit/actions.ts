"use server";

import type { OnboardingState } from "@/actions/onboarding/validation";
import { revalidatePath } from "next/cache";
import { parseOnboardingFormData } from "@/actions/onboarding/validation";
import { updateUserProfile } from "@/actions/supabase/profile";
import { requireApprovedUser } from "@/lib/auth/access";

export async function submitProfileUpdate(
  _prevState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireApprovedUser();
  const result = parseOnboardingFormData(formData);

  if (!result.success) {
    return { fields: result.fields, errors: result.errors };
  }

  try {
    await updateUserProfile(user.userId, result.data);
  } catch (error) {
    console.error("Profile update failed:", error);
    return {
      fields: result.fields,
      errors: { form: "Something went wrong. Please try again." },
    };
  }

  revalidatePath("/profile", "layout");
  return { fields: result.fields, message: "Profile saved." };
}
