import { unstable_rethrow } from "next/navigation";
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
  const sourceUrl = form.get("sourceUrl");
  const publishedDate = form.get("publishedDate");
  if ([sourceUrl, publishedDate].some(value => typeof value !== "string")) {
    return json({ message: "Invalid source metadata." }, 400);
  }
  const url = String(sourceUrl).trim();
  const date = String(publishedDate).trim();
  if (
    url.length > 2048 ||
    (date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date))
  ) {
    return json({ message: "Invalid source URL or publication date." }, 400);
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
  try {
    const result = await processDocument(
      bytes,
      filename,
      {
        uploaded_by: user.userId,
        source_url: url || null,
        published_at: date ? new Date(date).toISOString() : null,
      },
      request.signal,
    );
    return json(result, result.status === "failed" ? 422 : 200);
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
