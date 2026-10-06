import { redirect } from "next/navigation";
import { getUserProfile } from "@/actions/supabase/profile";
import { submitProfileUpdate } from "@/app/(authenticated)/(approved)/profile/edit/actions";
import OnboardingForm from "@/app/(authenticated)/onboarding/OnboardingForm";
import { requireVerifiedAuthUser } from "@/lib/auth";

export default async function EditProfilePage() {
  const user = await requireVerifiedAuthUser();
  const profile = await getUserProfile(user.id);

  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <main>
      <h1>Edit your profile</h1>
      <OnboardingForm
        action={submitProfileUpdate}
        initialFields={{
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone ?? "",
          organization: profile.organization ?? "",
        }}
        submitLabel="Save changes"
      />
    </main>
  );
}
