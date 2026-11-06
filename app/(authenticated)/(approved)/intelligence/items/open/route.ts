import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { getIntelligenceItemSourceUrl } from "@/db/queries/intelligence-library";
import { recordRecentlyAccessed } from "@/db/queries/recently-accessed";
import { requireApprovedUser } from "@/lib/auth/access";
import { isUuid } from "@/lib/validation/uuid";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return new Response("Forbidden", { status: 403 });
  }

  await requireApprovedUser();

  let itemId: string;
  try {
    const formData = await request.formData();
    const values = formData.getAll("itemId");
    if (values.length !== 1 || !isUuid(values[0])) {
      return new Response("Invalid item ID", { status: 400 });
    }
    itemId = values[0];
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  let sourceUrl: string;
  try {
    const url = await getIntelligenceItemSourceUrl(itemId);
    if (url === null) return new Response("Item not found", { status: 404 });
    sourceUrl = url;
  } catch (error) {
    console.error("Failed to load intelligence item source:", error);
    return new Response("Unable to open item", { status: 500 });
  }

  let destination: URL;
  try {
    destination = new URL(sourceUrl);
    if (destination.protocol !== "http:" && destination.protocol !== "https:") {
      return new Response("Invalid item source", { status: 422 });
    }
  } catch {
    return new Response("Invalid item source", { status: 422 });
  }

  try {
    if (!(await recordRecentlyAccessed(itemId))) {
      console.warn(
        "Intelligence item was not recorded in recent history:",
        itemId,
      );
    }
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to record recently accessed item:", error);
  }

  const response = NextResponse.redirect(destination, 303);
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
