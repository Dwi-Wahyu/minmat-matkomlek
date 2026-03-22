CREATE TABLE `notification` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`organization_id` varchar(36),
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`notification_priority` enum('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'MEDIUM',
	`read` boolean NOT NULL DEFAULT false,
	`action` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `notification` ADD CONSTRAINT `notification_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification` ADD CONSTRAINT `notification_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `notification_userId_idx` ON `notification` (`user_id`);--> statement-breakpoint
CREATE INDEX `notification_organizationId_idx` ON `notification` (`organization_id`);--> statement-breakpoint
CREATE INDEX `notification_read_idx` ON `notification` (`read`);