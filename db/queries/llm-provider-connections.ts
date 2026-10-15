import "server-only";
import type { ProviderConnectionStore } from "@/lib/llm/provider-connections-core";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { llmProviderConnections } from "@/db/schema";
import { ProviderConnectionValidationError } from "@/lib/llm/provider-connections-core";

const metadataChangedAt = () => new Date().toISOString();

export const drizzleProviderConnectionStore: ProviderConnectionStore = {
  async listForUser(userId) {
    return db
      .select()
      .from(llmProviderConnections)
      .where(eq(llmProviderConnections.userId, userId))
      .orderBy(
        desc(llmProviderConnections.isDefault),
        desc(llmProviderConnections.updatedAt),
      );
  },

  async findForUser(userId, connectionId) {
    const [connection] = await db
      .select()
      .from(llmProviderConnections)
      .where(
        and(
          eq(llmProviderConnections.userId, userId),
          eq(llmProviderConnections.connectionId, connectionId),
        ),
      )
      .limit(1);
    return connection ?? null;
  },

  async createForUser(userId, values) {
    return db.transaction(async transaction => {
      if (values.isDefault) {
        await transaction
          .update(llmProviderConnections)
          .set({ isDefault: false, updatedAt: metadataChangedAt() })
          .where(eq(llmProviderConnections.userId, userId));
      }

      const [created] = await transaction
        .insert(llmProviderConnections)
        .values({ userId, ...values })
        .returning();
      return created;
    });
  },

  async updateForUser(userId, connectionId, values) {
    return db.transaction(async transaction => {
      const [existing] = await transaction
        .select({ isEnabled: llmProviderConnections.isEnabled })
        .from(llmProviderConnections)
        .where(
          and(
            eq(llmProviderConnections.userId, userId),
            eq(llmProviderConnections.connectionId, connectionId),
          ),
        )
        .limit(1);

      if (!existing) {
        return null;
      }

      const isEnabled = values.isEnabled ?? existing.isEnabled;
      if (values.isDefault === true && !isEnabled) {
        throw new ProviderConnectionValidationError(
          "A disabled provider connection cannot be the default.",
        );
      }

      if (values.isDefault === true) {
        await transaction
          .update(llmProviderConnections)
          .set({ isDefault: false, updatedAt: metadataChangedAt() })
          .where(eq(llmProviderConnections.userId, userId));
      }

      const updateValues = {
        ...values,
        ...(values.isEnabled === false && { isDefault: false }),
        updatedAt: metadataChangedAt(),
      };
      const [updated] = await transaction
        .update(llmProviderConnections)
        .set(updateValues)
        .where(
          and(
            eq(llmProviderConnections.userId, userId),
            eq(llmProviderConnections.connectionId, connectionId),
          ),
        )
        .returning();
      return updated ?? null;
    });
  },

  async deleteForUser(userId, connectionId) {
    const [deleted] = await db
      .delete(llmProviderConnections)
      .where(
        and(
          eq(llmProviderConnections.userId, userId),
          eq(llmProviderConnections.connectionId, connectionId),
        ),
      )
      .returning({ connectionId: llmProviderConnections.connectionId });
    return Boolean(deleted);
  },

  async setDefaultForUser(userId, connectionId) {
    return db.transaction(async transaction => {
      const [ownedConnection] = await transaction
        .select({ connectionId: llmProviderConnections.connectionId })
        .from(llmProviderConnections)
        .where(
          and(
            eq(llmProviderConnections.userId, userId),
            eq(llmProviderConnections.connectionId, connectionId),
            eq(llmProviderConnections.isEnabled, true),
          ),
        )
        .limit(1);

      if (!ownedConnection) {
        return null;
      }

      const updatedAt = metadataChangedAt();
      await transaction
        .update(llmProviderConnections)
        .set({ isDefault: false, updatedAt })
        .where(eq(llmProviderConnections.userId, userId));

      const [updated] = await transaction
        .update(llmProviderConnections)
        .set({ isDefault: true, updatedAt })
        .where(
          and(
            eq(llmProviderConnections.userId, userId),
            eq(llmProviderConnections.connectionId, connectionId),
          ),
        )
        .returning();
      return updated ?? null;
    });
  },
};
