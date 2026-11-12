"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import TopBar from "@/components/TopBar";
import COLORS from "@/styles/colors";
import { dmSans } from "@/styles/fonts";

type AppShellProps = {
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  children: ReactNode;
};

const NAV = [
  { href: "/", label: "Home" },
  { href: "/intelligence-library", label: "Intelligence library" },
];

const isActive = (pathname: string, href: string) =>
  href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);

// Figma's "Sidebar closed" layout: the top bar over one full-width card.
// Pages render their content inside a styled(Card).
export default function AppShell({
  firstName,
  lastName,
  isAdmin,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <Canvas className={dmSans.className}>
      <Sidebar $open={open} aria-hidden={!open}>
        <SidebarNav aria-label="Main">
          {NAV.map(item => {
            const active = isActive(pathname, item.href);
            return (
              <SidebarLink
                key={item.href}
                href={item.href}
                $active={active}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </SidebarLink>
            );
          })}
          <GroupHeader>
            <GroupLabel>Saved groups</GroupLabel>
            <Plus type="button" aria-label="New group">
              +
            </Plus>
          </GroupHeader>
        </SidebarNav>
      </Sidebar>
      <Column>
        <TopBar
          firstName={firstName}
          lastName={lastName}
          isAdmin={isAdmin}
          open={open}
          onToggle={() => setOpen(current => !current)}
        />
        {children}
      </Column>
    </Canvas>
  );
}

const Canvas = styled.div`
  display: flex;
  flex-direction: row;
  min-height: 100vh;
  padding: 0 12px 12px;
  background: ${COLORS.canvas};
`;

const Column = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
`;
const Sidebar = styled.aside<{ $open: boolean }>`
  width: ${({ $open }) => ($open ? "248px" : "0")};
  flex: none;
  padding: ${({ $open }) => ($open ? "72px 16px 24px" : "72px 0 24px")};
  overflow: hidden;
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  pointer-events: ${({ $open }) => ($open ? "auto" : "none")};
  transition:
    width 220ms ease,
    padding 220ms ease,
    opacity 220ms ease;
`;
const SidebarNav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;
const SidebarLink = styled(Link)<{ $active: boolean }>`
  display: flex;
  align-items: center;
  height: 36px;
  padding: 0 14px;
  border: 1px solid
    ${({ $active }) => ($active ? COLORS.borderDefault : "transparent")};
  border-radius: 999px;
  background: ${({ $active }) => ($active ? COLORS.surface : "transparent")};
  color: ${({ $active }) => ($active ? COLORS.inkText : COLORS.secondaryText)};
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? 500 : 400)};
  line-height: 20px;
  text-decoration: none;
`;
const GroupHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  padding: 0 14px;
`;
const GroupLabel = styled.span`
  color: ${COLORS.secondaryText};
  font-size: 14px;
  line-height: 20px;
`;
const Plus = styled.button`
  border: 0;
  background: none;
  color: ${COLORS.secondaryText};
  font-size: 18px;
  line-height: 20px;
  cursor: pointer;
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
