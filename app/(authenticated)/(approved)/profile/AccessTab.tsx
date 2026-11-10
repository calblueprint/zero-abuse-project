"use client";

import Image from "next/image";
import styled from "styled-components";
import CheckIcon from "@/assets/icons/capability-check.svg";
import LocalDate from "@/components/LocalDate";
import { getCapabilities } from "@/lib/auth/capabilities";
import COLORS from "@/styles/colors";
import { Tag } from "@/styles/controls";
import {
  InfoLabel,
  InfoList,
  InfoRow,
  InfoValue,
  Section,
  SectionTitle,
} from "./styles";

type AccessTabProps = {
  isAdmin: boolean;
  organization: string;
  approvedAt: string | null;
  approvedBy: string | null;
};

export function AccessTag({ isAdmin }: { isAdmin: boolean }) {
  return isAdmin ? (
    <Tag $tint={COLORS.aiTint} $text={COLORS.aiText}>
      Admin
    </Tag>
  ) : (
    <Tag $tint={COLORS.tintNeutral} $text={COLORS.secondaryText}>
      Member
    </Tag>
  );
}

export default function AccessTab({
  isAdmin,
  organization,
  approvedAt,
  approvedBy,
}: AccessTabProps) {
  return (
    <Section>
      <SectionTitle>Your access</SectionTitle>
      <InfoList>
        <InfoRow>
          <InfoLabel>Access level</InfoLabel>
          <InfoValue>
            <AccessTag isAdmin={isAdmin} />
          </InfoValue>
        </InfoRow>
        <InfoRow>
          <InfoLabel>Organization</InfoLabel>
          <InfoValue>{organization || "—"}</InfoValue>
        </InfoRow>
        <InfoRow>
          <InfoLabel>Approved</InfoLabel>
          <InfoValue>
            {approvedAt ? (
              <LocalDate
                value={approvedAt}
                locale="en-GB"
                options={{ day: "numeric", month: "short", year: "numeric" }}
              />
            ) : (
              "—"
            )}
          </InfoValue>
        </InfoRow>
        <InfoRow>
          <InfoLabel>Approved by</InfoLabel>
          <InfoValue>{approvedBy ?? "—"}</InfoValue>
        </InfoRow>
      </InfoList>
      <SectionTitle>What you can do</SectionTitle>
      <Capabilities>
        {getCapabilities(isAdmin).map(capability => (
          <Capability key={capability}>
            <Image src={CheckIcon} alt="" width={16} height={16} />
            {capability}
          </Capability>
        ))}
      </Capabilities>
    </Section>
  );
}

const Capabilities = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0;
  list-style: none;
`;

const Capability = styled.li`
  display: flex;
  align-items: center;
  gap: 10px;
  color: ${COLORS.inkText};
  font-size: 14px;
  line-height: 20px;
`;
