"use client";

import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import COLORS from "@/styles/colors";

type ToastState = { id: number; message: string };

const TOAST_MS = 4000;

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(current => ({ id: (current?.id ?? 0) + 1, message }));
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return { toast, showToast };
}

// The live region stays mounted so screen readers announce each new message.
export default function Toast({ toast }: { toast: ToastState | null }) {
  return (
    <Region role="status" aria-live="polite">
      {toast && <Message key={toast.id}>{toast.message}</Message>}
    </Region>
  );
}

const Region = styled.div`
  position: fixed;
  bottom: 46px;
  left: 50%;
  z-index: 10;
  transform: translateX(-50%);
  pointer-events: none;
`;

const Message = styled.p`
  padding: 14px 20px;
  border-radius: 12px;
  background: ${COLORS.inkText};
  color: ${COLORS.surface};
  -webkit-font-smoothing: antialiased;
  font-size: 14px;
  line-height: 20px;
  white-space: nowrap;
`;
