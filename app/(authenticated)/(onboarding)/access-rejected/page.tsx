import { redirect } from "next/navigation";
import { signOut } from "@/actions/auth/actions";
import { Body, Heading, PrimaryButton } from "@/components/auth/ui";
import { requireAccessUser } from "@/lib/auth/access";

export default async function AccessRejectedPage() {
  const user = await requireAccessUser();

  if (user.approvalStatus === "approved") {
    redirect("/welcome");
  }

  if (user.approvalStatus === "pending") {
    redirect("/waiting-for-approval");
  }

  return (
    <div>
      <Heading>Access not approved</Heading>
      <Body>Your request to join ZAP wasn&apos;t approved.</Body>
      <form action={signOut}>
        <PrimaryButton type="submit">Sign out</PrimaryButton>
      </form>
    </div>
  );
}
