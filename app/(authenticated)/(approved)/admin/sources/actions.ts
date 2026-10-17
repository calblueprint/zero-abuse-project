"use server";

import type { SQLWrapper } from "drizzle-orm";
import type { SourceFormState } from "./validation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { sources } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/access";
import { isUuid } from "@/lib/validation/uuid";
import { parseSourceFormData } from "./validation";

const urlKey = (url: SQLWrapper | string) =>
  sql`regexp_replace(${url}, '^https?://(www[.])?', '')`;

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
      const [match] = await db
        .select({
          sourceId: sources.sourceId,
          name: sources.name,
          isActive: sources.isActive,
        })
        .from(sources)
        .where(eq(urlKey(sources.baseUrl), urlKey(data.url)))
        .orderBy(desc(sources.isActive))
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

      await db.insert(sources).values({
        name: data.name,
        tier: data.tier,
        type: data.type,
        baseUrl: data.url,
        addedAt: new Date().toISOString(),
        addedBy: admin.userId,
      });
    }
  } catch (error) {
    console.error("Saving source failed:", error);
    return { fields, message: "Something went wrong. Please try again." };
  }

  revalidatePath("/admin/sources");
  redirect(
    `/admin/sources?notice=${reactivateId === null ? "source-added" : "source-reactivated"}`,
  );
}

async function updateSourceStatus(sourceId: string, isActive: boolean) {
  await requireAdmin();

  if (!isUuid(sourceId)) {
    redirect("/admin/sources?notice=invalid-source");
  }

  if (!(await setSourceActive(sourceId, isActive))) {
    redirect("/admin/sources?notice=source-changed");
  }

  revalidatePath("/admin/sources");
  redirect("/admin/sources");
}

export async function deactivateSource(sourceId: string) {
  await updateSourceStatus(sourceId, false);
}

export async function reactivateSource(sourceId: string) {
  await updateSourceStatus(sourceId, true);
}
