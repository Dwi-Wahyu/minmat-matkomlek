ALTER TABLE `item_unit_conversion` DROP INDEX `item_unit_conversion_item_id_from_unit_to_unit_unique`;--> statement-breakpoint
ALTER TABLE `distribution_item` MODIFY COLUMN `quantity` decimal(12,4) NOT NULL DEFAULT '1.0000';--> statement-breakpoint
ALTER TABLE `item_unit_conversion` MODIFY COLUMN `multiplier` decimal(12,4) NOT NULL;--> statement-breakpoint
ALTER TABLE `lending_item` MODIFY COLUMN `qty` decimal(12,4) DEFAULT '1.0000';--> statement-breakpoint
ALTER TABLE `movement` MODIFY COLUMN `qty` decimal(12,4) NOT NULL DEFAULT '1.0000';--> statement-breakpoint
ALTER TABLE `report_btk16` MODIFY COLUMN `opening_balance` decimal(12,4);--> statement-breakpoint
ALTER TABLE `report_btk16` MODIFY COLUMN `incoming` decimal(12,4);--> statement-breakpoint
ALTER TABLE `report_btk16` MODIFY COLUMN `outgoing` decimal(12,4);--> statement-breakpoint
ALTER TABLE `report_btk16` MODIFY COLUMN `closing_balance` decimal(12,4);--> statement-breakpoint
ALTER TABLE `stock` MODIFY COLUMN `qty` decimal(12,4) NOT NULL DEFAULT '0.0000';--> statement-breakpoint
ALTER TABLE `equipment` ADD `image_path` text;--> statement-breakpoint
ALTER TABLE `item_unit_conversion` ADD CONSTRAINT `item_unit_conversion_item_id_from_unit_unique` UNIQUE(`item_id`,`from_unit`);--> statement-breakpoint
CREATE INDEX `item_unit_conv_item_idx` ON `item_unit_conversion` (`item_id`);