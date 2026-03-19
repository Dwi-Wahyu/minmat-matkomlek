CREATE TABLE `approval` (
	`id` varchar(36) NOT NULL,
	`reference_type` enum('LENDING','DISTRIBUTION','MAINTENANCE'),
	`reference_id` varchar(36),
	`approved_by` varchar(36),
	`status` enum('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
	`note` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `approval_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`action` varchar(50),
	`table_name` varchar(50),
	`record_id` varchar(36),
	`old_value` text,
	`new_value` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `distribution` (
	`id` varchar(36) NOT NULL,
	`from_org_id` varchar(36),
	`to_org_id` varchar(36),
	`status` enum('DRAFT','APPROVED','SHIPPED','RECEIVED') DEFAULT 'DRAFT',
	`requested_by` varchar(36),
	`approved_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `distribution_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_movement` (
	`id` varchar(36) NOT NULL,
	`equipment_id` varchar(36),
	`from_warehouse_id` varchar(36),
	`to_warehouse_id` varchar(36),
	`movement_type` enum('MASUK','KELUAR','PINJAM','KEMBALI','DISTRIBUSI') NOT NULL,
	`reference_id` varchar(36),
	`handled_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_movement_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `item` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('ASSET','CONSUMABLE') NOT NULL,
	`base_unit` enum('PCS','BOX','METER','ROLL','UNIT') NOT NULL,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `item_unit_conversion` (
	`id` varchar(36) NOT NULL,
	`item_id` varchar(36),
	`from_unit` varchar(20) NOT NULL,
	`to_unit` varchar(20) NOT NULL,
	`multiplier` int NOT NULL,
	CONSTRAINT `item_unit_conversion_id` PRIMARY KEY(`id`),
	CONSTRAINT `item_unit_conversion_item_id_from_unit_to_unit_unique` UNIQUE(`item_id`,`from_unit`,`to_unit`)
);
--> statement-breakpoint
CREATE TABLE `lending_item` (
	`id` varchar(36) NOT NULL,
	`lending_id` varchar(36),
	`equipment_id` varchar(36),
	`qty` int DEFAULT 1,
	CONSTRAINT `lending_item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `report_btk16` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36),
	`period_start` timestamp,
	`period_end` timestamp,
	`item_name` varchar(255),
	`opening_balance` int,
	`incoming` int,
	`outgoing` int,
	`closing_balance` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `report_btk16_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock` (
	`id` varchar(36) NOT NULL,
	`item_id` varchar(36),
	`warehouse_id` varchar(36),
	`qty` int NOT NULL DEFAULT 0,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stock_id` PRIMARY KEY(`id`),
	CONSTRAINT `stock_unique_idx` UNIQUE(`item_id`,`warehouse_id`)
);
--> statement-breakpoint
CREATE TABLE `stock_movement` (
	`id` varchar(36) NOT NULL,
	`item_id` varchar(36),
	`warehouse_id` varchar(36),
	`from_warehouse_id` varchar(36),
	`to_warehouse_id` varchar(36),
	`movement_type` enum('IN','OUT','ADJUSTMENT','TRANSFER') NOT NULL,
	`qty` int NOT NULL,
	`unit` varchar(20) NOT NULL,
	`reference_id` varchar(36),
	`note` text,
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_movement_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `lending` DROP FOREIGN KEY `lending_equipment_id_equipment_id_fk`;
--> statement-breakpoint
ALTER TABLE `equipment` MODIFY COLUMN `updated_at` timestamp(3) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `lending` MODIFY COLUMN `purpose` enum('OPERASI','LATIHAN') NOT NULL;--> statement-breakpoint
ALTER TABLE `lending` MODIFY COLUMN `status` enum('DRAFT','APPROVED','DIPINJAM','KEMBALI') DEFAULT 'DRAFT';--> statement-breakpoint
ALTER TABLE `equipment` ADD `item_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `equipment` ADD `status` enum('READY','IN_USE','TRANSIT','MAINTENANCE') DEFAULT 'READY';--> statement-breakpoint
ALTER TABLE `lending` ADD `requested_by` varchar(36);--> statement-breakpoint
ALTER TABLE `lending` ADD `approved_by` varchar(36);--> statement-breakpoint
ALTER TABLE `lending` ADD `start_date` timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE `lending` ADD `end_date` timestamp;--> statement-breakpoint
ALTER TABLE `approval` ADD CONSTRAINT `approval_approved_by_user_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `distribution` ADD CONSTRAINT `distribution_from_org_id_organization_id_fk` FOREIGN KEY (`from_org_id`) REFERENCES `organization`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `distribution` ADD CONSTRAINT `distribution_to_org_id_organization_id_fk` FOREIGN KEY (`to_org_id`) REFERENCES `organization`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `distribution` ADD CONSTRAINT `distribution_requested_by_user_id_fk` FOREIGN KEY (`requested_by`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `distribution` ADD CONSTRAINT `distribution_approved_by_user_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_movement` ADD CONSTRAINT `inventory_movement_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_movement` ADD CONSTRAINT `inventory_movement_from_warehouse_id_warehouse_id_fk` FOREIGN KEY (`from_warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_movement` ADD CONSTRAINT `inventory_movement_to_warehouse_id_warehouse_id_fk` FOREIGN KEY (`to_warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_movement` ADD CONSTRAINT `inventory_movement_handled_by_user_id_fk` FOREIGN KEY (`handled_by`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item_unit_conversion` ADD CONSTRAINT `item_unit_conversion_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lending_item` ADD CONSTRAINT `lending_item_lending_id_lending_id_fk` FOREIGN KEY (`lending_id`) REFERENCES `lending`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lending_item` ADD CONSTRAINT `lending_item_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `report_btk16` ADD CONSTRAINT `report_btk16_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock` ADD CONSTRAINT `stock_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock` ADD CONSTRAINT `stock_warehouse_id_warehouse_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movement` ADD CONSTRAINT `stock_movement_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movement` ADD CONSTRAINT `stock_movement_warehouse_id_warehouse_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movement` ADD CONSTRAINT `stock_movement_from_warehouse_id_warehouse_id_fk` FOREIGN KEY (`from_warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movement` ADD CONSTRAINT `stock_movement_to_warehouse_id_warehouse_id_fk` FOREIGN KEY (`to_warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `stock_item_idx` ON `stock` (`item_id`);--> statement-breakpoint
CREATE INDEX `stock_movement_item_idx` ON `stock_movement` (`item_id`);--> statement-breakpoint
ALTER TABLE `equipment` ADD CONSTRAINT `equipment_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lending` ADD CONSTRAINT `lending_requested_by_user_id_fk` FOREIGN KEY (`requested_by`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lending` ADD CONSTRAINT `lending_approved_by_user_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lending` DROP COLUMN `equipment_id`;--> statement-breakpoint
ALTER TABLE `lending` DROP COLUMN `purpose_detail`;--> statement-breakpoint
ALTER TABLE `lending` DROP COLUMN `borrower_name`;--> statement-breakpoint
ALTER TABLE `lending` DROP COLUMN `departure_date`;--> statement-breakpoint
ALTER TABLE `lending` DROP COLUMN `expected_return_date`;--> statement-breakpoint
ALTER TABLE `lending` DROP COLUMN `actual_return_date`;--> statement-breakpoint
ALTER TABLE `warehouse` DROP COLUMN `category`;