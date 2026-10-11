-- Additive only: existing attempts, grades, users and content remain unchanged.
ALTER TABLE `PracticeStudy`
  ADD COLUMN `selfDirected` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `selfSolved` BOOLEAN NULL,
  ADD COLUMN `selfPoints` DOUBLE NULL;

CREATE TABLE `CourseFollow` (
  `userId` VARCHAR(191) NOT NULL,
  `courseId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `CourseFollow_courseId_idx` (`courseId`),
  PRIMARY KEY (`userId`, `courseId`),
  CONSTRAINT `CourseFollow_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `CourseFollow_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TaskBookmark` (
  `userId` VARCHAR(191) NOT NULL,
  `taskId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `TaskBookmark_taskId_idx` (`taskId`),
  PRIMARY KEY (`userId`, `taskId`),
  CONSTRAINT `TaskBookmark_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `TaskBookmark_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
