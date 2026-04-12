ALTER TABLE `building` MODIFY COLUMN `status` enum('MILIK_TNI','LAINNYA') NOT NULL;--> statement-breakpoint
ALTER TABLE `land` MODIFY COLUMN `status` enum('MILIK_TNI','LAINNYA') NOT NULL;