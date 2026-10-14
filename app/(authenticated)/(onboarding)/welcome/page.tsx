import { Body, Eyebrow, Heading, PrimaryLink } from "@/components/auth/ui";
import { requireApprovedUser } from "@/lib/auth/access";
import Confetti from "./Confetti";

export default async function WelcomePage() {
  await requireApprovedUser();

  return (
    <div>
      <Confetti />
      <Eyebrow>Setup complete</Eyebrow>
      <Heading>You&rsquo;re ready</Heading>
      <Body>Explore recent intelligence and sources.</Body>
      <PrimaryLink href="/">Open workspace</PrimaryLink>
    </div>
  );
}
