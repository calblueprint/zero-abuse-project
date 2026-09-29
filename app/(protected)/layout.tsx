import { requireApprovedUser } from "@/actions/auth/access";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireApprovedUser();

  return children;
}
