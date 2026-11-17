"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import styled from "styled-components";
import Modal from "@/components/Modal";
import useAnchoredPopover from "@/lib/hooks/useAnchoredPopover";
import { popoverSurface } from "@/styles/popover";
import { demoteUser, promoteUser, revokeUser } from "./actions";

type MemberActionsProps = {
  fullName: string;
  isAdmin?: boolean;
  userId: string;
};

type ModalKind = "make-admin" | "revoke" | "remove-admin" | null;

function SubmitButton({
  children,
  destructive = false,
}: {
  children: string;
  destructive?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <ConfirmButton $destructive={destructive} disabled={pending} type="submit">
      {pending ? "Saving…" : children}
    </ConfirmButton>
  );
}

export default function MemberActions({
  fullName,
  isAdmin = false,
  userId,
}: MemberActionsProps) {
  const [modal, setModal] = useState<ModalKind>(null);
  const menu = useAnchoredPopover({ align: "end" });

  const openModal = (kind: Exclude<ModalKind, null>) => {
    menu.close();
    setModal(kind);
  };
  const isMakeAdmin = modal === "make-admin";

  return (
    <>
      <MenuButton
        {...menu.anchorProps}
        aria-label={`Actions for ${fullName}`}
        type="button"
      >
        •••
      </MenuButton>
      <Menu {...menu.popoverProps}>
        {isAdmin ? (
          <MenuItem
            $danger
            onClick={() => openModal("remove-admin")}
            type="button"
          >
            Remove admin
          </MenuItem>
        ) : (
          <>
            <MenuItem onClick={() => openModal("make-admin")} type="button">
              Make admin
            </MenuItem>
            <MenuItem $danger onClick={() => openModal("revoke")} type="button">
              Revoke access
            </MenuItem>
          </>
        )}
      </Menu>
      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={
          isMakeAdmin
            ? `Make ${fullName} an admin?`
            : modal === "remove-admin"
              ? `Remove admin access for ${fullName}?`
              : `Revoke access for ${fullName}?`
        }
        description={
          isMakeAdmin
            ? "Admins approve requests and manage access."
            : modal === "remove-admin"
              ? "They will still have member access."
              : "They will lose access to protected areas. You can restore access from the Revoked tab."
        }
        width={460}
      >
        <DialogActions>
          <Cancel onClick={() => setModal(null)} data-autofocus type="button">
            Cancel
          </Cancel>
          <form
            action={(isMakeAdmin
              ? promoteUser
              : modal === "remove-admin"
                ? demoteUser
                : revokeUser
            ).bind(null, userId)}
          >
            <SubmitButton destructive={!isMakeAdmin}>
              {isMakeAdmin
                ? "Make admin"
                : modal === "remove-admin"
                  ? "Remove admin"
                  : "Revoke access"}
            </SubmitButton>
          </form>
        </DialogActions>
      </Modal>
    </>
  );
}

const MenuButton = styled.button`
  width: 32px;
  height: 32px;
  color: #5f6875;
  background: transparent;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  font: 700 14px/1 sans-serif;
  letter-spacing: 1px;
  &:hover {
    background: #f3f5f9;
  }
`;
const Menu = styled.div`
  ${popoverSurface}
  width: 220px;
  padding: 7px;
  background: #fff;
  border: 1px solid #e1e5eb;
  border-radius: 10px;
  box-shadow: 0 8px 20px rgb(24 44 70 / 14%);
`;
const MenuItem = styled.button<{ $danger?: boolean }>`
  display: block;
  width: 100%;
  height: 40px;
  padding: 0 12px;
  color: ${p => (p.$danger ? "#9c3030" : "#20252b")};
  background: transparent;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  font: 400 14px/20px inherit;
  text-align: left;
  &:hover:not(:disabled) {
    background: #f3f5f9;
  }
  &:disabled {
    color: #8791a0;
    cursor: not-allowed;
  }
`;
const DialogActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
`;
const Cancel = styled.button`
  height: 42px;
  padding: 0 16px;
  color: #5f6875;
  background: #fff;
  border: 1px solid #e1e5eb;
  border-radius: 10px;
  cursor: pointer;
  font: 500 14px/20px inherit;
`;
const ConfirmButton = styled.button<{ $destructive: boolean }>`
  height: 40px;
  padding: 0 16px;
  color: ${p => (p.$destructive ? "#fff" : "#2a3799")};
  background: ${p => (p.$destructive ? "#a03939" : "#dce1fb")};
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  font: 500 14px/20px inherit;
  &:disabled {
    cursor: wait;
    opacity: 0.7;
  }
`;
