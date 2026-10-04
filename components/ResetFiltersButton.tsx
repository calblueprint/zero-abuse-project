"use client";

import { useRouter } from "next/navigation";

export default function ResetFiltersButton() {
  const router = useRouter();

  const resetFilters = (event: React.MouseEvent<HTMLButtonElement>) => {
    const form = event.currentTarget.form;

    if (form) {
      for (const select of form.querySelectorAll("select")) {
        for (const option of select.options) {
          option.selected = false;
        }
      }

      for (const input of form.querySelectorAll<HTMLInputElement>(
        'input[type="date"]',
      )) {
        input.value = "";
      }
    }

    router.replace("/");
  };

  return (
    <button onClick={resetFilters} type="button">
      Reset filters
    </button>
  );
}
