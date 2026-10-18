import { unstable_rethrow } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recordRecentlyAccessed } from "@/db/queries/recently-accessed";
import { itelItems } from "@/db/schema";
import { requireApprovedUser } from "@/lib/auth/access";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  let trustedOrigin: string;

  try {
    const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "");
    if (siteUrl.protocol !== "http:" && siteUrl.protocol !== "https:") {
      throw new Error("Invalid site URL protocol");
    }
    trustedOrigin = siteUrl.origin;
  } catch (error) {
    console.error("Invalid NEXT_PUBLIC_SITE_URL for item-open route:", error);
    return new Response("Service unavailable", { status: 503 });
  }

  if (request.headers.get("origin") !== trustedOrigin) {
    return new Response("Forbidden", { status: 403 });
  }

  await requireApprovedUser();

  let itemId: string;
  try {
    const formData = await request.formData();
    const values = formData.getAll("itemId");
    if (
      values.length !== 1 ||
      typeof values[0] !== "string" ||
      !uuidPattern.test(values[0])
    ) {
      return new Response("Invalid item ID", { status: 400 });
    }
    itemId = values[0];
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  let sourceUrl: string;
  try {
    const [item] = await db
      .select({ sourceUrl: itelItems.sourceUrl })
      .from(itelItems)
      .where(eq(itelItems.itemId, itemId))
      .limit(1);

    if (!item) return new Response("Item not found", { status: 404 });
    sourceUrl = item.sourceUrl;
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

  return NextResponse.redirect(destination, 303);
}
