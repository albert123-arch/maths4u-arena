CREATE TABLE `StudyCheckEvidence` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `lessonId` VARCHAR(191) NOT NULL,
  `checkId` VARCHAR(128) NOT NULL,
  `eventKey` CHAR(36) NOT NULL,
  `correct` BOOLEAN NOT NULL,
  `helpUsed` BOOLEAN NOT NULL,
  `checkedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `StudyCheckEvidence_userId_eventKey_key` (`userId`, `eventKey`),
  INDEX `StudyCheckEvidence_userId_lessonId_checkedAt_idx` (`userId`, `lessonId`, `checkedAt`),
  INDEX `StudyCheckEvidence_lessonId_idx` (`lessonId`),
  CONSTRAINT `StudyCheckEvidence_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `StudyCheckEvidence_lessonId_fkey` FOREIGN KEY (`lessonId`) REFERENCES `Lesson` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
