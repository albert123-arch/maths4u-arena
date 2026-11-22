-- Dedicated archive content. Existing question IDs, legacy flags, and public tables are unchanged.
CREATE TABLE `ExamArchiveInternalContent` (
    `questionId` VARCHAR(191) NOT NULL,
    `statementHtml` LONGTEXT NOT NULL,
    `solutionHtml` LONGTEXT NULL,
    `images` JSON NOT NULL,
    `solutionImages` JSON NOT NULL,
    `markSchemes` JSON NOT NULL,

    PRIMARY KEY (`questionId`),
    CONSTRAINT `ExamArchiveInternalContent_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `ExamArchiveQuestion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
