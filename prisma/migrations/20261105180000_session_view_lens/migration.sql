-- Additive session-only metadata. No user, content, answer or progress rewrite.
ALTER TABLE `Session`
  ADD COLUMN `lensMode` VARCHAR(8) NULL,
  ADD COLUMN `lensRole` ENUM('STUDENT', 'TEACHER', 'ADMIN') NULL,
  ADD COLUMN `lensTargetId` VARCHAR(191) NULL,
  ADD COLUMN `lensTouchedAt` DATETIME(3) NULL,
  ADD COLUMN `lensNonce` VARCHAR(64) NULL;
