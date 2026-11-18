import type { CSSProperties, ReactNode } from "react";
import styled from "styled-components";

export default function ViewSourceButton({ itemId }: { itemId: string }) {
  return (
    <OpenSourceForm itemId={itemId} style={{ display: "inline" }}>
      <SourceButton type="submit">View source</SourceButton>
    </OpenSourceForm>
  );
}

export function OpenSourceForm({
  itemId,
  children,
  style,
}: {
  itemId: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <form
      action="/intelligence/items/open"
      method="POST"
      rel="noopener"
      style={style}
      target="_blank"
    >
      <input name="itemId" type="hidden" value={itemId} />
      {children}
    </form>
  );
}

const SourceButton = styled.button`
  padding: 0;
  border: 0;
  background: none;
  color: LinkText;
  cursor: pointer;
  font: inherit;
  text-decoration: underline;
`;
