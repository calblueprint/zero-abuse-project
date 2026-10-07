import { redirect } from "next/navigation";
import { getUserProfile } from "@/actions/supabase/profile";
import ProfileView from "@/app/(authenticated)/(approved)/profile/ProfileView";
import { getAuthEmailState, requireVerifiedAuthUser } from "@/lib/auth/user";

export default async function ProfilePage() {
  const user = await requireVerifiedAuthUser();
  const [profile, emailState] = await Promise.all([
    getUserProfile(user.id),
    getAuthEmailState(),
  ]);

  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <ProfileView
      accessLevel={profile.isAdmin ? "Admin" : "Member"}
      name={`${profile.firstName} ${profile.lastName}`}
      email={emailState.email}
      organization={profile.organization ?? ""}
      phone={profile.phone ?? ""}
      pendingEmail={emailState.pendingEmail}
    />
  );
}
