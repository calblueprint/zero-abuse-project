"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import styled from "styled-components";
import { rejectUser } from "./actions";

export type RequestApplicant = {
  userId: string;
  firstName: string;
  lastName: string;
};

type DialogProps = {
  applicant: RequestApplicant;
  onClose: () => void;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Primary disabled={pending} type="submit">
      {pending ? "Rejecting…" : "Reject request"}
    </Primary>
  );
}

export function RejectRequestDialog({ applicant, onClose }: DialogProps) {
  const [note, setNote] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const fullName = `${applicant.firstName} ${applicant.lastName}`;

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <Overlay
      aria-modal="true"
      onMouseDown={event => event.target === event.currentTarget && onClose()}
      role="dialog"
    >
      <Dialog
        aria-labelledby="reject-request-title"
        ref={dialogRef}
        tabIndex={-1}
      >
        <Heading>
          <h2 id="reject-request-title">
            Reject {fullName}
            {"'s request?"}
          </h2>
          <p>We email them that the request was not approved.</p>
        </Heading>
        <Field>
          <label htmlFor={`rejection-note-${applicant.userId}`}>
            Note to include (optional)
          </label>
          <textarea
            id={`rejection-note-${applicant.userId}`}
            onChange={event => setNote(event.target.value)}
            placeholder="Add context they can act on"
            value={note}
          />
        </Field>
        <Actions>
          <Cancel onClick={onClose} type="button">
            Cancel
          </Cancel>
          <form action={rejectUser.bind(null, applicant.userId)}>
            <SubmitButton />
          </form>
        </Actions>
      </Dialog>
    </Overlay>
  );
}

export default function RejectRequestButton({
  applicant,
}: {
  applicant: RequestApplicant;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableButton onClick={() => setOpen(true)} type="button">
        Reject
      </TableButton>
      {open && (
        <RejectRequestDialog
          applicant={applicant}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

const Overlay = styled.div`
  position: fixed;
  z-index: 20;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgb(23 31 38 / 32%);
`;
const Dialog = styled.div`
  width: min(100%, 480px);
  padding: 28px;
  background: #fff;
  border: 1px solid #e9edf2;
  border-radius: 14px;
  box-shadow: 0 24px 32px rgb(0 0 0 / 16%);
  outline: 0;
`;
const Heading = styled.div`
  h2 {
    color: #20252b;
    font-size: 16px;
    font-weight: 500;
    letter-spacing: -0.15px;
    line-height: 24px;
  }
  p {
    margin-top: 4px;
    color: #5f6875;
    font-size: 13px;
    line-height: 18px;
  }
`;
const Field = styled.div`
  display: grid;
  gap: 6px;
  margin-top: 16px;
  label {
    color: #20252b;
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
  }
  textarea {
    width: 100%;
    height: 88px;
    padding: 14px 16px;
    resize: vertical;
    color: #20252b;
    border: 1px solid #d3d9e2;
    border-radius: 12px;
    font: 400 14px/20px inherit;
  }
  textarea::placeholder {
    color: #8791a0;
  }
`;
const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
`;
const Cancel = styled.button`
  height: 42px;
  padding: 0 16px;
  color: #20252b;
  background: transparent;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  font: 500 14px/20px inherit;
`;
const Primary = styled.button`
  height: 40px;
  padding: 0 18px;
  color: #2a3799;
  background: #dce1fb;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  font: 500 14px/20px inherit;
  &:disabled {
    cursor: wait;
    opacity: 0.7;
  }
`;
const TableButton = styled.button`
  min-height: 32px;
  padding: 6px 12px;
  color: #5f6875;
  background: #fff;
  border: 1px solid #e1e5eb;
  border-radius: 8px;
  cursor: pointer;
  font: 500 13px/18px inherit;
`;
