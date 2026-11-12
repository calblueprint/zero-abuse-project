import { redirect } from "next/navigation";
import { signOut } from "@/actions/auth/actions";
import { Body, CenterButton, Eyebrow, Heading } from "@/components/auth/ui";
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
      <Eyebrow>Access request</Eyebrow>
      <Heading>Access declined</Heading>
      <Body
        style={{
          textAlign: "center",
          color: "#20252B",
          fontWeight: 500,
          lineHeight: "20px",
        }}
      >
        {user.email}
      </Body>
      <form action={signOut}>
        <CenterButton type="submit">Sign out</CenterButton>
      </form>
    </div>
  );
}
