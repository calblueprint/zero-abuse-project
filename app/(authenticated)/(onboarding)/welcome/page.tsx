import { redirect } from "next/navigation";
import { finishWelcome } from "@/actions/onboarding/actions";
import { Body, Eyebrow, Heading, PrimaryButton } from "@/components/auth/form";
import { requireApprovedUser } from "@/lib/auth/access";
import Confetti from "./Confetti";

export default async function WelcomePage() {
  const user = await requireApprovedUser();

  if (user.welcomeSeenAt) {
    redirect("/");
  }

  return (
    <div>
      <Confetti />
      <Eyebrow>Setup complete</Eyebrow>
      <Heading>You&rsquo;re ready</Heading>
      <Body>Explore recent intelligence and sources.</Body>
      <form action={finishWelcome}>
        <PrimaryButton type="submit">Open workspace</PrimaryButton>
      </form>
    </div>
  );
}
