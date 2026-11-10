"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styled, { css } from "styled-components";
import { signOut } from "@/actions/auth/actions";
import SidebarToggleIcon from "@/assets/icons/sidebar-toggle.svg";
import useAnchoredPopover from "@/lib/hooks/useAnchoredPopover";
import { getInitials } from "@/lib/utils";
import COLORS from "@/styles/colors";
import { popoverSurface } from "@/styles/popover";

type TopBarProps = {
  firstName: string;
  lastName: string;
  email: string;
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

export default function TopBar({
  firstName,
  lastName,
  email,
  isAdmin,
}: TopBarProps) {
  const pathname = usePathname();
  const tabs = isAdmin ? [...TABS, ...ADMIN_TABS] : TABS;
  const menu = useAnchoredPopover({ align: "end" });

  return (
    <Bar>
      <Side>
        {/* TODO: Enable this toggle when the sidebar is implemented. */}
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
        {/* TODO: Connect Help to the support flow when it is implemented. */}
        <Help>Help</Help>
        <Avatar {...menu.anchorProps} type="button" aria-label="Account menu">
          {getInitials(firstName, lastName)}
        </Avatar>
        <Menu {...menu.popoverProps}>
          <Identity>
            <MenuName>
              {firstName} {lastName}
            </MenuName>
            <MenuEmail>{email}</MenuEmail>
          </Identity>
          <Divider />
          <MenuLink href="/profile" onClick={menu.close}>
            Profile
          </MenuLink>
          {/* TODO: Connect Help to the support flow when it is implemented. */}
          <MenuButton type="button" disabled>
            Help
          </MenuButton>
          <form action={signOut}>
            <MenuButton type="submit">Sign out</MenuButton>
          </form>
        </Menu>
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

const Avatar = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 999px;
  background: ${COLORS.surface};
  color: ${COLORS.secondaryText};
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  cursor: pointer;
`;

const Menu = styled.div`
  ${popoverSurface}
  width: max-content;
  min-width: 220px;
  max-width: calc(100vw - 24px);
  padding: 8px;
  border-radius: 14px;
  box-shadow: 0 24px 32px rgba(0, 0, 0, 0.16);

  &:popover-open {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
`;

const Identity = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
`;

const MenuName = styled.p`
  color: ${COLORS.inkText};
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  overflow-wrap: anywhere;
`;

const MenuEmail = styled.p`
  color: ${COLORS.secondaryText};
  font-size: 13px;
  line-height: 18px;
  overflow-wrap: anywhere;
`;

const Divider = styled.hr`
  height: 1px;
  margin: 0;
  border: none;
  background: ${COLORS.divider};
`;

const menuItem = css`
  display: flex;
  align-items: center;
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border: none;
  border-radius: 10px;
  background: none;
  color: ${COLORS.inkText};
  font: inherit;
  font-size: 14px;
  line-height: 20px;
  text-align: left;
  text-decoration: none;
  cursor: pointer;

  &:hover:not(:disabled),
  &:focus-visible {
    background: ${COLORS.canvas};
    outline: none;
  }

  &:disabled {
    color: ${COLORS.mutedText};
    cursor: not-allowed;
  }
`;

const MenuLink = styled(Link)`
  ${menuItem}
`;

const MenuButton = styled.button`
  ${menuItem}
`;
