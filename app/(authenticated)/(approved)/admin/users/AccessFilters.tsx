"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styled from "styled-components";

export const accessCategories = [
  "admin",
  "member",
  "revoked",
  "pending",
] as const;

export type AccessCategory = (typeof accessCategories)[number];

type Props = {
  applied: AccessCategory[];
  counts: Record<AccessCategory, number>;
};

const labels: Record<AccessCategory, string> = {
  admin: "Admin",
  member: "Member",
  pending: "Pending",
  revoked: "Revoked",
};

export default function AccessFilters({ applied, counts }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AccessCategory[]>(applied);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

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

  const navigate = (next: AccessCategory[]) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.length) params.set("access", next.join(","));
    else params.delete("access");
    params.delete("page");
    router.push(`${pathname}${params.size ? `?${params}` : ""}`);
  };
  const toggle = (category: AccessCategory) =>
    setDraft(current =>
      current.includes(category)
        ? current.filter(item => item !== category)
        : [...current, category],
    );
  const openPopover = () => {
    setDraft(applied);
    setOpen(true);
  };
  const clear = () => {
    setDraft([]);
    setOpen(false);
    navigate([]);
  };
  const apply = () => {
    setOpen(false);
    navigate(draft);
  };

  return (
    <Container ref={containerRef}>
      <Trigger
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={openPopover}
        type="button"
      >
        <Icon aria-hidden="true" viewBox="0 0 24 24">
          <path d="M4 7h16M4 17h16M8 4v6M16 14v6" />
        </Icon>
        Filters
      </Trigger>
      {open && (
        <Popover aria-label="Filter people by access" role="dialog">
          <h2>Access</h2>
          <Options>
            {accessCategories.map(category => {
              const checked = draft.includes(category);
              return (
                <Option $selected={checked} key={category}>
                  <input
                    checked={checked}
                    onChange={() => toggle(category)}
                    type="checkbox"
                  />
                  <Check aria-hidden="true" $checked={checked}>
                    {checked && (
                      <Checkmark viewBox="0 0 10 10">
                        <path d="M2 5.2 4.1 7.2 8 3" />
                      </Checkmark>
                    )}
                  </Check>
                  <Badge $category={category}>{labels[category]}</Badge>
                  <Count>{counts[category]}</Count>
                </Option>
              );
            })}
          </Options>
          <Footer>
            <Clear onClick={clear} type="button">
              Clear
            </Clear>
            <Apply onClick={apply} type="button">
              Apply
            </Apply>
          </Footer>
        </Popover>
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
  gap: 8px;
  height: 40px;
  padding: 0 16px 0 14px;
  color: #20252b;
  background: #f3f5f9;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  font: 500 14px/20px inherit;
`;
const Icon = styled.svg`
  width: 16px;
  height: 16px;
  fill: none;
  stroke: #5f6875;
  stroke-linecap: round;
  stroke-width: 1.8px;
`;
const Popover = styled.div`
  position: absolute;
  z-index: 5;
  top: calc(100% + 8px);
  left: 0;
  width: 272px;
  padding: 8px;
  color: #20252b;
  background: #fff;
  border: 1px solid #e9edf2;
  border-radius: 14px;
  box-shadow: 0 24px 32px rgb(0 0 0 / 16%);
  h2 {
    padding: 6px 12px;
    color: #8791a0;
    font-size: 13px;
    font-weight: 400;
    line-height: 18px;
  }
`;
const Options = styled.div`
  display: grid;
  gap: 2px;
`;
const Option = styled.label<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 38px;
  padding: 8px 12px;
  background: ${p => (p.$selected ? "#f3f5f8" : "transparent")};
  border-radius: 10px;
  cursor: pointer;
  input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }
  input:focus-visible + span {
    outline: 2px solid #2a3799;
    outline-offset: 2px;
  }
`;
const Check = styled.span<{ $checked: boolean }>`
  display: grid;
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  place-items: center;
  color: #fff;
  background: ${p => (p.$checked ? "#182c46" : "#fff")};
  border: 1px solid ${p => (p.$checked ? "#182c46" : "#d3d9e2")};
  border-radius: 4px;
`;
const Checkmark = styled.svg`
  width: 10px;
  height: 10px;
  fill: none;
  stroke: #fff;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5px;
`;
const Badge = styled.span<{ $category: AccessCategory }>`
  padding: 2px 8px;
  color: ${p =>
    p.$category === "admin"
      ? "#1d4fa8"
      : p.$category === "pending"
        ? "#5c4800"
        : p.$category === "revoked"
          ? "#8c3523"
          : "#5f6875"};
  background: ${p =>
    p.$category === "admin"
      ? "#dce8fa"
      : p.$category === "pending"
        ? "#fbeda3"
        : p.$category === "revoked"
          ? "#f8d9cf"
          : "#f3f6fa"};
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
`;
const Count = styled.span`
  margin-left: auto;
  color: #8791a0;
  font-size: 13px;
  line-height: 18px;
`;
const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 6px 8px;
`;
const Clear = styled.button`
  height: 34px;
  padding: 0 12px;
  color: #5f6875;
  background: transparent;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  font: 500 14px/20px inherit;
`;
const Apply = styled.button`
  height: 34px;
  padding: 0 16px;
  color: #2a3799;
  background: #dce1fb;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  font: 500 14px/20px inherit;
`;
