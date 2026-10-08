CREATE TABLE `icp_profile_statements` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`kind` text NOT NULL,
	`content` text NOT NULL,
	`position` integer NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `icp_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `icp_profile_statements_profile_kind_content_idx` ON `icp_profile_statements` (`profile_id`,`kind`,`content`);--> statement-breakpoint
CREATE INDEX `icp_profile_statements_profile_kind_position_idx` ON `icp_profile_statements` (`profile_id`,`kind`,`position`);--> statement-breakpoint
CREATE TABLE `icp_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`product` text NOT NULL,
	`buyer` text NOT NULL,
	`company_type` text,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `icp_profiles_project_archived_updated_idx` ON `icp_profiles` (`project_id`,`is_archived`,`updated_at`);