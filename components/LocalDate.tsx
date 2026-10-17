"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export default function LocalDate({ value }: { value: string }) {
  return useSyncExternalStore(
    subscribe,
    () => new Date(value).toLocaleDateString(),
    () => "",
  );
}
