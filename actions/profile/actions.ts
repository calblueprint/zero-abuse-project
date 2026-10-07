"use server";

import type { OnboardingState } from "@/actions/onboarding/validation";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { parseOnboardingFormData } from "@/actions/onboarding/validation";
import { updateUserProfile } from "@/actions/supabase/profile";
import { createSupabaseServerClient } from "@/actions/supabase/server";
import { requireApprovedUser } from "@/lib/auth/access";
import { getAuthEmailState } from "@/lib/auth/user";
import { validateEmail } from "@/lib/validation/email";

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

  revalidatePath("/profile");

  const { email: currentEmail } = await getAuthEmailState();
  if (email === currentEmail) {
    return {
      fields: { ...result.fields, email },
      message: "Profile saved.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser(
    { email },
    {
      emailRedirectTo: `${await siteUrl()}/auth/callback`,
    },
  );

  if (error) {
    console.error("Email change request failed:", error);
    return {
      fields: { ...result.fields, email },
      errors: { email: "We couldn't start your email change. Try again." },
      message: "Your other changes were saved.",
    };
  }

  (await cookies()).set("email-change-requested", email, {
    httpOnly: true,
    maxAge: 60 * 60,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return {
    fields: { ...result.fields, email: currentEmail },
    message:
      "Profile saved. To finish changing your email, open the confirmation links we sent to your current and new addresses.",
  };
}
