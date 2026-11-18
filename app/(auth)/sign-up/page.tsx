import { redirect } from "next/navigation";
import { getVerifiedAuthUser } from "@/lib/auth/user";
import { SignUpForm } from "./sign-up-form";

export const metadata = { title: "Create account" };

type SignUpPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  if (await getVerifiedAuthUser()) {
    redirect("/");
  }

  const { error } = await searchParams;

  return <SignUpForm error={error} />;
}
