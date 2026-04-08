CREATE TABLE `oauth_accounts` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`provider` varchar(50) NOT NULL,
	`provider_user_id` varchar(255) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`expires_at` datetime,
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.659',
	`updated_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.659',
	CONSTRAINT `oauth_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token_hash` varchar(255) NOT NULL,
	`ip_address` varchar(45),
	`user_agent` text,
	`expires_at` datetime NOT NULL,
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.659',
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255),
	`display_name` varchar(255) NOT NULL,
	`avatar_url` text,
	`pending_email` varchar(255),
	`mfa_enabled` boolean NOT NULL DEFAULT false,
	`mfa_secret` varchar(255),
	`must_change_password` boolean NOT NULL DEFAULT false,
	`email_verified_at` datetime,
	`last_login_at` datetime,
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.659',
	`updated_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.659',
	`deleted_at` datetime,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verification_tokens` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`type` enum('email_verify','password_reset','email_change') NOT NULL,
	`token_hash` varchar(255) NOT NULL,
	`expires_at` datetime NOT NULL,
	`used_at` datetime,
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.660',
	CONSTRAINT `verification_tokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invitation_target_permissions` (
	`id` varchar(36) NOT NULL,
	`invitation_target_id` varchar(36) NOT NULL,
	`permission_key` varchar(191) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.692',
	CONSTRAINT `invitation_target_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitation_target_permissions_target_key_uidx` UNIQUE(`invitation_target_id`,`permission_key`)
);
--> statement-breakpoint
CREATE TABLE `invitation_target_roles` (
	`id` varchar(36) NOT NULL,
	`invitation_target_id` varchar(36) NOT NULL,
	`role_id` varchar(36) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.692',
	CONSTRAINT `invitation_target_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitation_target_roles_target_role_uidx` UNIQUE(`invitation_target_id`,`role_id`)
);
--> statement-breakpoint
CREATE TABLE `invitation_targets` (
	`id` varchar(36) NOT NULL,
	`invitation_id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.692',
	CONSTRAINT `invitation_targets_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitation_targets_invitation_org_uidx` UNIQUE(`invitation_id`,`organization_id`)
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` varchar(36) NOT NULL,
	`inviter_org_id` varchar(36) NOT NULL,
	`invited_by_user_id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`status` enum('sent','accepted','revoked') NOT NULL DEFAULT 'sent',
	`allowed_auth_methods` json,
	`sent_at` datetime NOT NULL,
	`expires_at` datetime NOT NULL,
	`accepted_at` datetime,
	`revoked_at` datetime,
	`consumed_by_user_id` varchar(36),
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.692',
	`updated_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.692',
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitations_token_hash_uidx` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `organization_auth_settings` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`password_auth_enabled` boolean NOT NULL DEFAULT true,
	`google_oauth_enabled` boolean NOT NULL DEFAULT false,
	`github_oauth_enabled` boolean NOT NULL DEFAULT false,
	`mfa_enforced` boolean NOT NULL DEFAULT false,
	`mfa_enforced_at` datetime,
	`mfa_grace_period_days` int NOT NULL DEFAULT 7,
	`allowed_email_domains` json,
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.692',
	`updated_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.692',
	CONSTRAINT `organization_auth_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_auth_settings_organization_id_unique` UNIQUE(`organization_id`)
);
--> statement-breakpoint
CREATE TABLE `organization_members` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`role_id` varchar(36),
	`joined_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.692',
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.692',
	`updated_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.692',
	CONSTRAINT `organization_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `org_members_org_user_uidx` UNIQUE(`organization_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`logo_url` text,
	`settings` json,
	`trial_expires_at` datetime,
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.691',
	`updated_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.691',
	`deleted_at` datetime,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `permission_assignments` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`organization_id` varchar(36),
	`permission_key` varchar(191) NOT NULL,
	`assigned_by_user_id` varchar(36),
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.692',
	`updated_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.692',
	CONSTRAINT `permission_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `permission_assignments_user_key_org_uidx` UNIQUE(`user_id`,`permission_key`,`organization_id`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` varchar(36) NOT NULL,
	`role_id` varchar(36) NOT NULL,
	`resource` varchar(100) NOT NULL,
	`action` varchar(50) NOT NULL,
	`scope` varchar(50) NOT NULL,
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `role_assignments` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`role_id` varchar(36) NOT NULL,
	`organization_id` varchar(36),
	`assigned_by_user_id` varchar(36),
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.692',
	`updated_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.692',
	CONSTRAINT `role_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `role_assignments_user_role_org_uidx` UNIQUE(`user_id`,`role_id`,`organization_id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36),
	`name` varchar(100) NOT NULL,
	`description` text,
	`is_system` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.692',
	`updated_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.692',
	CONSTRAINT `roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `labels` (
	`id` varchar(36) NOT NULL,
	`project_id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(7),
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.694',
	CONSTRAINT `labels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_members` (
	`id` varchar(36) NOT NULL,
	`project_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`role_id` varchar(36),
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.693',
	CONSTRAINT `project_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`slug` varchar(255) NOT NULL,
	`color` varchar(7),
	`icon` varchar(50),
	`status` enum('active','archived','deleted') NOT NULL DEFAULT 'active',
	`created_by` varchar(36),
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.693',
	`updated_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.693',
	`deleted_at` datetime,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_statuses` (
	`id` varchar(36) NOT NULL,
	`workflow_id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(7),
	`position` int NOT NULL DEFAULT 0,
	`is_initial` boolean NOT NULL DEFAULT false,
	`is_final` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.694',
	CONSTRAINT `workflow_statuses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflows` (
	`id` varchar(36) NOT NULL,
	`project_id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`is_default` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.694',
	`updated_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.694',
	CONSTRAINT `workflows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checklist_items` (
	`id` varchar(36) NOT NULL,
	`checklist_id` varchar(36) NOT NULL,
	`title` varchar(500) NOT NULL,
	`is_completed` boolean NOT NULL DEFAULT false,
	`position` int NOT NULL DEFAULT 0,
	`completed_by` varchar(36),
	`completed_at` datetime,
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.695',
	`updated_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.695',
	CONSTRAINT `checklist_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checklists` (
	`id` varchar(36) NOT NULL,
	`task_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.695',
	CONSTRAINT `checklists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_dependencies` (
	`id` varchar(36) NOT NULL,
	`task_id` varchar(36) NOT NULL,
	`depends_on_task_id` varchar(36) NOT NULL,
	`type` enum('blocks','blocked_by') NOT NULL,
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.695',
	CONSTRAINT `task_dependencies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_labels` (
	`task_id` varchar(36) NOT NULL,
	`label_id` varchar(36) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `task_watchers` (
	`task_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` varchar(36) NOT NULL,
	`project_id` varchar(36) NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`status_id` varchar(36) NOT NULL,
	`priority` enum('none','low','medium','high','critical') NOT NULL DEFAULT 'none',
	`assignee_id` varchar(36),
	`reporter_id` varchar(36) NOT NULL,
	`parent_task_id` varchar(36),
	`due_date` datetime,
	`start_date` datetime,
	`estimated_hours` decimal(8,2),
	`position` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.695',
	`updated_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.695',
	`deleted_at` datetime,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comment_mentions` (
	`id` varchar(36) NOT NULL,
	`comment_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.697',
	CONSTRAINT `comment_mentions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` varchar(36) NOT NULL,
	`entity_type` varchar(50) NOT NULL,
	`entity_id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`body` text NOT NULL,
	`visibility` varchar(10) NOT NULL DEFAULT 'public',
	`parent_comment_id` varchar(36),
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.697',
	`updated_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.697',
	`deleted_at` datetime,
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `activity_log` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`actor_id` varchar(36),
	`actor_display` varchar(255) NOT NULL,
	`entity_type` varchar(50) NOT NULL,
	`entity_id` varchar(36) NOT NULL,
	`action` varchar(100) NOT NULL,
	`changes` json,
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.698',
	CONSTRAINT `activity_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`event_type` varchar(100) NOT NULL,
	`channel` varchar(50) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.699',
	`updated_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.699',
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`type` varchar(100) NOT NULL,
	`title` varchar(500) NOT NULL,
	`body` text,
	`entity_type` varchar(50),
	`entity_id` varchar(36),
	`read_at` datetime,
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.699',
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` varchar(36) NOT NULL,
	`entity_type` varchar(50) NOT NULL,
	`entity_id` varchar(36) NOT NULL,
	`uploaded_by` varchar(36) NOT NULL,
	`filename` varchar(500) NOT NULL,
	`mime_type` varchar(255) NOT NULL,
	`size_bytes` bigint NOT NULL,
	`storage_path` varchar(1000) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`scan_status` enum('pending','clean','infected','skipped') NOT NULL DEFAULT 'pending',
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.701',
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_filters` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`entity_type` varchar(50) NOT NULL,
	`filters` json NOT NULL,
	`created_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.702',
	`updated_at` datetime NOT NULL DEFAULT '2026-04-08 19:22:22.702',
	CONSTRAINT `saved_filters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `oauth_accounts` ADD CONSTRAINT `oauth_accounts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verification_tokens` ADD CONSTRAINT `verification_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invitation_target_permissions` ADD CONSTRAINT `inv_target_perms_target_id_fk` FOREIGN KEY (`invitation_target_id`) REFERENCES `invitation_targets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invitation_target_roles` ADD CONSTRAINT `inv_target_roles_target_id_fk` FOREIGN KEY (`invitation_target_id`) REFERENCES `invitation_targets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invitation_target_roles` ADD CONSTRAINT `invitation_target_roles_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invitation_targets` ADD CONSTRAINT `invitation_targets_invitation_id_invitations_id_fk` FOREIGN KEY (`invitation_id`) REFERENCES `invitations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invitation_targets` ADD CONSTRAINT `invitation_targets_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_inviter_org_id_organizations_id_fk` FOREIGN KEY (`inviter_org_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_invited_by_user_id_users_id_fk` FOREIGN KEY (`invited_by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_consumed_by_user_id_users_id_fk` FOREIGN KEY (`consumed_by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organization_auth_settings` ADD CONSTRAINT `organization_auth_settings_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organization_members` ADD CONSTRAINT `organization_members_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organization_members` ADD CONSTRAINT `organization_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organization_members` ADD CONSTRAINT `organization_members_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permission_assignments` ADD CONSTRAINT `permission_assignments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permission_assignments` ADD CONSTRAINT `permission_assignments_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permission_assignments` ADD CONSTRAINT `permission_assignments_assigned_by_user_id_users_id_fk` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permissions` ADD CONSTRAINT `permissions_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_assignments` ADD CONSTRAINT `role_assignments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_assignments` ADD CONSTRAINT `role_assignments_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_assignments` ADD CONSTRAINT `role_assignments_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_assignments` ADD CONSTRAINT `role_assignments_assigned_by_user_id_users_id_fk` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `roles` ADD CONSTRAINT `roles_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `labels` ADD CONSTRAINT `labels_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_members` ADD CONSTRAINT `project_members_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_members` ADD CONSTRAINT `project_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflow_statuses` ADD CONSTRAINT `workflow_statuses_workflow_id_workflows_id_fk` FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflows` ADD CONSTRAINT `workflows_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `checklist_items` ADD CONSTRAINT `checklist_items_checklist_id_checklists_id_fk` FOREIGN KEY (`checklist_id`) REFERENCES `checklists`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `checklist_items` ADD CONSTRAINT `checklist_items_completed_by_users_id_fk` FOREIGN KEY (`completed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `checklists` ADD CONSTRAINT `checklists_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_dependencies` ADD CONSTRAINT `task_dependencies_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_dependencies` ADD CONSTRAINT `task_dependencies_depends_on_task_id_tasks_id_fk` FOREIGN KEY (`depends_on_task_id`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_labels` ADD CONSTRAINT `task_labels_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_labels` ADD CONSTRAINT `task_labels_label_id_labels_id_fk` FOREIGN KEY (`label_id`) REFERENCES `labels`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_watchers` ADD CONSTRAINT `task_watchers_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_watchers` ADD CONSTRAINT `task_watchers_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_status_id_workflow_statuses_id_fk` FOREIGN KEY (`status_id`) REFERENCES `workflow_statuses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assignee_id_users_id_fk` FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_reporter_id_users_id_fk` FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comment_mentions` ADD CONSTRAINT `comment_mentions_comment_id_comments_id_fk` FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comment_mentions` ADD CONSTRAINT `comment_mentions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activity_log` ADD CONSTRAINT `activity_log_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activity_log` ADD CONSTRAINT `activity_log_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_preferences` ADD CONSTRAINT `notification_preferences_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_filters` ADD CONSTRAINT `saved_filters_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_filters` ADD CONSTRAINT `saved_filters_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `oauth_provider_idx` ON `oauth_accounts` (`provider`,`provider_user_id`);--> statement-breakpoint
CREATE INDEX `oauth_user_idx` ON `oauth_accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_token_idx` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `verification_tokens_user_idx` ON `verification_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_tokens_hash_idx` ON `verification_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `invitation_target_permissions_target_idx` ON `invitation_target_permissions` (`invitation_target_id`);--> statement-breakpoint
CREATE INDEX `invitation_target_roles_target_idx` ON `invitation_target_roles` (`invitation_target_id`);--> statement-breakpoint
CREATE INDEX `invitation_target_roles_role_idx` ON `invitation_target_roles` (`role_id`);--> statement-breakpoint
CREATE INDEX `invitation_targets_invitation_idx` ON `invitation_targets` (`invitation_id`);--> statement-breakpoint
CREATE INDEX `invitation_targets_org_idx` ON `invitation_targets` (`organization_id`);--> statement-breakpoint
CREATE INDEX `invitations_inviter_org_idx` ON `invitations` (`inviter_org_id`);--> statement-breakpoint
CREATE INDEX `invitations_email_idx` ON `invitations` (`email`);--> statement-breakpoint
CREATE INDEX `invitations_status_idx` ON `invitations` (`status`);--> statement-breakpoint
CREATE INDEX `org_members_org_idx` ON `organization_members` (`organization_id`);--> statement-breakpoint
CREATE INDEX `org_members_user_idx` ON `organization_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `permission_assignments_user_idx` ON `permission_assignments` (`user_id`);--> statement-breakpoint
CREATE INDEX `permission_assignments_org_idx` ON `permission_assignments` (`organization_id`);--> statement-breakpoint
CREATE INDEX `permissions_role_idx` ON `permissions` (`role_id`);--> statement-breakpoint
CREATE INDEX `role_assignments_user_idx` ON `role_assignments` (`user_id`);--> statement-breakpoint
CREATE INDEX `role_assignments_role_idx` ON `role_assignments` (`role_id`);--> statement-breakpoint
CREATE INDEX `role_assignments_org_idx` ON `role_assignments` (`organization_id`);--> statement-breakpoint
CREATE INDEX `roles_org_idx` ON `roles` (`organization_id`);--> statement-breakpoint
CREATE INDEX `labels_project_idx` ON `labels` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_members_project_idx` ON `project_members` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_members_user_idx` ON `project_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `projects_org_idx` ON `projects` (`organization_id`);--> statement-breakpoint
CREATE INDEX `projects_slug_idx` ON `projects` (`organization_id`,`slug`);--> statement-breakpoint
CREATE INDEX `wf_statuses_workflow_idx` ON `workflow_statuses` (`workflow_id`);--> statement-breakpoint
CREATE INDEX `workflows_project_idx` ON `workflows` (`project_id`);--> statement-breakpoint
CREATE INDEX `checklist_items_checklist_idx` ON `checklist_items` (`checklist_id`);--> statement-breakpoint
CREATE INDEX `checklists_task_idx` ON `checklists` (`task_id`);--> statement-breakpoint
CREATE INDEX `task_deps_task_idx` ON `task_dependencies` (`task_id`);--> statement-breakpoint
CREATE INDEX `task_deps_depends_idx` ON `task_dependencies` (`depends_on_task_id`);--> statement-breakpoint
CREATE INDEX `task_labels_task_idx` ON `task_labels` (`task_id`);--> statement-breakpoint
CREATE INDEX `task_labels_label_idx` ON `task_labels` (`label_id`);--> statement-breakpoint
CREATE INDEX `task_watchers_task_idx` ON `task_watchers` (`task_id`);--> statement-breakpoint
CREATE INDEX `tasks_project_status_idx` ON `tasks` (`project_id`,`status_id`);--> statement-breakpoint
CREATE INDEX `tasks_assignee_idx` ON `tasks` (`assignee_id`);--> statement-breakpoint
CREATE INDEX `tasks_due_date_idx` ON `tasks` (`due_date`);--> statement-breakpoint
CREATE INDEX `tasks_parent_idx` ON `tasks` (`parent_task_id`);--> statement-breakpoint
CREATE INDEX `comment_mentions_comment_idx` ON `comment_mentions` (`comment_id`);--> statement-breakpoint
CREATE INDEX `comment_mentions_user_idx` ON `comment_mentions` (`user_id`);--> statement-breakpoint
CREATE INDEX `comments_entity_idx` ON `comments` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `comments_author_idx` ON `comments` (`author_id`);--> statement-breakpoint
CREATE INDEX `comments_parent_idx` ON `comments` (`parent_comment_id`);--> statement-breakpoint
CREATE INDEX `activity_entity_idx` ON `activity_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `activity_org_idx` ON `activity_log` (`organization_id`);--> statement-breakpoint
CREATE INDEX `activity_created_idx` ON `activity_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `activity_actor_idx` ON `activity_log` (`actor_id`);--> statement-breakpoint
CREATE INDEX `notif_prefs_user_idx` ON `notification_preferences` (`user_id`);--> statement-breakpoint
CREATE INDEX `notifications_user_read_idx` ON `notifications` (`user_id`,`read_at`);--> statement-breakpoint
CREATE INDEX `notifications_user_created_idx` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `attachments_entity_idx` ON `attachments` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `attachments_uploader_idx` ON `attachments` (`uploaded_by`);--> statement-breakpoint
CREATE INDEX `saved_filters_user_idx` ON `saved_filters` (`user_id`);--> statement-breakpoint
CREATE INDEX `saved_filters_org_idx` ON `saved_filters` (`organization_id`);