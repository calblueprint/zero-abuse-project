"use client";

import type { MouseEvent, ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import Image from "next/image";
import styled from "styled-components";
import CloseIcon from "@/assets/icons/close.svg";
import COLORS from "@/styles/colors";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  width: number;
  // Rendered only while open, so forms start fresh each time.
  children: ReactNode;
};

/**
 * A native modal <dialog>: focus trap, Escape and focus return come from the
 * browser. Mark the element to focus first with `data-autofocus`.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  width,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedBackdrop = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const isOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target !== event.currentTarget) return false;

    const rect = event.currentTarget.getBoundingClientRect();
    return (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    );
  };

  return (
    <Dialog
      ref={dialogRef}
      $width={width}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      // Close on a backdrop click, but not when a drag started inside (text
      // selection) or the click only dismissed an open menu.
      onMouseDown={event => {
        pressedBackdrop.current =
          isOnBackdrop(event) &&
          !event.currentTarget.querySelector(":popover-open");
      }}
      onClick={event => {
        if (pressedBackdrop.current && isOnBackdrop(event)) {
          onClose();
        }
        pressedBackdrop.current = false;
      }}
    >
      <Header>
        <TitleBlock>
          <Title id={titleId}>{title}</Title>
          {description && (
            <Description id={descriptionId}>{description}</Description>
          )}
        </TitleBlock>
        <CloseButton type="button" aria-label="Close" onClick={onClose}>
          <Image src={CloseIcon} alt="" width={16} height={16} />
        </CloseButton>
      </Header>
      {open && children}
    </Dialog>
  );
}

const Dialog = styled.dialog<{ $width: number }>`
  width: min(${({ $width }) => $width}px, calc(100% - 32px));
  max-width: none;
  max-height: calc(100% - 32px);
  margin: auto;
  padding: 28px;
  border: 1px solid ${COLORS.divider};
  border-radius: 16px;
  background: ${COLORS.surface};
  color: ${COLORS.inkText};
  box-shadow: 0 24px 32px rgba(0, 0, 0, 0.16);

  &[open] {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &::backdrop {
    background: ${COLORS.scrim};
  }
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const TitleBlock = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`;

const Title = styled.h2`
  color: ${COLORS.inkText};
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  letter-spacing: -0.15px;
  overflow-wrap: anywhere;
`;

const Description = styled.p`
  color: ${COLORS.secondaryText};
  font-size: 13px;
  line-height: 18px;
`;

const CloseButton = styled.button`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 18px;
  background: ${COLORS.canvas};
  cursor: pointer;

  &:hover {
    background: ${COLORS.borderDefault};
  }
`;
