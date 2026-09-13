CREATE TABLE `PracticeStudy` (
  `attemptId` VARCHAR(191) NOT NULL,
  `taskId` VARCHAR(191) NOT NULL,
  `lessonId` VARCHAR(191) NULL,
  `hintAt` DATETIME(3) NULL,
  `answerAt` DATETIME(3) NULL,
  `solutionAt` DATETIME(3) NULL,
  `markSchemeAt` DATETIME(3) NULL,
  `selfCheckedAt` DATETIME(3) NULL,
  `needsRepeat` BOOLEAN NOT NULL DEFAULT false,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`attemptId`),
  INDEX `PracticeStudy_lessonId_taskId_idx` (`lessonId`, `taskId`),
  INDEX `PracticeStudy_taskId_idx` (`taskId`),
  CONSTRAINT `PracticeStudy_attemptId_fkey` FOREIGN KEY (`attemptId`) REFERENCES `Attempt` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `PracticeStudy_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `PracticeStudy_lessonId_fkey` FOREIGN KEY (`lessonId`) REFERENCES `Lesson` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
