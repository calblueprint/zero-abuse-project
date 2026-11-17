"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import Modal from "@/components/Modal";
import { PrimaryButton, SecondaryButton, TextButton } from "@/styles/controls";
import { rejectUser } from "./actions";

export type RequestApplicant = {
  userId: string;
  firstName: string;
  lastName: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <PrimaryButton disabled={pending} type="submit">
      {pending ? "Rejecting…" : "Reject request"}
    </PrimaryButton>
  );
}

export function RejectRequestDialog({
  applicant,
  open,
  onClose,
}: {
  applicant: RequestApplicant;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Reject ${applicant.firstName} ${applicant.lastName}’s request?`}
      description="This person will be unable to access the platform."
      width={480}
    >
      <form action={rejectUser.bind(null, applicant.userId)}>
        <TextButton onClick={onClose} data-autofocus type="button">
          Cancel
        </TextButton>
        <SubmitButton />
      </form>
    </Modal>
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
      <SecondaryButton $compact onClick={() => setOpen(true)} type="button">
        Reject
      </SecondaryButton>
      <RejectRequestDialog
        applicant={applicant}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
