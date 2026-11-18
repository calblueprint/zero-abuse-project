"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import styled, { css } from "styled-components";
import CheckIcon from "@/assets/icons/check.svg";
import ChevronDownSmallIcon from "@/assets/icons/chevron-down-small.svg";
import ChevronDownIcon from "@/assets/icons/chevron-down.svg";
import useAnchoredPopover from "@/lib/hooks/useAnchoredPopover";
import COLORS from "@/styles/colors";
import { popoverSurface } from "@/styles/popover";

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
};

type SelectMenuProps = {
  options: readonly SelectOption[];
  // Controlled (value + onChange) or uncontrolled (defaultValue).
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  // Posts the value with a surrounding form.
  name?: string;
  placeholder?: string;
  // "field" matches the form inputs; "pill" is the toolbar's "Sort ⌄" control.
  variant?: "field" | "pill";
  // Visible prefix inside the pill, e.g. "Sort".
  pillLabel?: string;
  id?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

export default function SelectMenu({
  options,
  value,
  defaultValue = "",
  onChange,
  name,
  placeholder,
  variant = "field",
  pillLabel,
  id,
  "aria-labelledby": labelledBy,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: SelectMenuProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const selectedValue = value ?? uncontrolledValue;
  const selected = options.find(option => option.value === selectedValue);
  const isField = variant === "field";
  const popover = useAnchoredPopover({
    align: isField ? "start" : "end",
    matchWidth: isField,
  });
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Start keyboard users on the chosen option.
  useEffect(() => {
    if (!popover.isOpen) return;

    const index = Math.max(
      options.findIndex(option => option.value === selectedValue),
      0,
    );
    optionRefs.current[index]?.focus({ preventScroll: true });
  }, [popover.isOpen, options, selectedValue]);

  const choose = (nextValue: string) => {
    if (value === undefined) {
      setUncontrolledValue(nextValue);
    }
    onChange?.(nextValue);
    popover.close();
    popover.anchorRef.current?.focus();
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = optionRefs.current.findIndex(
      option => option === document.activeElement,
    );
    const focusAt = (index: number) => {
      event.preventDefault();
      optionRefs.current[index]?.focus({ preventScroll: true });
    };

    switch (event.key) {
      case "ArrowDown":
        return focusAt(Math.min(current + 1, options.length - 1));
      case "ArrowUp":
        return focusAt(Math.max(current - 1, 0));
      case "Home":
        return focusAt(0);
      case "End":
        return focusAt(options.length - 1);
      case "Enter":
      case " ":
        event.preventDefault();
        if (current >= 0) choose(options[current].value);
        return;
      case "Tab":
        popover.close();
        return;
    }
  };

  const Trigger = isField ? FieldTrigger : PillTrigger;

  return (
    <>
      <Trigger
        {...popover.anchorProps}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-labelledby={labelledBy && id ? `${labelledBy} ${id}` : undefined}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        $invalid={invalid}
      >
        {isField ? (
          <>
            <FieldValue $placeholder={!selected}>
              {selected?.label ?? placeholder}
            </FieldValue>
            <Image src={ChevronDownSmallIcon} alt="" width={12} height={12} />
          </>
        ) : (
          <>
            <PillLabel>{pillLabel}</PillLabel>
            <PillValue>{selected?.label ?? placeholder}</PillValue>
            <Image src={ChevronDownIcon} alt="" width={14} height={14} />
          </>
        )}
      </Trigger>
      {name && <input type="hidden" name={name} value={selectedValue} />}
      <Menu
        {...popover.popoverProps}
        role="listbox"
        aria-labelledby={labelledBy}
        $minWidth={isField ? undefined : 200}
        onKeyDown={handleListKeyDown}
      >
        {options.map((option, index) => {
          const isSelected = option.value === selectedValue;

          return (
            <Option
              key={option.value}
              ref={element => {
                optionRefs.current[index] = element;
              }}
              role="option"
              tabIndex={-1}
              aria-selected={isSelected}
              onClick={() => choose(option.value)}
            >
              <OptionText>
                <OptionLabel>{option.label}</OptionLabel>
                {option.description && (
                  <OptionDescription>{option.description}</OptionDescription>
                )}
              </OptionText>
              {isSelected && (
                <Image src={CheckIcon} alt="" width={14} height={14} />
              )}
            </Option>
          );
        })}
      </Menu>
    </>
  );
}

const triggerReset = css`
  display: flex;
  align-items: center;
  border-style: solid;
  background: ${COLORS.surface};
  color: ${COLORS.inkText};
  font: inherit;
  text-align: left;
  cursor: pointer;
`;

export const fieldBox = css<{ $invalid?: boolean }>`
  height: 44px;
  padding: 0 16px;
  border: 1px solid
    ${({ $invalid }) => ($invalid ? COLORS.error : COLORS.borderControl)};
  border-radius: 12px;
  font-size: 14px;
  line-height: 20px;

  &:focus-visible {
    border-color: ${COLORS.actionNavy};
    outline: none;
    box-shadow: 0 0 0 0.5px ${COLORS.actionNavy};
  }
`;

const FieldTrigger = styled.button<{ $invalid?: boolean }>`
  ${triggerReset}
  ${fieldBox}
  gap: 8px;
  width: 100%;
`;

const FieldValue = styled.span<{ $placeholder: boolean }>`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: ${({ $placeholder }) =>
    $placeholder ? COLORS.mutedText : COLORS.inkText};
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const PillTrigger = styled.button<{ $invalid?: boolean }>`
  ${triggerReset}
  flex-shrink: 0;
  gap: 6px;
  height: 36px;
  padding: 0 12px 0 16px;
  border-width: 1px;
  border-color: ${COLORS.borderControl};
  border-radius: 999px;
  font-size: 14px;
  line-height: 20px;
  white-space: nowrap;
`;

const PillLabel = styled.span`
  color: ${COLORS.secondaryText};
`;

const PillValue = styled.span`
  color: ${COLORS.inkText};
  font-weight: 500;
`;

const Menu = styled.div<{ $minWidth?: number }>`
  ${popoverSurface}
  min-width: ${({ $minWidth }) => ($minWidth ? `${$minWidth}px` : "0")};
  padding: 8px;
  border-radius: 14px;
  box-shadow: 0 24px 32px rgba(0, 0, 0, 0.16);

  &:popover-open {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
`;

const Option = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  outline: none;

  &:hover,
  &:focus-visible,
  &[aria-selected="true"] {
    background: ${COLORS.canvas};
  }
`;

const OptionText = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const OptionLabel = styled.span`
  color: ${COLORS.inkText};
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
`;

const OptionDescription = styled.span`
  color: ${COLORS.secondaryText};
  font-size: 13px;
  line-height: 18px;
`;
