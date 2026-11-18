"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

type LocalDateProps = {
  value: string;
  locale?: string;
  options?: Intl.DateTimeFormatOptions;
};

export default function LocalDate({ value, locale, options }: LocalDateProps) {
  return useSyncExternalStore(
    subscribe,
    () => new Date(value).toLocaleDateString(locale, options),
    () => "",
  );
}
