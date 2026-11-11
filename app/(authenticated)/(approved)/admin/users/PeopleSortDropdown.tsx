"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styled from "styled-components";

export type PeopleSort = "recent" | "admins";

const options: Array<{ label: string; value: PeopleSort }> = [
  { label: "Most recent", value: "recent" },
  { label: "Admins first", value: "admins" },
];

export default function PeopleSortDropdown({ value }: { value: PeopleSort }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = options.find(option => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const select = (next: PeopleSort) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "recent") params.delete("sort");
    else params.set("sort", next);
    params.delete("page");
    setOpen(false);
    router.push(`${pathname}${params.size ? `?${params}` : ""}`);
  };

  return (
    <Container ref={containerRef}>
      <Trigger
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen(current => !current)}
        type="button"
      >
        <span>Sort</span>
        <strong>{selected.label}</strong>
        <Chevron aria-hidden="true" viewBox="0 0 14 14">
          <path d="m3 5 4 4 4-4" />
        </Chevron>
      </Trigger>
      {open && (
        <Menu aria-label="Sort people" role="listbox">
          {options.map(option => (
            <Option
              aria-selected={option.value === value}
              key={option.value}
              onClick={() => select(option.value)}
              role="option"
              type="button"
            >
              {option.label}
              {option.value === value && <Check aria-hidden="true">✓</Check>}
            </Option>
          ))}
        </Menu>
      )}
    </Container>
  );
}

const Container = styled.div`
  position: relative;
`;
const Trigger = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 162px;
  height: 36px;
  padding: 0 12px 0 16px;
  color: #5f6875;
  background: #f3f5f9;
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  font: 400 14px/20px inherit;
  strong {
    color: #20252b;
    font-weight: 500;
  }
  &:focus-visible {
    outline: 2px solid #2a3799;
    outline-offset: 2px;
  }
`;
const Chevron = styled.svg`
  width: 14px;
  height: 14px;
  margin-left: 2px;
  fill: none;
  stroke: #5f6875;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5px;
`;
const Menu = styled.div`
  position: absolute;
  z-index: 5;
  top: calc(100% + 8px);
  right: 0;
  display: grid;
  gap: 2px;
  width: 172px;
  padding: 8px;
  background: #fff;
  border: 1px solid #e9edf2;
  border-radius: 14px;
  box-shadow: 0 24px 32px rgb(0 0 0 / 16%);
`;
const Option = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 36px;
  padding: 8px 12px;
  color: #20252b;
  background: transparent;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  font: 400 14px/20px inherit;
  text-align: left;
  &:hover,
  &[aria-selected="true"] {
    background: #f3f5f8;
  }
`;
const Check = styled.span`
  color: #182c46;
  font-weight: 700;
`;
