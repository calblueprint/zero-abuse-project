"use server";

import type { ProfileState } from "@/actions/profile/validation";
import { revalidatePath } from "next/cache";
import { parseProfileFormData } from "@/actions/profile/validation";
import { updateUserProfile } from "@/actions/supabase/profile";
import { createSupabaseServerClient } from "@/actions/supabase/server";
import { requireApprovedUser } from "@/lib/auth/access";
import { getSiteUrl } from "@/lib/site-url";

export async function submitProfileUpdate(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireApprovedUser();
  const result = parseProfileFormData(formData);

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

  revalidatePath("/profile");

  const currentEmail = user.email.trim().toLowerCase();
  if (result.data.email === currentEmail) {
    return { fields: result.fields, message: "Profile saved." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser(
    { email: result.data.email },
    {
      emailRedirectTo: `${await getSiteUrl()}/auth/callback?next=/profile`,
    },
  );

  if (error) {
    console.error("Email change request failed:", error);
    return {
      fields: result.fields,
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
