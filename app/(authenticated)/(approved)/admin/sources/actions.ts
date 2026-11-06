"use server";

import type { SourceFormState } from "./validation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { sources } from "@/db/schema";
import { sourceUrlKey } from "@/db/source-url";
import { requireAdmin } from "@/lib/auth/access";
import { isUuid } from "@/lib/validation/uuid";
import { parseSourceFormData } from "./validation";

async function setSourceActive(sourceId: string, isActive: boolean) {
  const [updatedSource] = await db
    .update(sources)
    .set({ isActive })
    .where(and(eq(sources.sourceId, sourceId), eq(sources.isActive, !isActive)))
    .returning({ sourceId: sources.sourceId });

  return Boolean(updatedSource);
}

export async function addSource(
  _prevState: SourceFormState,
  formData: FormData,
): Promise<SourceFormState> {
  const admin = await requireAdmin();
  const reactivateId = formData.get("reactivateId");
  const result = parseSourceFormData(formData);
  const { fields } = result;

  try {
    if (reactivateId !== null) {
      if (
        !isUuid(reactivateId) ||
        !(await setSourceActive(reactivateId, true))
      ) {
        return {
          fields,
          message: "That source has changed. Please try again.",
        };
      }
    } else if (!result.success) {
      return { fields, errors: result.errors };
    } else {
      const { data } = result;
      const [addedSource] = await db
        .insert(sources)
        .values({
          name: data.name,
          tier: data.tier,
          type: data.type,
          baseUrl: data.url,
          addedAt: new Date().toISOString(),
          addedBy: admin.userId,
        })
        .onConflictDoNothing()
        .returning({ sourceId: sources.sourceId });

      if (!addedSource) {
        const [match] = await db
          .select({
            sourceId: sources.sourceId,
            name: sources.name,
            isActive: sources.isActive,
          })
          .from(sources)
          .where(eq(sourceUrlKey(sources.baseUrl), sourceUrlKey(data.url)))
          .limit(1);

        if (match?.isActive) {
          return {
            fields,
            errors: { url: `This source already exists as "${match.name}".` },
          };
        }

        if (match) {
          return { fields, inactiveMatch: match };
        }

        return {
          fields,
          message: "That source has changed. Please try again.",
        };
      }
    }
  } catch (error) {
    console.error("Saving source failed:", error);
    return { fields, message: "Something went wrong. Please try again." };
  }

  revalidatePath("/admin/sources");
  return { status: reactivateId === null ? "added" : "reactivated" };
}

export type SourceStatusResult = { ok: boolean; message: string };

async function updateSourceStatus(
  sourceId: unknown,
  isActive: boolean,
): Promise<SourceStatusResult> {
  await requireAdmin();

  if (!isUuid(sourceId)) {
    return { ok: false, message: "The selected source is invalid." };
  }

  try {
    const updated = await setSourceActive(sourceId, isActive);

    // Refresh either way: a stale row means the list is out of date.
    revalidatePath("/admin/sources");

    if (!updated) {
      return {
        ok: false,
        message: "That source has changed. Please try again.",
      };
    }
  } catch (error) {
    console.error("Updating source status failed:", error);
    return { ok: false, message: "Something went wrong. Please try again." };
  }

  return {
    ok: true,
    message: isActive ? "Source reactivated" : "Source deactivated",
  };
}

export async function deactivateSource(sourceId: string) {
  return updateSourceStatus(sourceId, false);
}

export async function reactivateSource(sourceId: string) {
  return updateSourceStatus(sourceId, true);
}
