"use client";

import type { ToggleEvent } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

type AnchoredPopoverOptions = {
  // Line the popover up with the anchor's left ("start") or right ("end") edge.
  align?: "start" | "end";
  // Gap between the anchor and the popover, in px.
  offset?: number;
  // Make the popover as wide as the anchor (form selects).
  matchWidth?: boolean;
};

/**
 * Wires a trigger to a native `popover="auto"` element. The browser handles
 * outside clicks, Escape and the top layer (so table scroll areas and modal
 * dialogs don't clip it); this hook places it next to the trigger.
 *
 * Remember `type="button"` on the trigger: a submit button ignores
 * popovertarget. Style the popover's display under `:popover-open` only.
 */
export default function useAnchoredPopover<
  Anchor extends HTMLElement = HTMLButtonElement,
  Popover extends HTMLElement = HTMLDivElement,
>({
  align = "start",
  offset = 6,
  matchWidth = false,
}: AnchoredPopoverOptions = {}) {
  const id = useId();
  const anchorRef = useRef<Anchor>(null);
  const popoverRef = useRef<Popover>(null);
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => {
    popoverRef.current?.hidePopover();
  }, []);

  const onBeforeToggle = (event: ToggleEvent<Popover>) => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;

    if (event.newState !== "open" || !anchor || !popover) return;

    const rect = anchor.getBoundingClientRect();
    popover.style.top = `${rect.bottom + offset}px`;

    if (align === "end") {
      popover.style.left = "auto";
      popover.style.right = `${document.documentElement.clientWidth - rect.right}px`;
    } else {
      popover.style.right = "auto";
      popover.style.left = `${rect.left}px`;
    }

    if (matchWidth) {
      popover.style.width = `${rect.width}px`;
    }
  };

  const onToggle = (event: ToggleEvent<Popover>) => {
    const open = event.newState === "open";
    const anchor = anchorRef.current;
    const popover = popoverRef.current;

    setIsOpen(open);

    if (!open || !anchor || !popover) return;

    // Flip above the trigger when it doesn't fit below.
    const rect = anchor.getBoundingClientRect();
    const height = popover.offsetHeight;

    if (
      rect.bottom + offset + height > window.innerHeight &&
      rect.top - offset - height >= 0
    ) {
      popover.style.top = `${rect.top - offset - height}px`;
    }
  };

  // The position is fixed to the viewport, so it goes stale on scroll/resize.
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = (event: Event) => {
      if (!popoverRef.current?.contains(event.target as Node)) {
        close();
      }
    };

    window.addEventListener("scroll", handleScroll, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", close);

    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
      window.removeEventListener("resize", close);
    };
  }, [isOpen, close]);

  return {
    id,
    isOpen,
    close,
    anchorRef,
    popoverRef,
    anchorProps: { ref: anchorRef, popoverTarget: id },
    popoverProps: {
      ref: popoverRef,
      id,
      popover: "auto" as const,
      onBeforeToggle,
      onToggle,
    },
  };
}
