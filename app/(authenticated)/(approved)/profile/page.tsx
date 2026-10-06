import { redirect } from "next/navigation";
import { getUserProfile } from "@/actions/supabase/profile";
import ProfileView from "@/app/(authenticated)/(approved)/profile/ProfileView";
import { requireVerifiedAuthUser } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await requireVerifiedAuthUser();
  const profile = await getUserProfile(user.id);

  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <ProfileView
      accessLevel={profile.isAdmin ? "Admin" : "Member"}
      name={`${profile.firstName} ${profile.lastName}`}
      email={profile.email ?? user.email}
      organization={profile.organization ?? ""}
      phone={profile.phone ?? ""}
    />
  );
}
