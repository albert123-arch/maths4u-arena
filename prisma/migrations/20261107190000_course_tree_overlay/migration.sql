-- CreateTable
CREATE TABLE `ArchiveChapterLink` (
    `sourceTopicId` VARCHAR(191) NOT NULL,
    `canonicalTopicId` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `reason` VARCHAR(500) NOT NULL,

    PRIMARY KEY (`sourceTopicId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ArchiveLessonLink` (
    `sourceLessonId` VARCHAR(191) NOT NULL,
    `sourceTopicId` VARCHAR(191) NOT NULL,
    `proposedLessonId` VARCHAR(191) NULL,
    `approvedLessonId` VARCHAR(191) NULL,
    `proposalReason` VARCHAR(1000) NOT NULL,

    INDEX `ArchiveLessonLink_sourceTopicId_idx`(`sourceTopicId`),
    PRIMARY KEY (`sourceLessonId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ArchiveTaskPlacement` (
    `courseId` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `sourceTopicId` VARCHAR(191) NOT NULL,
    `sourceLessonId` VARCHAR(191) NOT NULL,
    `targetTopicId` VARCHAR(191) NOT NULL,
    `targetLessonId` VARCHAR(191) NULL,
    `method` ENUM('PROVENANCE', 'APPROVED_MAP', 'UNALLOCATED', 'LEGACY') NOT NULL,
    `adaptationUids` JSON NOT NULL,

    INDEX `ArchiveTaskPlacement_targetLessonId_idx`(`targetLessonId`),
    INDEX `ArchiveTaskPlacement_targetTopicId_method_idx`(`targetTopicId`, `method`),
    PRIMARY KEY (`courseId`, `taskId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ArchiveChapterLink` ADD CONSTRAINT `ArchiveChapterLink_sourceTopicId_fkey` FOREIGN KEY (`sourceTopicId`) REFERENCES `Topic`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArchiveChapterLink` ADD CONSTRAINT `ArchiveChapterLink_canonicalTopicId_fkey` FOREIGN KEY (`canonicalTopicId`) REFERENCES `Topic`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArchiveLessonLink` ADD CONSTRAINT `ArchiveLessonLink_sourceLessonId_fkey` FOREIGN KEY (`sourceLessonId`) REFERENCES `Lesson`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArchiveLessonLink` ADD CONSTRAINT `ArchiveLessonLink_sourceTopicId_fkey` FOREIGN KEY (`sourceTopicId`) REFERENCES `ArchiveChapterLink`(`sourceTopicId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArchiveLessonLink` ADD CONSTRAINT `ArchiveLessonLink_proposedLessonId_fkey` FOREIGN KEY (`proposedLessonId`) REFERENCES `Lesson`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArchiveLessonLink` ADD CONSTRAINT `ArchiveLessonLink_approvedLessonId_fkey` FOREIGN KEY (`approvedLessonId`) REFERENCES `Lesson`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArchiveTaskPlacement` ADD CONSTRAINT `ArchiveTaskPlacement_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArchiveTaskPlacement` ADD CONSTRAINT `ArchiveTaskPlacement_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArchiveTaskPlacement` ADD CONSTRAINT `ArchiveTaskPlacement_sourceTopicId_fkey` FOREIGN KEY (`sourceTopicId`) REFERENCES `ArchiveChapterLink`(`sourceTopicId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArchiveTaskPlacement` ADD CONSTRAINT `ArchiveTaskPlacement_sourceLessonId_fkey` FOREIGN KEY (`sourceLessonId`) REFERENCES `Lesson`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArchiveTaskPlacement` ADD CONSTRAINT `ArchiveTaskPlacement_targetTopicId_fkey` FOREIGN KEY (`targetTopicId`) REFERENCES `Topic`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArchiveTaskPlacement` ADD CONSTRAINT `ArchiveTaskPlacement_targetLessonId_fkey` FOREIGN KEY (`targetLessonId`) REFERENCES `Lesson`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
