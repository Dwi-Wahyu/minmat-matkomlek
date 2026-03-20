ALTER TABLE `inventory_movement` DROP FOREIGN KEY `inventory_movement_equipment_id_equipment_id_fk`;
--> statement-breakpoint
ALTER TABLE `inventory_movement` DROP FOREIGN KEY `inventory_movement_from_warehouse_id_warehouse_id_fk`;
--> statement-breakpoint
ALTER TABLE `inventory_movement` DROP FOREIGN KEY `inventory_movement_to_warehouse_id_warehouse_id_fk`;
--> statement-breakpoint
ALTER TABLE `inventory_movement` DROP FOREIGN KEY `inventory_movement_handled_by_user_id_fk`;
--> statement-breakpoint
ALTER TABLE `inventory_movement` MODIFY COLUMN `equipment_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_movement` MODIFY COLUMN `movement_type` enum('MASUK','KELUAR','DISTRIBUSI','PINJAM','KEMBALI') NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_movement` ADD `movement_classification` enum('BALKIR','KOMUNITY','TRANSITO') NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_movement` ADD `specific_location_name` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_movement` ADD `quantity` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_movement` ADD `keterangan` text;--> statement-breakpoint
ALTER TABLE `inventory_movement` ADD `penanggung_jawab` varchar(255);--> statement-breakpoint
ALTER TABLE `inventory_movement` DROP COLUMN `reference_id`;--> statement-breakpoint
ALTER TABLE `inventory_movement` DROP COLUMN `handled_by`;