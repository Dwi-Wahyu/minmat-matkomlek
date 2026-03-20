CREATE TABLE `distribution_item` (
	`id` varchar(36) NOT NULL,
	`distribution_id` varchar(36) NOT NULL,
	`equipment_id` varchar(36),
	`item_id` varchar(36),
	`quantity` int NOT NULL DEFAULT 1,
	`unit` varchar(20),
	`note` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `distribution_item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `distribution_item` ADD CONSTRAINT `distribution_item_distribution_id_distribution_id_fk` FOREIGN KEY (`distribution_id`) REFERENCES `distribution`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `distribution_item` ADD CONSTRAINT `distribution_item_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `distribution_item` ADD CONSTRAINT `distribution_item_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE no action ON UPDATE no action;