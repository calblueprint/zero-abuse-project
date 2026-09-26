import { relations } from "drizzle-orm/relations";
import {
  itelItems,
  savedGroups,
  sources,
  trendMetrics,
  trends,
  users,
} from "./schema";

export const savedGroupsRelations = relations(savedGroups, ({ one }) => ({
  user: one(users, {
    fields: [savedGroups.createdBy],
    references: [users.userId],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  savedGroups: many(savedGroups),
  trends_reviewedBy: many(trends, {
    relationName: "trends_reviewedBy_users_userId",
  }),
  trends_triggeredBy: many(trends, {
    relationName: "trends_triggeredBy_users_userId",
  }),
}));

export const trendsRelations = relations(trends, ({ one, many }) => ({
  user_reviewedBy: one(users, {
    fields: [trends.reviewedBy],
    references: [users.userId],
    relationName: "trends_reviewedBy_users_userId",
  }),
  user_triggeredBy: one(users, {
    fields: [trends.triggeredBy],
    references: [users.userId],
    relationName: "trends_triggeredBy_users_userId",
  }),
  trendMetrics: many(trendMetrics),
}));

export const trendMetricsRelations = relations(trendMetrics, ({ one }) => ({
  trend: one(trends, {
    fields: [trendMetrics.trendId],
    references: [trends.trendId],
  }),
}));

export const itelItemsRelations = relations(itelItems, ({ one }) => ({
  source: one(sources, {
    fields: [itelItems.sourceId],
    references: [sources.sourceId],
  }),
}));

export const sourcesRelations = relations(sources, ({ many }) => ({
  itelItems: many(itelItems),
}));
