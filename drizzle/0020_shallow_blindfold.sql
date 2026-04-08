ALTER TABLE `building` ADD `organization_id` varchar(36);--> statement-breakpoint
ALTER TABLE `land` ADD `organization_id` varchar(36);--> statement-breakpoint
ALTER TABLE `building` ADD CONSTRAINT `building_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `land` ADD CONSTRAINT `land_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;