import { redirect } from "next/navigation";
import { submitProfileUpdate } from "@/actions/profile/actions";
import { getUserProfile } from "@/actions/supabase/profile";
import OnboardingForm from "@/app/(authenticated)/onboarding/OnboardingForm";
import { getAuthEmailState, requireVerifiedAuthUser } from "@/lib/auth/user";

export default async function EditProfilePage() {
  const user = await requireVerifiedAuthUser();
  const [profile, emailState] = await Promise.all([
    getUserProfile(user.id),
    getAuthEmailState(),
  ]);

  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <main>
      <h1>Edit your profile</h1>
      {emailState.pendingEmail && (
        <p role="status">
          Email change to <strong>{emailState.pendingEmail}</strong> is pending
          verification. Your current email stays active until you confirm it.
        </p>
      )}
      <OnboardingForm
        action={submitProfileUpdate}
        initialFields={{
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone ?? "",
          organization: profile.organization ?? "",
          email: emailState.email,
        }}
        submitLabel="Save changes"
        showEmail
      />
    </main>
  );
}
