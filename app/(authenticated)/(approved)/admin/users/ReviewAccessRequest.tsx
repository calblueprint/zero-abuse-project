"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import styled from "styled-components";
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
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (event: KeyboardEvent) =>
      event.key === "Escape" && !rejecting && setOpen(false);
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [rejecting]);
  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);
  const fullName = `${applicant.firstName} ${applicant.lastName}`;
  const rows = [
    ["Name", fullName],
    ["Email", value(applicant.email)],
    ["Phone", value(applicant.phone)],
    ["Organization", value(applicant.organization)],
    ["Role", value(applicant.role)],
    ["Requested", "Date unavailable"],
  ];
  return (
    <>
      <NameButton onClick={() => setOpen(true)} type="button">
        {fullName}
      </NameButton>
      {open && (
        <Overlay
          aria-modal="true"
          onMouseDown={e => e.target === e.currentTarget && setOpen(false)}
          role="dialog"
        >
          <Dialog aria-labelledby="review-title" ref={ref} tabIndex={-1}>
            <DialogHead>
              <div>
                <h2 id="review-title">Review access request</h2>
                <p>Submitted through the sign-up form.</p>
              </div>
              <Close
                aria-label="Close"
                onClick={() => setOpen(false)}
                type="button"
              >
                ×
              </Close>
            </DialogHead>
            <Details>
              {rows.map(([label, content]) => (
                <Detail key={label}>
                  <span>{label}</span>
                  <strong>{content}</strong>
                </Detail>
              ))}
            </Details>
            <Footer>
              <p>Approving lets them sign in right away.</p>
              <Button onClick={() => setRejecting(true)} type="button">
                Reject
              </Button>
              <form action={approveUser.bind(null, applicant.userId)}>
                <Submit approve />
              </form>
            </Footer>
          </Dialog>
        </Overlay>
      )}
      {rejecting && (
        <RejectRequestDialog
          applicant={applicant}
          onClose={() => setRejecting(false)}
        />
      )}
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
const Overlay = styled.div`
  position: fixed;
  z-index: 10;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgb(24 44 70 / 36%);
`;
const Dialog = styled.div`
  width: min(100%, 560px);
  padding: 28px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 16px 40px rgb(24 44 70 / 22%);
  outline: 0;
`;
const DialogHead = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 16px;
  h2 {
    font-size: 16px;
    font-weight: 500;
    line-height: 24px;
  }
  p {
    color: #5f6875;
    font-size: 14px;
    line-height: 20px;
  }
`;
const Close = styled.button`
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  color: #5f6875;
  background: transparent;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  font-size: 26px;
  line-height: 1;
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
