"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SelectMenu from "@/components/SelectMenu";

export type PeopleSort = "recent" | "admins";

const options = [
  { label: "Most recent", value: "recent" },
  { label: "Admins first", value: "admins" },
];

export default function PeopleSortDropdown({ value }: { value: PeopleSort }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <SelectMenu
      options={options}
      value={value}
      variant="pill"
      pillLabel="Sort"
      onChange={next => {
        const params = new URLSearchParams(searchParams);
        if (next === "recent") params.delete("sort");
        else params.set("sort", next);
        router.push(`${pathname}${params.size ? `?${params}` : ""}`);
      }}
    />
  );
}
