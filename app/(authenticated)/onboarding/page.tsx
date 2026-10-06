import { redirect } from "next/navigation";
import { getUserProfile } from "@/actions/supabase/profile";
import OnboardingForm from "@/app/(authenticated)/onboarding/OnboardingForm";
import { requireVerifiedAuthUser } from "@/lib/auth";

export default async function OnboardingPage() {
  const user = await requireVerifiedAuthUser();
  const profile = await getUserProfile(user.id);

  if (profile?.onboardingComplete) {
    redirect("/");
  }

  return (
    <main>
      <h1>Complete your profile</h1>
      <OnboardingForm />
    </main>
  );
}
