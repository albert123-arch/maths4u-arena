-- Additive upgrade. Existing task/work versions and their answers stay intact.
ALTER TABLE `TaskText` ADD COLUMN `markScheme` LONGTEXT NULL,
  ADD COLUMN `markSchemeSource` VARCHAR(500) NULL;
ALTER TABLE `TaskAsset` MODIFY `role` ENUM('STATEMENT','HINT','SOLUTION','MARK_SCHEME','TEACHER') NOT NULL;
ALTER TABLE `LessonText` ADD COLUMN `examples` LONGTEXT NULL;
ALTER TABLE `Review` MODIFY `points` DOUBLE NULL, ADD COLUMN `revision` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `StoredFile` ADD COLUMN `width` INTEGER NULL, ADD COLUMN `height` INTEGER NULL,
  ADD COLUMN `previewError` VARCHAR(40) NULL, ADD COLUMN `deletedAt` DATETIME(3) NULL;
CREATE TABLE `FileDerivative` (
  `fileId` VARCHAR(191) NOT NULL,
  `kind` VARCHAR(20) NOT NULL,
  `storageKey` VARCHAR(100) NOT NULL,
  `mimeType` VARCHAR(100) NOT NULL,
  `size` INTEGER NOT NULL,
  `width` INTEGER NOT NULL,
  `height` INTEGER NOT NULL,
  `sha256` CHAR(64) NOT NULL,
  PRIMARY KEY (`fileId`, `kind`), UNIQUE INDEX `FileDerivative_storageKey_key` (`storageKey`),
  CONSTRAINT `FileDerivative_fileId_fkey` FOREIGN KEY (`fileId`) REFERENCES `StoredFile` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
