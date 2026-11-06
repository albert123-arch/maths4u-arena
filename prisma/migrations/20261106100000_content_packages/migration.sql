CREATE TABLE `ContentPackage` (
  `key` VARCHAR(80) NOT NULL,
  `version` VARCHAR(30) NOT NULL,
  `fingerprint` VARCHAR(64) NOT NULL,
  `courseId` VARCHAR(191) NOT NULL,
  `chapterId` VARCHAR(191) NOT NULL,
  `state` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  `publishedAt` DATETIME(3) NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
