"use client";

import type { ProfileState } from "@/actions/profile/actions";
import type { ProfileDetails } from "./ProfileView";
import { useEffect, useRef, useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import styled from "styled-components";
import { resendEmailChange } from "@/actions/profile/actions";
import Modal from "@/components/Modal";
import COLORS from "@/styles/colors";
import { SoftButton, TextButton } from "@/styles/controls";
import DetailsForm from "./DetailsForm";
import {
  Actions,
  Hint,
  InfoLabel,
  InfoList,
  InfoRow,
  InfoValue,
  Section,
  SectionHead,
  SectionTitle,
} from "./styles";

type DetailsTabProps = {
  profile: ProfileDetails;
  onNotice: (message: string) => void;
};

export default function DetailsTab({ profile, onNotice }: DetailsTabProps) {
  const [editing, setEditing] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [isResending, startResend] = useTransition();

  const resend = () =>
    startResend(async () => {
      let message: string;
      try {
        const { error } = await resendEmailChange();
        message = error ?? "We sent you new links.";
      } catch (error) {
        unstable_rethrow(error);
        message = "We couldn't resend the link. Try again.";
      }
      startResend(() => onNotice(message));
    });

  const editButtonRef = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);

  useEffect(() => {
    if (wasEditing.current && !editing) {
      editButtonRef.current?.focus();
    }
    wasEditing.current = editing;
  }, [editing]);

  const handleSaved = (result: ProfileState) => {
    setEditing(false);

    if (result.status === "email-change-sent" && result.pendingEmail) {
      setSentTo(result.pendingEmail);
    } else {
      onNotice("Profile saved.");
    }
  };

  const closeEmailDialog = () => {
    setSentTo(null);
    editButtonRef.current?.focus();
  };

  const resendButton = (
    <TextButton type="button" onClick={resend} disabled={isResending}>
      {isResending ? "Sending…" : "Resend link"}
    </TextButton>
  );

  return (
    <Section>
      <SectionHead>
        <SectionTitle>Personal info</SectionTitle>
        {!editing && (
          <EditButton
            ref={editButtonRef}
            type="button"
            onClick={() => setEditing(true)}
          >
            Edit
          </EditButton>
        )}
      </SectionHead>
      {editing ? (
        <DetailsForm
          profile={profile}
          onCancel={() => setEditing(false)}
          onSaved={handleSaved}
        />
      ) : (
        <InfoList>
          <InfoRow>
            <InfoLabel>Name</InfoLabel>
            <InfoValue>
              {profile.firstName} {profile.lastName}
            </InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Email</InfoLabel>
            <InfoValue>
              {profile.email}
              {profile.pendingEmail && (
                <>
                  <PendingNote>
                    Change to <strong>{profile.pendingEmail}</strong> is waiting
                    for confirmation. Open the links we emailed you to finish
                    it.
                  </PendingNote>
                  {resendButton}
                </>
              )}
            </InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Phone</InfoLabel>
            <InfoValue>{profile.phone || "—"}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Organization</InfoLabel>
            <InfoValue>{profile.organization || "—"}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Role in organization</InfoLabel>
            <InfoValue>{profile.role || "—"}</InfoValue>
          </InfoRow>
        </InfoList>
      )}
      <Modal
        open={Boolean(sentTo)}
        onClose={closeEmailDialog}
        title="Check your emails"
        description={
          <>
            We sent links to <b>{sentTo}</b> and <b>{profile.email}</b>. Your
            email changes after you open both.
          </>
        }
        width={480}
      >
        <Actions>
          {resendButton}
          <SoftButton type="button" onClick={closeEmailDialog} data-autofocus>
            Done
          </SoftButton>
        </Actions>
      </Modal>
    </Section>
  );
}

const EditButton = styled.button`
  padding: 5px 12px;
  border: none;
  border-radius: 10px;
  background: ${COLORS.fieldFill};
  color: ${COLORS.inkText};
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  cursor: pointer;

  &:hover {
    background: ${COLORS.borderDefault};
  }
`;

const PendingNote = styled(Hint)`
  margin-top: 4px;
`;
