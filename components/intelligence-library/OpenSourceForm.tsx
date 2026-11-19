import type { ReactNode } from "react";

export default function OpenSourceForm({
  itemId,
  children,
}: {
  itemId: string;
  children: ReactNode;
}) {
  return (
    <form
      action="/intelligence/items/open"
      method="POST"
      rel="noopener"
      target="_blank"
    >
      <input name="itemId" type="hidden" value={itemId} />
      {children}
    </form>
  );
}
