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

export type ProfileState = OnboardingState & {
  status?: "saved" | "email-change-sent";
  pendingEmail?: string;
};

// The auth callback reads this to send the confirmation back to /profile.
async function rememberEmailChange(email: string) {
  (await cookies()).set("email-change-requested", email, {
    httpOnly: true,
    maxAge: 60 * 60,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function submitProfileUpdate(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
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

  let currentEmail = user.email.trim().toLowerCase();
  try {
    // Fetch the latest Auth state only when the submitted email differs from the verified session.
    if (email !== currentEmail) {
      ({ email: currentEmail } = await getAuthEmailState());
    }
    await updateUserProfile(user.userId, result.data);
  } catch (error) {
    console.error("Profile update failed:", error);
    return {
      fields: { ...result.fields, email },
      errors: { form: "Something went wrong. Please try again." },
    };
  }

  revalidatePath("/profile");

  if (email === currentEmail) {
    return { fields: { ...result.fields, email }, status: "saved" };
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

  await rememberEmailChange(email);

  return {
    fields: { ...result.fields, email: currentEmail },
    status: "email-change-sent",
    pendingEmail: email,
  };
}

export async function resendEmailChange(): Promise<{ error?: string }> {
  await requireApprovedUser();
  const { email, pendingEmail } = await getAuthEmailState();

  if (!pendingEmail) {
    return { error: "There's no email change waiting to be confirmed." };
  }

  const supabase = await createSupabaseServerClient();
  // GoTrue looks the user up by their current email and sends to the pending one.
  const { error } = await supabase.auth.resend({
    type: "email_change",
    email,
    options: { emailRedirectTo: `${await siteUrl()}/auth/callback` },
  });

  if (error) {
    console.error("Email change resend failed:", error);
    return {
      error:
        error.status === 429
          ? "Please wait a minute before asking for another link."
          : "We couldn't resend the link. Try again.",
    };
  }

  await rememberEmailChange(pendingEmail);
  return {};
}
