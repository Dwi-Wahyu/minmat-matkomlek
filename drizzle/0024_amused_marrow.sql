CREATE TABLE `unit` (
	`id` varchar(21) NOT NULL,
	`name` varchar(20) NOT NULL,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `unit_id` PRIMARY KEY(`id`),
	CONSTRAINT `unit_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `item` MODIFY COLUMN `base_unit` varchar(21) NOT NULL;--> statement-breakpoint
ALTER TABLE `item` ADD CONSTRAINT `item_base_unit_unit_id_fk` FOREIGN KEY (`base_unit`) REFERENCES `unit`(`id`) ON DELETE no action ON UPDATE no action;