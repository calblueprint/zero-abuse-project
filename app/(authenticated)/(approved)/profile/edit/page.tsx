import { redirect } from "next/navigation";
import { getUserProfile } from "@/actions/supabase/profile";
import { submitProfileUpdate } from "@/app/(authenticated)/(approved)/profile/edit/actions";
import OnboardingForm from "@/app/(authenticated)/onboarding/OnboardingForm";
import { getAuthEmails, requireVerifiedAuthUser } from "@/lib/auth";

export default async function EditProfilePage() {
  const user = await requireVerifiedAuthUser();
  const [profile, { email, pendingEmail }] = await Promise.all([
    getUserProfile(user.id),
    getAuthEmails(),
  ]);

  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <main>
      <h1>Edit your profile</h1>
      {pendingEmail && (
        <p role="status">
          Email change to <strong>{pendingEmail}</strong> is pending
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
          email: email ?? user.email,
        }}
        submitLabel="Save changes"
        showEmail
      />
    </main>
  );
}
