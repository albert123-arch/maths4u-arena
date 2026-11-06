-- No version, task identity, visibility, response or review is rewritten.
ALTER TABLE `Task`
  ADD COLUMN `origin` ENUM('ORIGINAL','CAMBRIDGE_EXAM','OTHER_THIRD_PARTY','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN `originManual` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `originReason` VARCHAR(1000) NULL,
  ADD COLUMN `originRule` VARCHAR(80) NULL,
  ADD COLUMN `examArchivedAt` DATETIME(3) NULL,
  ADD INDEX `Task_origin_examArchivedAt_idx` (`origin`, `examArchivedAt`);
