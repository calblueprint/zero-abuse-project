import type { ReactNode } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { raleway } from "@/styles/fonts";

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AuthShell className={raleway.className}>{children}</AuthShell>;
}
