import {
  boolean,
  foreignKey,
  json,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

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

export const users = pgTable("users", {
  userId: uuid("user_id").defaultRandom().primaryKey().notNull(),
  name: varchar().notNull(),
  email: varchar(),
  phone: varchar(),
  affiliation: varchar(),
  isAdmin: boolean("is_admin"),
  approvalStatus: varchar("approval_status"),
  recentlyAccessed: json("recently_accessed"),
}).enableRLS();

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
