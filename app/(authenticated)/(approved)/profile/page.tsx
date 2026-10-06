import { redirect } from "next/navigation";
import { getUserProfile } from "@/actions/supabase/profile";
import ProfileView from "@/app/(authenticated)/(approved)/profile/ProfileView";
import { getAuthEmails, requireVerifiedAuthUser } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await requireVerifiedAuthUser();
  const [profile, { email, pendingEmail }] = await Promise.all([
    getUserProfile(user.id),
    getAuthEmails(),
  ]);

  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <ProfileView
      accessLevel={profile.isAdmin ? "Admin" : "Member"}
      name={`${profile.firstName} ${profile.lastName}`}
      email={email ?? user.email}
      organization={profile.organization ?? ""}
      phone={profile.phone ?? ""}
      pendingEmail={pendingEmail}
    />
  );
}
