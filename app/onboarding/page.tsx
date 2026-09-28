import { redirect } from "next/navigation";
import { getUserProfile } from "@/actions/supabase/profile";
import OnboardingForm from "@/app/onboarding/OnboardingForm";
import { getCurrentUserId } from "@/lib/auth";

export default async function OnboardingPage() {
  const userId = await getCurrentUserId();
  const profile = await getUserProfile(userId);

  if (profile && profile.onboardingComplete) {
    redirect("/"); // Redirect to the main app if onboarding is already complete
  }

  return (
    <main>
      <h1>Complete your profile</h1>
      <OnboardingForm />
    </main>
  );
}
