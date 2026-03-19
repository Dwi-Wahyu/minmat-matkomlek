ALTER TABLE `equipment` ADD `organization_id` varchar(36);--> statement-breakpoint
ALTER TABLE `lending` ADD `organization_id` varchar(36);--> statement-breakpoint
ALTER TABLE `equipment` ADD CONSTRAINT `equipment_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lending` ADD CONSTRAINT `lending_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE no action ON UPDATE no action;