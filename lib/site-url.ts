import "server-only";
import { headers } from "next/headers";

export async function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

  if (configuredUrl) {
    return configuredUrl;
  }

  return (await headers()).get("origin") ?? "http://localhost:3000";
}
