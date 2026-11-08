"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import SidebarToggleIcon from "@/assets/icons/sidebar-toggle.svg";
import COLORS from "@/styles/colors";

type TopBarProps = {
  initials: string;
  isAdmin: boolean;
};

const TABS = [
  { href: "/", label: "Home" },
  { href: "/intelligence-library", label: "Intelligence library" },
];

const ADMIN_TABS = [
  { href: "/admin/sources", label: "Sources" },
  { href: "/admin/users", label: "People" },
];

const isActive = (pathname: string, href: string) =>
  href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);

export default function TopBar({ initials, isAdmin }: TopBarProps) {
  const pathname = usePathname();
  const tabs = isAdmin ? [...TABS, ...ADMIN_TABS] : TABS;

  return (
    <Bar>
      <Side>
        {/* Disabled until the sidebar is built. */}
        <SidebarToggle type="button" aria-label="Toggle sidebar" disabled>
          <Image src={SidebarToggleIcon} alt="" width={18} height={18} />
        </SidebarToggle>
      </Side>
      <Tabs aria-label="Main">
        {tabs.map(tab => {
          const active = isActive(pathname, tab.href);
          return (
            <Tab
              key={tab.href}
              href={tab.href}
              $active={active}
              aria-current={active ? "page" : undefined}
            >
              {tab.label}
            </Tab>
          );
        })}
      </Tabs>
      <Side $end>
        <Help>Help</Help>
        <Avatar href="/profile" aria-label="Profile">
          {initials}
        </Avatar>
      </Side>
    </Bar>
  );
}

const Bar = styled.header`
  display: flex;
  align-items: center;
  gap: 16px;
  height: 60px;
  padding: 0 28px;
`;

const Side = styled.div<{ $end?: boolean }>`
  display: flex;
  flex: 1 0 0;
  align-items: center;
  justify-content: ${({ $end }) => ($end ? "flex-end" : "flex-start")};
  gap: 14px;
  min-width: max-content;
`;

const SidebarToggle = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 10px;
  background: none;
`;

const Tabs = styled.nav`
  display: flex;
  gap: 4px;
  min-width: 0;
  overflow-x: auto;
`;

const Tab = styled(Link)<{ $active: boolean }>`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  height: 34px;
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
  white-space: nowrap;
`;

const Help = styled.span`
  color: ${COLORS.secondaryText};
  font-size: 14px;
  line-height: 20px;
`;

const Avatar = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 999px;
  background: ${COLORS.surface};
  color: ${COLORS.secondaryText};
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  text-decoration: none;
`;
