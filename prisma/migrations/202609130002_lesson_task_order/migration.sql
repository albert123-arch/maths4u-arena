CREATE TABLE `LessonTask` (
    `lessonId` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL,
    INDEX `LessonTask_lessonId_position_idx`(`lessonId`, `position`),
    INDEX `LessonTask_taskId_idx`(`taskId`),
    PRIMARY KEY (`lessonId`, `taskId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `LessonTask` ADD CONSTRAINT `LessonTask_lessonId_fkey` FOREIGN KEY (`lessonId`) REFERENCES `Lesson`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `LessonTask` ADD CONSTRAINT `LessonTask_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
