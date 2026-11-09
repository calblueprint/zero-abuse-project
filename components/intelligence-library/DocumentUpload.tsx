"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DocumentUpload() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || !file.size || file.size > 8 * 1024 * 1024) {
      setMessage("Choose a nonempty file no larger than 8 MB.");
      return;
    }
    setBusy(true);
    setMessage(
      "Processing document. This can take a few minutes; keep this page open.",
    );
    try {
      const response = await fetch("/intelligence/upload", {
        method: "POST",
        body: data,
      });
      if (response.redirected)
        throw new Error(
          "Your access may have changed. Refresh the page and sign in again.",
        );
      const result = await response.json();
      setMessage(
        typeof result.message === "string"
          ? result.message
          : "Unable to import document. Please upload again.",
      );
      if (result.status === "saved" || result.status === "duplicate") {
        form.reset();
        router.refresh();
      }
    } catch {
      setMessage(
        "Unable to finish the upload. Refresh the page and try again; repeat uploads will not create duplicate items.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="document-upload-heading"
      style={{ margin: "1.5rem 0" }}
    >
      <h2 id="document-upload-heading">Import a document</h2>
      <p>
        Turn a PDF, TXT, DOCX, or EPUB into an intel item. Uploaded files and
        extracted full text are discarded after processing.
      </p>
      <form onSubmit={submit}>
        <fieldset
          disabled={busy}
          style={{ display: "grid", gap: "0.75rem", maxWidth: 560 }}
        >
          <legend>Document details</legend>
          <label>
            File (up to 8 MB)
            <input
              accept=".pdf,.txt,.docx,.epub"
              name="file"
              required
              type="file"
            />
          </label>
          <label>
            Source or publisher (optional)
            <input maxLength={255} name="sourceName" />
          </label>
          <label>
            Original source URL (optional)
            <input maxLength={2048} name="sourceUrl" type="url" />
          </label>
          <label>
            Publication date (optional)
            <input name="publishedDate" type="date" />
          </label>
          <p>
            Text-based PDFs only; scanned pages require OCR. Up to 120,000
            characters per document.
          </p>
          <button type="submit">
            {busy ? "Processing…" : "Import document"}
          </button>
        </fieldset>
      </form>
      <p aria-live="polite" role="status">
        {message}
      </p>
    </section>
  );
}
