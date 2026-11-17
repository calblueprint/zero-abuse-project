"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import styled from "styled-components";
import Modal from "@/components/Modal";
import { approveUser } from "./actions";
import { RejectRequestDialog } from "./RejectRequest";

type Applicant = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  organization: string | null;
  role: string | null;
};
const value = (item: string | null) => item?.trim() || "Not provided";

function Submit({ approve }: { approve?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button $approve={approve} disabled={pending} type="submit">
      {pending ? "Saving…" : approve ? "Approve" : "Reject"}
    </Button>
  );
}

export default function ReviewAccessRequest({
  applicant,
}: {
  applicant: Applicant;
}) {
  const [open, setOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const fullName = `${applicant.firstName} ${applicant.lastName}`;
  const rows = [
    ["Name", fullName],
    ["Email", value(applicant.email)],
    ["Phone", value(applicant.phone)],
    ["Organization", value(applicant.organization)],
    ["Role", value(applicant.role)],
  ];
  return (
    <>
      <NameButton onClick={() => setOpen(true)} type="button">
        {fullName}
      </NameButton>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Review access request"
        description="Submitted through the sign-up form."
        width={560}
      >
        <Details>
          {rows.map(([label, content]) => (
            <Detail key={label}>
              <span>{label}</span>
              <strong>{content}</strong>
            </Detail>
          ))}
        </Details>
        <Footer>
          <p>Approving gives them access to the platform.</p>
          <Button onClick={() => setRejecting(true)} type="button">
            Reject
          </Button>
          <form action={approveUser.bind(null, applicant.userId)}>
            <Submit approve />
          </form>
        </Footer>
        <RejectRequestDialog
          applicant={applicant}
          open={rejecting}
          onClose={() => setRejecting(false)}
        />
      </Modal>
    </>
  );
}
const NameButton = styled.button`
  padding: 0;
  color: #20252b;
  background: transparent;
  border: 0;
  cursor: pointer;
  font: 500 14px/20px inherit;
  text-align: left;
`;
const Details = styled.div`
  margin-top: 12px;
`;
const Detail = styled.div`
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr);
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #e9edf2;
  span {
    color: #8791a0;
    font-size: 13px;
    line-height: 18px;
  }
  strong {
    overflow-wrap: anywhere;
    color: #20252b;
    font-size: 14px;
    font-weight: 400;
    line-height: 20px;
  }
`;
const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 20px;
  p {
    margin-right: auto;
    color: #8791a0;
    font-size: 13px;
    line-height: 18px;
  }
`;
const Button = styled.button<{ $approve?: boolean }>`
  height: 42px;
  padding: 0 16px;
  color: ${p => (p.$approve ? "#2a3799" : "#20252b")};
  background: ${p => (p.$approve ? "#dce1fb" : "transparent")};
  border: ${p => (p.$approve ? "0" : "1px solid transparent")};
  border-radius: 10px;
  cursor: pointer;
  font: 500 14px/20px inherit;
  &:disabled {
    cursor: wait;
    opacity: 0.7;
  }
`;
