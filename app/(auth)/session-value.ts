"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSessionValue(key: string) {
  return useSyncExternalStore(
    subscribe,
    () => sessionStorage.getItem(key) ?? "",
    () => "",
  );
}

export function setSessionValue(key: string, value: string) {
  sessionStorage.setItem(key, value);
  emit();
}

export function removeSessionValue(key: string) {
  sessionStorage.removeItem(key);
  emit();
}
