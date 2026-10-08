import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projects } from "./app.schema";

const isoNow = sql`to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

export const icpProfiles = pgTable(
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
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: text("created_at").notNull().default(isoNow),
    updatedAt: text("updated_at").notNull().default(isoNow),
  },
  (table) => [
    index("icp_profiles_project_archived_updated_idx").on(
      table.projectId,
      table.isArchived,
      table.updatedAt,
    ),
  ],
);

export const icpProfileStatements = pgTable(
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
    createdAt: text("created_at").notNull().default(isoNow),
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
