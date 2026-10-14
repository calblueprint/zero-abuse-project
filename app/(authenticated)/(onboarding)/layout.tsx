import type { ReactNode } from "react";
import { AuthShell } from "@/components/auth/ui";
import { raleway } from "@/styles/fonts";

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AuthShell className={raleway.className}>{children}</AuthShell>;
}
