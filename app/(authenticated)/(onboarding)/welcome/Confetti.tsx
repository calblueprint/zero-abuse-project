"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import COLORS from "@/styles/colors";

const colors = [COLORS.navy, COLORS.yellow, COLORS.muted];

export default function Confetti() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    confetti({
      particleCount: 80,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.9 },
      colors,
    });
    confetti({
      particleCount: 80,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.9 },
      colors,
    });

    function burst(event: PointerEvent) {
      confetti({
        particleCount: 40,
        spread: 60,
        startVelocity: 30,
        origin: {
          x: event.clientX / window.innerWidth,
          y: event.clientY / window.innerHeight,
        },
        colors,
      });
    }

    window.addEventListener("pointerdown", burst);
    return () => {
      window.removeEventListener("pointerdown", burst);
      confetti.reset();
    };
  }, []);

  return null;
}
