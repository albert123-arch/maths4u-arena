CREATE TABLE `LessonPresentation` (
    `id` VARCHAR(191) NOT NULL,
    `lessonId` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `url` VARCHAR(2048) NOT NULL,
    `sourceKey` VARCHAR(220) NOT NULL,
    `position` INTEGER NOT NULL,
    `revision` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `archivedAt` DATETIME(3) NULL,
    INDEX `LessonPresentation_lessonId_archivedAt_position_idx` (`lessonId`, `archivedAt`, `position`),
    INDEX `LessonPresentation_ownerId_idx` (`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `LessonPresentation` ADD CONSTRAINT `LessonPresentation_lessonId_fkey` FOREIGN KEY (`lessonId`) REFERENCES `Lesson`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `LessonPresentation` ADD CONSTRAINT `LessonPresentation_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
