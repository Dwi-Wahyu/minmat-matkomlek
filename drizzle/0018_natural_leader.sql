CREATE TABLE `building` (
	`id` varchar(36) NOT NULL,
	`code` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`location` text NOT NULL,
	`type` varchar(255) NOT NULL,
	`area` decimal(12,2) NOT NULL,
	`condition` enum('BAIK','RUSAK') NOT NULL,
	`status` enum('MILIK_TNI','SEWA') NOT NULL,
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`photo_path` text,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `building_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `land` (
	`id` varchar(36) NOT NULL,
	`certificate_number` varchar(255) NOT NULL,
	`location` text NOT NULL,
	`area` decimal(12,2) NOT NULL,
	`status` enum('MILIK_TNI','SEWA') NOT NULL,
	`usage` varchar(255) NOT NULL,
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`photo_path` text,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `land_id` PRIMARY KEY(`id`)
);
