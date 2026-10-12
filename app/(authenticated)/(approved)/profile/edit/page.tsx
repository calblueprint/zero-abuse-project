import { redirect } from "next/navigation";
import { submitProfileUpdate } from "@/actions/profile/actions";
import { getUserProfile } from "@/actions/supabase/profile";
import {
  Card,
  Page,
} from "@/app/(authenticated)/(approved)/profile/ProfileView";
import OnboardingForm from "@/app/(authenticated)/(onboarding)/onboarding/OnboardingForm";
import { getAuthEmailState, requireVerifiedAuthUser } from "@/lib/auth/user";
import COLORS from "@/styles/colors";
import { Box } from "@/styles/containers";
import { H1, P2 } from "@/styles/text";

export default async function EditProfilePage() {
  const user = await requireVerifiedAuthUser();
  const [profile, emailState] = await Promise.all([
    getUserProfile(user.id),
    getAuthEmailState(),
  ]);

  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <Page>
      <Box $maxW="600px" $mx="auto" $h="auto">
        <H1 $color={COLORS.navy} $fontWeight={700}>
          Edit your profile
        </H1>
        <Card>
          {emailState.pendingEmail && (
            <P2 role="status" $color={COLORS.gray}>
              Email change to <strong>{emailState.pendingEmail}</strong> is
              pending verification. Your current email stays active until you
              confirm it.
            </P2>
          )}
          <OnboardingForm
            action={submitProfileUpdate}
            initialFields={{
              firstName: profile.firstName,
              lastName: profile.lastName,
              phone: profile.phone ?? "",
              organization: profile.organization ?? "",
              role: profile.role ?? "",
              email: emailState.email,
            }}
            submitLabel="Save changes"
            showEmail
          />
        </Card>
      </Box>
    </Page>
  );
}
