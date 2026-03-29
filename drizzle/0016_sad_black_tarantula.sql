ALTER TABLE `user` ADD `username` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `display_username` varchar(255);--> statement-breakpoint
ALTER TABLE `user` ADD CONSTRAINT `user_username_unique` UNIQUE(`username`);