CREATE TABLE `import_log` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36),
	`user_id` varchar(36),
	`filename` varchar(255) NOT NULL,
	`status` enum('SUCCESS','FAILED','PARTIAL') DEFAULT 'SUCCESS',
	`total_rows` decimal(12,0) DEFAULT '0',
	`success_rows` decimal(12,0) DEFAULT '0',
	`error_rows` decimal(12,0) DEFAULT '0',
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `import_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `item` MODIFY COLUMN `base_unit` enum('PCS','BOX','METER','ROLL','UNIT','SET','BUAH','LOT','PAKET','CABINET') NOT NULL;--> statement-breakpoint
ALTER TABLE `import_log` ADD CONSTRAINT `import_log_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `import_log` ADD CONSTRAINT `import_log_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;