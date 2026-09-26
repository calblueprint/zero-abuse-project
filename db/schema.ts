/**
 * Define and export the application's tables from this file. Drizzle Kit reads
 * these exports when it generates SQL migrations.
 *
 * Example:
 *
 * import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
 *
 * export const items = pgTable("items", {
 *   id: uuid("id").defaultRandom().primaryKey(),
 *   name: text("name").notNull(),
 *   createdAt: timestamp("created_at", { withTimezone: true })
 *     .defaultNow()
 *     .notNull(),
 * });
 */
export {};
