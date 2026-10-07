import { redirect } from "next/navigation";
import { getUserProfile } from "@/actions/supabase/profile";
import ProfileView from "@/app/(authenticated)/(approved)/profile/ProfileView";
import { getPendingAuthEmail, requireVerifiedAuthUser } from "@/lib/auth/user";

export default async function ProfilePage() {
  const user = await requireVerifiedAuthUser();
  const [profile, pendingEmail] = await Promise.all([
    getUserProfile(user.id),
    getPendingAuthEmail(),
  ]);

  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <ProfileView
      accessLevel={profile.isAdmin ? "Admin" : "Member"}
      name={`${profile.firstName} ${profile.lastName}`}
      email={user.email}
      organization={profile.organization ?? ""}
      phone={profile.phone ?? ""}
      pendingEmail={pendingEmail}
    />
  );
}
