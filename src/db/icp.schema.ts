import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { projects } from "./app.schema";

// Structured buyer profiles used by opportunity analysis. The individual
// statements stay relational so later scoring can cite a specific job, pain,
// signal, or exclusion instead of treating a profile as an opaque prompt.
export const icpProfiles = sqliteTable(
  "icp_profiles",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    product: text("product").notNull(),
    buyer: text("buyer").notNull(),
    companyType: text("company_type"),
    isArchived: integer("is_archived", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("icp_profiles_project_archived_updated_idx").on(
      table.projectId,
      table.isArchived,
      table.updatedAt,
    ),
  ],
);

export const icpProfileStatements = sqliteTable(
  "icp_profile_statements",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => icpProfiles.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: ["job", "pain", "signal", "exclusion"],
    }).notNull(),
    content: text("content").notNull(),
    position: integer("position").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    uniqueIndex("icp_profile_statements_profile_kind_content_idx").on(
      table.profileId,
      table.kind,
      table.content,
    ),
    index("icp_profile_statements_profile_kind_position_idx").on(
      table.profileId,
      table.kind,
      table.position,
    ),
  ],
);
