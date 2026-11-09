import "server-only";
import { spawn } from "node:child_process";
import path from "node:path";

export type DocumentResult = {
  status: "ready" | "failed";
  message?: string;
  intelligence?: {
    title: string;
    summary: string;
    [key: string]: unknown;
  };
};

let activeProcesses = 0;

export class DocumentProcessingError extends Error {}

// One isolated process per upload. Bytes travel over stdin, never through files.
export async function processDocument(
  bytes: Buffer,
  filename: string,
  signal?: AbortSignal,
) {
  if (activeProcesses >= 2) {
    throw new DocumentProcessingError(
      "Document processor is busy. Please try again shortly.",
    );
  }
  activeProcesses++;
  try {
    return await new Promise<DocumentResult>((resolve, reject) => {
      const child = spawn(
        process.env.DOCUMENT_PYTHON ||
          path.join(process.cwd(), ".venv/bin/python"),
        ["-B", "-m", "scripts.documents.cli", filename],
        {
          cwd: process.cwd(),
          signal,
          killSignal: "SIGKILL",
          stdio: ["pipe", "pipe", "ignore"],
          env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
        },
      );
      let output = "";
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(
          new DocumentProcessingError(
            "Processing timed out. Upload a shorter excerpt and try again.",
          ),
        );
      }, 240_000);
      child.on("error", () => {
        clearTimeout(timer);
        reject(
          new DocumentProcessingError(
            "Document processor unavailable. Check the Python setup.",
          ),
        );
      });
      child.stdout.on("data", (part: Buffer) => {
        output += part.toString();
        if (output.length > 128_000) {
          child.kill("SIGKILL");
        }
      });
      child.stdin.on("error", () => {});
      child.on("close", code => {
        clearTimeout(timer);
        try {
          if (code !== 0 || output.length > 128_000)
            throw new DocumentProcessingError();
          const result = JSON.parse(output) as DocumentResult;
          if (!["ready", "failed"].includes(result.status))
            throw new DocumentProcessingError();
          if (
            result.status === "ready" &&
            (!result.intelligence ||
              typeof result.intelligence.title !== "string" ||
              typeof result.intelligence.summary !== "string")
          )
            throw new DocumentProcessingError();
          resolve(result);
        } catch {
          reject(
            new DocumentProcessingError(
              "Document processing failed. Please upload again.",
            ),
          );
        }
      });
      child.stdin.end(bytes);
    });
  } finally {
    activeProcesses--;
  }
}
