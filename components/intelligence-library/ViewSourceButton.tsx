import styled from "styled-components";

export default function ViewSourceButton({ itemId }: { itemId: string }) {
  return (
    <form
      action="/intelligence/items/open"
      method="POST"
      rel="noopener"
      style={{ display: "inline" }}
      target="_blank"
    >
      <input name="itemId" type="hidden" value={itemId} />
      <SourceButton type="submit">View source</SourceButton>
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
