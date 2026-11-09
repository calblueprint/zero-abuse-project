import { unstable_rethrow } from "next/navigation";
import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { itelItems, sources } from "@/db/schema";
import { requireApprovedUser } from "@/lib/auth/access";
import {
  DocumentProcessingError,
  processDocument,
} from "@/lib/intelligence-library/process-document";

export const runtime = "nodejs";
export const maxDuration = 300;
const MAX_BYTES = 8 * 1024 * 1024;
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return json({ message: "Forbidden" }, 403);
  }
  const user = await requireApprovedUser();
  if (
    !request.headers.get("content-type")?.startsWith("multipart/form-data;")
  ) {
    return json({ message: "Expected a file upload." }, 400);
  }
  // Bound the entire multipart body before parsing, including chunked requests.
  const reader = request.body?.getReader();
  if (!reader) return json({ message: "Choose a file." }, 400);
  let form: FormData;
  try {
    const parts: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES + 64 * 1024) {
        await reader.cancel();
        return json({ message: "Files must be no larger than 8 MB." }, 413);
      }
      parts.push(value);
    }
    form = await new Response(Buffer.concat(parts), {
      headers: { "Content-Type": request.headers.get("content-type")! },
    }).formData();
  } catch {
    return json({ message: "Invalid upload." }, 400);
  }
  const files = form.getAll("file");
  if (files.length !== 1 || !(files[0] instanceof File)) {
    return json({ message: "Choose one file to import." }, 400);
  }
  const file = files[0];
  const filename =
    file.name
      .split(/[\\/]/)
      .pop()
      ?.replace(/[\x00-\x1f\x7f]/g, "")
      .slice(0, 255) ?? "document";
  if (
    !/\.(pdf|txt|docx|epub)$/i.test(filename) ||
    !file.size ||
    file.size > MAX_BYTES
  ) {
    return json(
      { message: "Choose a nonempty PDF, TXT, DOCX, or EPUB up to 8 MB." },
      400,
    );
  }
  const sourceName = form.get("sourceName");
  const sourceUrl = form.get("sourceUrl");
  const publishedDate = form.get("publishedDate");
  if (
    [sourceName, sourceUrl, publishedDate].some(
      value => typeof value !== "string",
    )
  ) {
    return json({ message: "Invalid source metadata." }, 400);
  }
  const name = String(sourceName).trim() || filename;
  const url = String(sourceUrl).trim();
  const date = String(publishedDate).trim();
  if (
    name.length > 255 ||
    url.length > 2048 ||
    (date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date))
  ) {
    return json(
      { message: "Invalid source name, URL, or publication date." },
      400,
    );
  }
  if (url) {
    try {
      const parsed = new URL(url);
      if (
        !["https:", "http:"].includes(parsed.protocol) ||
        parsed.username ||
        parsed.password
      )
        throw new Error();
    } catch {
      return json(
        {
          message:
            "Source URL must be an HTTP or HTTPS URL without credentials.",
        },
        400,
      );
    }
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(bytes).digest("hex");
  try {
    const [existing] = await db
      .select({ id: itelItems.itemId })
      .from(itelItems)
      .where(eq(itelItems.uploadHash, hash))
      .limit(1);
    if (existing)
      return json({
        status: "duplicate",
        message: "This document is already in the library.",
      });
    const result = await processDocument(bytes, filename, request.signal);
    if (result.status !== "ready")
      return json(result, result.status === "failed" ? 422 : 200);
    const intel = result.intelligence!;
    const itemId = await db.transaction(async tx => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${hash}, 0))`,
      );
      const [duplicate] = await tx
        .select({ id: itelItems.itemId })
        .from(itelItems)
        .where(eq(itelItems.uploadHash, hash))
        .limit(1);
      if (duplicate) return null;
      const [source] = await tx
        .insert(sources)
        .values({
          name,
          type: "document",
          isActive: true,
          addedBy: user.userId,
          addedAt: new Date().toISOString(),
        })
        .returning({ id: sources.sourceId });
      const labels = (key: string) => JSON.stringify(intel[key]);
      const [item] = await tx
        .insert(itelItems)
        .values({
          sourceId: source.id,
          sourceUrl: url || null,
          uploadHash: hash,
          uploadFilename: filename,
          publishedAt: date ? new Date(date).toISOString() : null,
          addedAt: new Date().toISOString(),
          title: intel.title,
          tldr: intel.summary,
          exploitationType: labels("exploitation_type"),
          platform: labels("platform"),
          technology: labels("technology"),
          affectedPopulation: labels("affected_population"),
          offenderTactic: labels("offender_tactic"),
          geography: labels("geography"),
          intelType: labels("intel_type"),
          zapRelevance: labels("zap_program_relevance"),
        })
        .returning({ id: itelItems.itemId });
      return item.id;
    });
    return json(
      itemId
        ? {
            status: "saved",
            message: "Document added to the intelligence library.",
            itemId,
          }
        : {
            status: "duplicate",
            message: "This document is already in the library.",
          },
    );
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof DocumentProcessingError) {
      return json({ status: "failed", message: error.message }, 503);
    }
    // Never log document bytes, extracted text, or provider errors.
    return json(
      {
        status: "failed",
        message:
          "Unable to import this document. Check server configuration or upload again.",
      },
      500,
    );
  }
}
