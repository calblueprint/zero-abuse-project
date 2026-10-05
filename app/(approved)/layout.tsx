import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/actions/supabase/profile";
import { requireVerifiedAuthUser } from "@/lib/auth";

type ApprovedLayoutProps = {
  children: ReactNode;
};

export default async function ApprovedLayout({
  children,
}: ApprovedLayoutProps) {
  const user = await requireVerifiedAuthUser();
  const profile = await getUserProfile(user.id);

  if (!profile?.onboardingComplete) {
    redirect("/onboarding");
  }

  return children;
}
