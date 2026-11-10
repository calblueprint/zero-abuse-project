import { redirect } from "next/navigation";
import { getUserProfile } from "@/actions/supabase/profile";
import AppShell from "@/components/AppShell";
import { getInitialUserAccess, requireApprovedUser } from "@/lib/auth/access";
import { getAuthEmailState } from "@/lib/auth/user";
import { toIsoTimestamp } from "@/lib/utils";
import ProfileView from "./ProfileView";

export default async function ProfilePage() {
  const user = await requireApprovedUser();
  const [profile, emailState] = await Promise.all([
    getUserProfile(user.userId),
    getAuthEmailState(),
  ]);

  if (!profile) {
    redirect("/onboarding");
  }

  // Zero Abuse Project emails are approved on sign-up, with no approver.
  const autoApproved =
    !profile.approvalDecidedBy &&
    getInitialUserAccess(emailState.email).approvalStatus === "approved";

  return (
    <AppShell
      firstName={profile.firstName}
      lastName={profile.lastName}
      email={emailState.email}
      isAdmin={profile.isAdmin}
    >
      <ProfileView
        profile={{
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: emailState.email,
          pendingEmail: emailState.pendingEmail,
          phone: profile.phone ?? "",
          organization: profile.organization ?? "",
          role: profile.role ?? "",
        }}
        isAdmin={profile.isAdmin}
        approvedAt={toIsoTimestamp(profile.approvalDecidedAt)}
        approvedBy={
          profile.approverName ??
          (autoApproved ? "Automatically (Zero Abuse Project email)" : null)
        }
      />
    </AppShell>
  );
}
