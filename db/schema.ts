import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  json,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase/rls";

export const approvalStatuses = ["pending", "approved", "rejected"] as const;

export const savedGroups = pgTable(
  "saved_groups",
  {
    groupId: uuid("group_id").defaultRandom().primaryKey().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    itemIds: uuid("item_ids"),
    description: text(),
    notes: text(),
    createdBy: uuid("created_by"),
  },
  table => [
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.userId],
      name: "saved_groups_created_by_fkey",
    }),
  ],
).enableRLS();

export const users = pgTable(
  "users",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    firstName: varchar("first_name").notNull(),
    lastName: varchar("last_name").notNull(),
    email: varchar("email"),
    phone: varchar("phone"),
    organization: varchar("organization"),
    onboardingComplete: boolean("onboarding_complete").default(false).notNull(),
    isAdmin: boolean("is_admin").default(false).notNull(),
    approvalStatus: varchar("approval_status", { enum: approvalStatuses })
      .default("pending")
      .notNull(),
    approvalDecidedBy: uuid("approval_decided_by"),
    approvalDecidedAt: timestamp("approval_decided_at", {
      withTimezone: true,
      mode: "string",
    }),
    recentlyAccessed: json("recently_accessed"),
  },
  table => [
    check(
      "users_approval_status_check",
      sql`${table.approvalStatus} IN ('pending', 'approved', 'rejected')`,
    ),
    foreignKey({
      columns: [table.approvalDecidedBy],
      foreignColumns: [table.userId],
      name: "users_approval_decided_by_fkey",
    }).onDelete("set null"),
  ],
).enableRLS();

export const trends = pgTable(
  "trends",
  {
    trendId: uuid("trend_id").defaultRandom().primaryKey().notNull(),
    emergedAt: timestamp("emerged_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    signalStatus: varchar("signal_status"),
    evidenceStatus: varchar("evidence_status"),
    itemIds: uuid("item_ids"),
    triggeredBy: uuid("triggered_by"),
    reviewedBy: uuid("reviewed_by"),
    description: text(),
    whySurfaced: text("why_surfaced"),
    visibility: varchar(),
    patternType: varchar("pattern_type"),
  },
  table => [
    foreignKey({
      columns: [table.reviewedBy],
      foreignColumns: [users.userId],
      name: "trends_reviewed_by_fkey",
    }),
    foreignKey({
      columns: [table.triggeredBy],
      foreignColumns: [users.userId],
      name: "trends_triggered_by_fkey",
    }),
  ],
).enableRLS();

export const trendMetrics = pgTable(
  "trend_metrics",
  {
    trendId: uuid("trend_id").defaultRandom().primaryKey().notNull(),
    metricName: varchar("metric_name").notNull(),
    metricValue: varchar("metric_value"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  },
  table => [
    foreignKey({
      columns: [table.trendId],
      foreignColumns: [trends.trendId],
      name: "trend_metrics_trend_id_fkey",
    }),
  ],
).enableRLS();

export const itelItems = pgTable(
  "itel_items",
  {
    itemId: uuid("item_id").defaultRandom().primaryKey().notNull(),
    sourceId: uuid("source_id").defaultRandom().notNull(),
    sourceUrl: varchar("source_url").notNull(),
    publishedAt: timestamp("published_at", {
      withTimezone: true,
      mode: "string",
    }),
    addedAt: timestamp("added_at", { withTimezone: true, mode: "string" }),
    editedAt: timestamp("edited_at", { withTimezone: true, mode: "string" }),
    title: varchar(),
    tldr: text(),
    embeddings: json(),
    exploitationType: varchar("exploitation_type"),
    platform: varchar(),
    technology: varchar(),
    affectedPopulation: varchar("affected_population"),
    offenderTactic: varchar("offender_tactic"),
    geography: varchar(),
    intelType: varchar("intel_type"),
    zapRelevance: varchar("zap_relevance"),
  },
  table => [
    foreignKey({
      columns: [table.sourceId],
      foreignColumns: [sources.sourceId],
      name: "itel_items_source_id_fkey",
    }),
  ],
).enableRLS();

export const sources = pgTable("sources", {
  sourceId: uuid("source_id").defaultRandom().primaryKey().notNull(),
  name: varchar().notNull(),
  tier: varchar(),
  type: varchar(),
  baseUrl: varchar("base_url"),
  isActive: boolean("is_active"),
  lastCrawledAt: timestamp("last_crawled_at", {
    withTimezone: true,
    mode: "string",
  }),
  addedAt: timestamp("added_at", { withTimezone: true, mode: "string" }),
}).enableRLS();
