import { redirect } from "next/navigation";
import { getUserProfile } from "@/actions/supabase/profile";
import { getCurrentUserId } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getCurrentUserId();
  const profile = await getUserProfile(userId);

  if (!profile || !profile.onboardingComplete) {
    redirect("/onboarding");
  }
  return <>{children}</>;
}
