import { redirect } from "next/navigation";
import { StatusBlock } from "../ui";

type VerificationNeededPageProps = {
  searchParams: Promise<{ email?: string }>;
};

export default async function VerificationNeededPage({
  searchParams,
}: VerificationNeededPageProps) {
  const { email } = await searchParams;

  if (!email) {
    redirect("/sign-up");
  }

  return (
    <StatusBlock
      title="Account created"
      primaryHref="/login"
      primaryLabel="Log in"
    />
  );
}
