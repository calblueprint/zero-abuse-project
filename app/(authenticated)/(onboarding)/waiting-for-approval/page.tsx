import { redirect } from "next/navigation";
import { signOut } from "@/actions/auth/actions";
import {
  Body,
  CenterButton,
  Heading,
  PrimaryLink,
} from "@/components/auth/form";
import { requireAccessUser } from "@/lib/auth/access";

export default async function WaitingForApprovalPage() {
  const user = await requireAccessUser();

  if (user.approvalStatus === "approved") {
    redirect("/");
  }

  if (user.approvalStatus === "rejected") {
    redirect("/access-rejected");
  }

  return (
    <div>
      <Heading>Your request is in review</Heading>
      <Body>
        A ZAP admin will review your account. You&apos;ll be able to use ZAP
        once you&apos;re approved.
      </Body>
      <PrimaryLink href="/">Check again</PrimaryLink>
      <form action={signOut}>
        <CenterButton type="submit">Sign out</CenterButton>
      </form>
    </div>
  );
}
