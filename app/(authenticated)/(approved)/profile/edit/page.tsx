import { redirect } from "next/navigation";
import { submitProfileUpdate } from "@/actions/profile/actions";
import { getUserProfile } from "@/actions/supabase/profile";
import ProfileForm from "@/components/profile/ProfileForm";
import { getPendingAuthEmail, requireVerifiedAuthUser } from "@/lib/auth";

export default async function EditProfilePage() {
  const user = await requireVerifiedAuthUser();
  const [profile, pendingEmail] = await Promise.all([
    getUserProfile(user.id),
    getPendingAuthEmail(),
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
      <ProfileForm
        action={submitProfileUpdate}
        initialFields={{
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone ?? "",
          organization: profile.organization ?? "",
          email: user.email,
        }}
      />
    </main>
  );
}
