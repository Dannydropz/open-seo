CREATE TABLE "icp_profile_statements" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"kind" text NOT NULL,
	"content" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "icp_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"product" text NOT NULL,
	"buyer" text NOT NULL,
	"company_type" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "icp_profile_statements" ADD CONSTRAINT "icp_profile_statements_profile_id_icp_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."icp_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "icp_profiles" ADD CONSTRAINT "icp_profiles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "icp_profile_statements_profile_kind_content_idx" ON "icp_profile_statements" USING btree ("profile_id","kind","content");--> statement-breakpoint
CREATE INDEX "icp_profile_statements_profile_kind_position_idx" ON "icp_profile_statements" USING btree ("profile_id","kind","position");--> statement-breakpoint
CREATE INDEX "icp_profiles_project_archived_updated_idx" ON "icp_profiles" USING btree ("project_id","is_archived","updated_at");