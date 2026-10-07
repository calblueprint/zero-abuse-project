import { SignUpForm } from "./sign-up-form";

type SignUpPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { error } = await searchParams;

  return <SignUpForm error={error} />;
}
