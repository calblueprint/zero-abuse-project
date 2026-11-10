import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  json,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase/rls";
import { sourceUrlKey } from "./source-url";

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
    role: varchar("role"),
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
    title: varchar().notNull(),
    emergedAt: timestamp("emerged_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    signalStatus: varchar("signal_status"),
    evidenceStatus: varchar("evidence_status"),
    itemIds: uuid("item_ids").array(),
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

export const sources = pgTable(
  "sources",
  {
    sourceId: uuid("source_id").defaultRandom().primaryKey().notNull(),
    name: varchar().notNull(),
    tier: varchar(),
    type: varchar(),
    baseUrl: varchar("base_url"),
    isActive: boolean("is_active").default(true).notNull(),
    lastCrawledAt: timestamp("last_crawled_at", {
      withTimezone: true,
      mode: "string",
    }),
    addedAt: timestamp("added_at", { withTimezone: true, mode: "string" }),
    addedBy: uuid("added_by"),
  },
  table => [
    foreignKey({
      columns: [table.addedBy],
      foreignColumns: [users.userId],
      name: "sources_added_by_fkey",
    }).onDelete("set null"),
    uniqueIndex("sources_url_key_unique").on(sourceUrlKey(table.baseUrl)),
  ],
).enableRLS();

export const itemLocations = pgTable(
  "item_locations",
  {
    id: uuid().defaultRandom().primaryKey(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => itelItems.itemId, { onDelete: "cascade" }),
    rawExtracted: jsonb("raw_extracted")
      .$type<Record<string, unknown>>()
      .notNull(),
    countryCode: text("country_code"),
    stateCode: text("state_code"),
    countyFips: text("county_fips"),
    countyName: text("county_name"),
    city: text(),
    regions: text()
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    resolutionStatus: text("resolution_status").notNull(),
  },
  table => [
    index("item_locations_item_id_idx").on(table.itemId),
    index("item_locations_country_state_idx").on(
      table.countryCode,
      table.stateCode,
    ),
    index("item_locations_county_fips_idx").on(table.countyFips),
    index("item_locations_city_idx").on(table.stateCode, table.city),
    check(
      "item_locations_status_check",
      sql`${table.resolutionStatus} IN ('resolved', 'partial', 'ambiguous', 'unmatched', 'conflict')`,
    ),
    check(
      "item_locations_country_code_check",
      sql`${table.countryCode} ~ '^[A-Z]{2}$'`,
    ),
    check(
      "item_locations_state_code_check",
      sql`${table.stateCode} ~ '^[A-Z]{2}$'`,
    ),
    check(
      "item_locations_county_fips_check",
      sql`${table.countyFips} ~ '^[0-9]{5}$'`,
    ),
  ],
).enableRLS();
