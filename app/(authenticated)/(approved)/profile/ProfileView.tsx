"use client";

import type { KeyboardEvent } from "react";
import type { ProfileTab } from "./tabs";
import { useId, useRef } from "react";
import { useSearchParams } from "next/navigation";
import styled from "styled-components";
import { Card } from "@/components/AppShell";
import { TabButton, TabRow } from "@/components/Tabs";
import Toast, { useToast } from "@/components/Toast";
import { getInitials } from "@/lib/utils";
import { toSearchParams } from "@/lib/validation/search-params";
import COLORS from "@/styles/colors";
import AccessTab, { AccessTag } from "./AccessTab";
import AiProcessingTab from "./AiProcessingTab";
import DetailsTab from "./DetailsTab";
import { parseProfileTab, PROFILE_TAB_LABELS, PROFILE_TABS } from "./tabs";

export type ProfileDetails = {
  firstName: string;
  lastName: string;
  email: string;
  pendingEmail: string | null;
  phone: string;
  organization: string;
  role: string;
};

type ProfileViewProps = {
  profile: ProfileDetails;
  isAdmin: boolean;
  approvedAt: string | null;
  approvedBy: string | null;
};

const ARROW_STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };

export default function ProfileView({
  profile,
  isAdmin,
  approvedAt,
  approvedBy,
}: ProfileViewProps) {
  const searchParams = useSearchParams();
  const selected = parseProfileTab(toSearchParams(searchParams));
  const id = useId();
  const tabRefs = useRef<Partial<Record<ProfileTab, HTMLButtonElement>>>({});
  const { toast, showToast } = useToast();
  const tabId = (tab: ProfileTab) => `${id}-${tab}-tab`;
  const panelId = (tab: ProfileTab) => `${id}-${tab}-panel`;

  const select = (tab: ProfileTab) => {
    const params = new URLSearchParams(searchParams.toString());

    if (tab === "details") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }

    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      query ? `?${query}` : window.location.pathname,
    );
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const count = PROFILE_TABS.length;
    const current = PROFILE_TABS.indexOf(selected);
    const index =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? count - 1
          : event.key in ARROW_STEPS
            ? (current + ARROW_STEPS[event.key] + count) % count
            : null;

    if (index === null) return;

    event.preventDefault();
    const tab = PROFILE_TABS[index];
    select(tab);
    tabRefs.current[tab]?.focus();
  };

  const panelProps = (tab: ProfileTab) => ({
    role: "tabpanel",
    id: panelId(tab),
    "aria-labelledby": tabId(tab),
    hidden: tab !== selected,
  });

  return (
    <ProfileCard>
      <Title>Profile</Title>
      <Identity>
        <Avatar aria-hidden="true">
          {getInitials(profile.firstName, profile.lastName)}
        </Avatar>
        <IdentityText>
          <NameLine>
            <Name>
              {profile.firstName} {profile.lastName}
            </Name>
            <AccessTag isAdmin={isAdmin} />
          </NameLine>
          <Email>{profile.email}</Email>
        </IdentityText>
      </Identity>
      <TabRow
        role="tablist"
        aria-label="Profile sections"
        onKeyDown={handleTabKeyDown}
      >
        {PROFILE_TABS.map(tab => (
          <TabButton
            key={tab}
            ref={element => {
              if (element) tabRefs.current[tab] = element;
            }}
            type="button"
            role="tab"
            id={tabId(tab)}
            aria-selected={tab === selected}
            aria-controls={panelId(tab)}
            tabIndex={tab === selected ? 0 : -1}
            $selected={tab === selected}
            onClick={() => select(tab)}
          >
            {PROFILE_TAB_LABELS[tab]}
          </TabButton>
        ))}
      </TabRow>
      {/* Panels stay mounted so an unsaved edit survives a tab switch. */}
      <div {...panelProps("details")}>
        <DetailsTab profile={profile} onNotice={showToast} />
      </div>
      <div {...panelProps("access")}>
        <AccessTab
          isAdmin={isAdmin}
          organization={profile.organization}
          approvedAt={approvedAt}
          approvedBy={approvedBy}
        />
      </div>
      <div {...panelProps("ai-processing")}>
        <AiProcessingTab isAdmin={isAdmin} />
      </div>
      <Toast toast={toast} />
    </ProfileCard>
  );
}

const ProfileCard = styled(Card)`
  gap: 24px;
  padding: 36px 48px 24px;

  @media (max-width: 600px) {
    padding: 28px 20px 24px;
  }
`;

const Title = styled.h1`
  color: ${COLORS.inkText};
  font-size: 34px;
  font-weight: 400;
  line-height: 42px;
  letter-spacing: -0.4px;
`;

const Identity = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
`;

const Avatar = styled.div`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 26px;
  background: ${COLORS.surfaceChip};
  color: ${COLORS.secondaryText};
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  letter-spacing: -0.15px;
`;

const IdentityText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const NameLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`;

const Name = styled.p`
  color: ${COLORS.inkText};
  font-size: 18px;
  font-weight: 600;
  line-height: 26px;
  letter-spacing: -0.2px;
  overflow-wrap: anywhere;
`;

const Email = styled.p`
  color: ${COLORS.secondaryText};
  font-size: 13px;
  line-height: 18px;
  overflow-wrap: anywhere;
`;
