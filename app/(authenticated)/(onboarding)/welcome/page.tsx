import { signOut } from "@/actions/auth/actions";
import {
  Body,
  CenterButton,
  Eyebrow,
  Heading,
  PrimaryLink,
} from "@/components/auth/ui";
import { requireApprovedUser } from "@/lib/auth/access";

export default async function WelcomePage() {
  const user = await requireApprovedUser();

  return (
    <div>
      <Eyebrow>Access request</Eyebrow>
      <Heading>Access approved</Heading>
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
      <PrimaryLink href="/">Open workspace</PrimaryLink>
      <form action={signOut}>
        <CenterButton type="submit">Sign out</CenterButton>
      </form>
    </div>
  );
}
