import type { ReactNode } from "react";
import styled from "styled-components";
import TopBar from "@/components/TopBar";
import COLORS from "@/styles/colors";
import { dmSans } from "@/styles/fonts";

type AppShellProps = {
  initials: string;
  isAdmin: boolean;
  children: ReactNode;
};

// Figma's "Sidebar closed" layout: the top bar over one full-width card.
// Pages render their content inside a styled(Card).
export default function AppShell({
  initials,
  isAdmin,
  children,
}: AppShellProps) {
  return (
    <Canvas className={dmSans.className}>
      <TopBar initials={initials} isAdmin={isAdmin} />
      {children}
    </Canvas>
  );
}

const Canvas = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 0 12px 12px;
  background: ${COLORS.canvas};
`;

export const Card = styled.main`
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 24px;
  background: ${COLORS.surface};
  box-shadow:
    0 8px 120px rgba(77, 117, 204, 0.07),
    0 4px 40px -2px rgba(77, 117, 204, 0.07);
`;
