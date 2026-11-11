"use client";

import { useEffect, useRef, useState } from "react";
import styled from "styled-components";

type Role = "member" | "admin";

const roles: Record<Role, { description: string; label: string }> = {
  member: {
    description: "Browse and edit the intelligence library",
    label: "Member",
  },
  admin: {
    description: "Also approve requests and manage access",
    label: "Admin",
  },
};

const isEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value);

export default function InvitePerson() {
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>("member");
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const emailError = emailTouched
    ? email.trim()
      ? isEmail(email.trim())
        ? ""
        : "Enter a valid email address."
      : "Email address is required."
    : "";

  const resetAndClose = () => {
    setEmail("");
    setEmailTouched(false);
    setRole("member");
    setRoleMenuOpen(false);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (roleMenuOpen) setRoleMenuOpen(false);
        else resetAndClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, roleMenuOpen]);

  useEffect(() => {
    if (!roleMenuOpen) return;
    roleMenuRef.current
      ?.querySelector<HTMLButtonElement>('[aria-selected="true"]')
      ?.focus();
  }, [roleMenuOpen]);

  const chooseRole = (next: Role) => {
    setRole(next);
    setRoleMenuOpen(false);
  };

  return (
    <>
      <Trigger onClick={() => setOpen(true)} type="button">
        Invite person
      </Trigger>
      {open && (
        <Overlay
          aria-modal="true"
          onMouseDown={event =>
            event.target === event.currentTarget && resetAndClose()
          }
          role="dialog"
        >
          <Dialog
            aria-labelledby="invite-person-title"
            ref={dialogRef}
            tabIndex={-1}
          >
            <Head>
              <div>
                <h2 id="invite-person-title">Invite person</h2>
                <p>They get an email to set up their account.</p>
              </div>
              <Close aria-label="Close" onClick={resetAndClose} type="button">
                <CloseIcon aria-hidden="true" viewBox="0 0 16 16">
                  <path d="m4 4 8 8M12 4l-8 8" />
                </CloseIcon>
              </Close>
            </Head>
            <Form onSubmit={event => event.preventDefault()}>
              <Fields>
                <Field>
                  <label htmlFor="invite-email">Email address</label>
                  <input
                    aria-describedby={
                      emailError ? "invite-email-error" : undefined
                    }
                    aria-invalid={Boolean(emailError)}
                    id="invite-email"
                    onBlur={() => setEmailTouched(true)}
                    onChange={event => setEmail(event.target.value)}
                    placeholder="name@organization.org"
                    required
                    type="email"
                    value={email}
                  />
                  {emailError && (
                    <Error id="invite-email-error">{emailError}</Error>
                  )}
                </Field>
                <RoleField>
                  <label id="invite-role-label">Role</label>
                  <RoleControl>
                    <RoleTrigger
                      aria-expanded={roleMenuOpen}
                      aria-haspopup="listbox"
                      aria-labelledby="invite-role-label"
                      onClick={() => setRoleMenuOpen(current => !current)}
                      onKeyDown={event => {
                        if (
                          event.key === "ArrowDown" ||
                          event.key === "ArrowUp"
                        ) {
                          event.preventDefault();
                          setRoleMenuOpen(true);
                        }
                      }}
                      type="button"
                    >
                      <span>{roles[role].label}</span>
                      <Chevron aria-hidden="true" viewBox="0 0 14 14">
                        <path d="m3 5 4 4 4-4" />
                      </Chevron>
                    </RoleTrigger>
                    {roleMenuOpen && (
                      <RoleMenu
                        aria-labelledby="invite-role-label"
                        ref={roleMenuRef}
                        role="listbox"
                      >
                        {(Object.keys(roles) as Role[]).map(option => (
                          <RoleOption
                            aria-selected={role === option}
                            key={option}
                            onClick={() => chooseRole(option)}
                            onKeyDown={event => {
                              if (
                                event.key === "ArrowDown" ||
                                event.key === "ArrowUp"
                              ) {
                                event.preventDefault();
                                const buttons = Array.from(
                                  roleMenuRef.current?.querySelectorAll<HTMLButtonElement>(
                                    '[role="option"]',
                                  ) ?? [],
                                );
                                const index = buttons.indexOf(
                                  event.currentTarget,
                                );
                                const nextIndex =
                                  event.key === "ArrowDown"
                                    ? (index + 1) % buttons.length
                                    : (index - 1 + buttons.length) %
                                      buttons.length;
                                buttons[nextIndex]?.focus();
                              }
                            }}
                            role="option"
                            type="button"
                          >
                            <span>
                              <strong>{roles[option].label}</strong>
                              <small>{roles[option].description}</small>
                            </span>
                            {role === option && (
                              <Check aria-hidden="true">✓</Check>
                            )}
                          </RoleOption>
                        ))}
                      </RoleMenu>
                    )}
                  </RoleControl>
                </RoleField>
              </Fields>
              <DropdownSpace aria-hidden="true" />
              <Actions>
                <Helper>Admins can manage people and access.</Helper>
                <Cancel onClick={resetAndClose} type="button">
                  Cancel
                </Cancel>
                <SendInvite
                  disabled
                  title="Invitation delivery is not available yet"
                  type="submit"
                >
                  Send invite
                </SendInvite>
              </Actions>
            </Form>
          </Dialog>
        </Overlay>
      )}
    </>
  );
}

const Trigger = styled.button`
  margin-left: auto;
  padding: 10px 18px;
  color: #2a3799;
  background: #dce1fb;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  font: 500 14px/20px inherit;
`;
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
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(600px, 100%);
  height: 460px;
  padding: 28px;
  background: #fff;
  border: 1px solid #e9edf2;
  border-radius: 14px;
  box-shadow: 0 24px 32px rgb(0 0 0 / 16%);
  outline: 0;
  @media (max-width: 640px), (max-height: 520px) {
    height: auto;
    max-height: calc(100vh - 40px);
    overflow: auto;
  }
`;
const Head = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  > div {
    min-width: 0;
    flex: 1;
  }
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
const Close = styled.button`
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  place-items: center;
  padding: 0;
  color: #5f6875;
  background: #f3f5f8;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
`;
const CloseIcon = styled.svg`
  width: 16px;
  height: 16px;
  fill: none;
  stroke: #5f6875;
  stroke-linecap: round;
  stroke-width: 1.5px;
`;
const Form = styled.form`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
`;
const Fields = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 200px;
  gap: 12px;
  align-items: start;
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;
const Field = styled.div`
  display: grid;
  gap: 6px;
  label {
    color: #20252b;
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
  }
  input {
    width: 100%;
    height: 44px;
    padding: 0 16px;
    color: #20252b;
    background: #fff;
    border: 1px solid #d3d9e2;
    border-radius: 10px;
    font: 400 14px/20px inherit;
    outline: 0;
  }
  input:focus {
    border-color: #2a3799;
    box-shadow: 0 0 0 2px rgb(42 55 153 / 16%);
  }
  input::placeholder {
    color: #8791a0;
  }
`;
const RoleField = styled(Field)`
  width: 200px;
  @media (max-width: 640px) {
    width: 100%;
  }
`;
const Error = styled.p`
  color: #8c3523;
  font-size: 13px;
  line-height: 18px;
`;
const RoleControl = styled.div`
  position: relative;
`;
const RoleTrigger = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 44px;
  padding: 0 16px;
  color: #20252b;
  background: #fff;
  border: 1px solid #d3d9e2;
  border-radius: 10px;
  cursor: pointer;
  font: 400 14px/20px inherit;
  text-align: left;
`;
const Chevron = styled.svg`
  width: 14px;
  height: 14px;
  fill: none;
  stroke: #5f6875;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5px;
`;
const RoleMenu = styled.div`
  position: absolute;
  z-index: 2;
  top: calc(100% + 6px);
  right: 0;
  left: 0;
  width: 200px;
  display: grid;
  gap: 2px;
  padding: 8px;
  background: #fff;
  border: 1px solid #e9edf2;
  border-radius: 14px;
  box-shadow: 0 24px 32px rgb(0 0 0 / 16%);
`;
const RoleOption = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  color: #20252b;
  background: transparent;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  font: inherit;
  text-align: left;
  &:hover,
  &[aria-selected="true"] {
    background: #f3f5f8;
  }
  strong,
  small {
    display: block;
  }
  strong {
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
  }
  small {
    margin-top: 2px;
    color: #5f6875;
    font-size: 13px;
    line-height: 18px;
  }
`;
const Check = styled.span`
  color: #182c46;
  font-weight: 700;
`;
const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  align-items: center;
  min-height: 42px;
`;
const DropdownSpace = styled.div`
  min-height: 196px;
  flex: 1;
  @media (max-width: 640px), (max-height: 520px) {
    display: none;
  }
`;
const Helper = styled.p`
  flex: 1;
  min-width: 0;
  color: #8791a0;
  font-size: 13px;
  line-height: 18px;
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
const SendInvite = styled.button`
  height: 40px;
  padding: 0 18px;
  color: #2a3799;
  background: #dce1fb;
  border: 0;
  border-radius: 10px;
  cursor: not-allowed;
  font: 500 14px/20px inherit;
  opacity: 0.6;
`;
