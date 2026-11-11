"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import styled from "styled-components";
import { demoteUser, promoteUser, revokeUser } from "./actions";

type MemberActionsProps = {
  fullName: string;
  isAdmin?: boolean;
  userId: string;
};

type ModalKind = "make-admin" | "revoke" | null;

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
  const [isOpen, setIsOpen] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node))
        setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setModal(null);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (modal) dialogRef.current?.focus();
  }, [modal]);

  const openModal = (kind: Exclude<ModalKind, null>) => {
    setIsOpen(false);
    setModal(kind);
  };
  const isMakeAdmin = modal === "make-admin";

  return (
    <Root ref={rootRef}>
      <MenuButton
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Actions for ${fullName}`}
        onClick={() => setIsOpen(open => !open)}
        type="button"
      >
        •••
      </MenuButton>
      {isOpen && (
        <Menu role="menu">
          <MenuItem disabled type="button">
            View profile
          </MenuItem>
          {isAdmin ? (
            <form action={demoteUser.bind(null, userId)}>
              <MenuItem $danger role="menuitem" type="submit">
                Remove admin
              </MenuItem>
            </form>
          ) : (
            <>
              <MenuItem
                onClick={() => openModal("make-admin")}
                role="menuitem"
                type="button"
              >
                Make admin
              </MenuItem>
              <MenuItem
                $danger
                onClick={() => openModal("revoke")}
                role="menuitem"
                type="button"
              >
                Revoke access
              </MenuItem>
            </>
          )}
        </Menu>
      )}
      {modal && (
        <Overlay
          aria-modal="true"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setModal(null);
          }}
          role="dialog"
        >
          <Dialog
            aria-labelledby="member-action-title"
            ref={dialogRef}
            tabIndex={-1}
          >
            <h2 id="member-action-title">
              {isMakeAdmin
                ? `Make ${fullName} an admin?`
                : `Revoke ${fullName}'s access?`}
            </h2>
            <p>
              {isMakeAdmin
                ? "Admins approve requests and manage everyone's access."
                : "They can no longer access protected areas. You can restore access later from the Revoked tab."}
            </p>
            <DialogActions>
              <Cancel onClick={() => setModal(null)} type="button">
                Cancel
              </Cancel>
              <form
                action={
                  isMakeAdmin
                    ? promoteUser.bind(null, userId)
                    : revokeUser.bind(null, userId)
                }
              >
                <SubmitButton destructive={!isMakeAdmin}>
                  {isMakeAdmin ? "Make admin" : "Revoke access"}
                </SubmitButton>
              </form>
            </DialogActions>
          </Dialog>
        </Overlay>
      )}
    </Root>
  );
}

const Root = styled.div`
  position: relative;
`;
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
  position: absolute;
  z-index: 3;
  right: 0;
  top: 40px;
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
  width: min(100%, 460px);
  min-height: 180px;
  padding: 29px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 16px 40px rgb(24 44 70 / 22%);
  outline: 0;
  h2 {
    color: #20252b;
    font-size: 16px;
    font-weight: 500;
    line-height: 24px;
  }
  p {
    margin-top: 4px;
    color: #5f6875;
    font-size: 14px;
    line-height: 18px;
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
