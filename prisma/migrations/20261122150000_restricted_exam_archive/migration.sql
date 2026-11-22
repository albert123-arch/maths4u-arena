-- CreateTable
CREATE TABLE `ExamArchiveGrant` (
    `userId` VARCHAR(191) NOT NULL,
    `issuerId` VARCHAR(191) NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `syllabuses` JSON NOT NULL,

    INDEX `ExamArchiveGrant_expiresAt_revokedAt_idx`(`expiresAt`, `revokedAt`),
    INDEX `ExamArchiveGrant_issuerId_idx`(`issuerId`),
    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExamArchivePreference` (
    `userId` VARCHAR(191) NOT NULL,
    `mode` VARCHAR(20) NOT NULL DEFAULT 'topicwise',
    `showOtherCourses` BOOLEAN NOT NULL DEFAULT false,
    `topicKey` VARCHAR(191) NULL,
    `paperId` VARCHAR(191) NULL,
    `syllabus` VARCHAR(10) NULL,
    `year` INTEGER NULL,
    `session` VARCHAR(40) NULL,

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExamArchivePaper` (
    `id` VARCHAR(191) NOT NULL,
    `syllabus` VARCHAR(10) NOT NULL,
    `year` INTEGER NOT NULL,
    `session` VARCHAR(40) NOT NULL,
    `paperCode` VARCHAR(30) NOT NULL,
    `officialUrl` VARCHAR(500) NULL,
    `markSchemeUrl` VARCHAR(500) NULL,

    UNIQUE INDEX `ExamArchivePaper_identity`(`syllabus`, `year`, `session`, `paperCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExamArchiveQuestion` (
    `id` VARCHAR(191) NOT NULL,
    `syllabus` VARCHAR(10) NOT NULL,
    `marks` INTEGER NULL,
    `questionType` VARCHAR(30) NULL,
    `difficulty` INTEGER NULL,
    `taskVersionId` VARCHAR(191) NULL,
    `approvalReference` VARCHAR(500) NULL,
    `studentApproved` BOOLEAN NOT NULL DEFAULT false,
    `statementAllowed` BOOLEAN NOT NULL DEFAULT false,
    `solutionAllowed` BOOLEAN NOT NULL DEFAULT false,
    `markSchemeAllowed` BOOLEAN NOT NULL DEFAULT false,
    `assetsAllowed` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `ExamArchiveQuestion_taskVersionId_key`(`taskVersionId`),
    INDEX `ExamArchiveQuestion_syllabus_idx`(`syllabus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExamArchivePaperQuestion` (
    `paperId` VARCHAR(191) NOT NULL,
    `number` VARCHAR(40) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,

    INDEX `ExamArchivePaperQuestion_questionId_idx`(`questionId`),
    PRIMARY KEY (`paperId`, `number`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExamArchiveSource` (
    `sourceKey` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `printedPart` VARCHAR(40) NULL,
    `references` JSON NULL,

    INDEX `ExamArchiveSource_questionId_idx`(`questionId`),
    PRIMARY KEY (`sourceKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExamArchiveTopic` (
    `id` VARCHAR(191) NOT NULL,
    `syllabus` VARCHAR(10) NOT NULL,
    `courseKey` VARCHAR(120) NOT NULL,
    `courseTitle` VARCHAR(191) NOT NULL,
    `chapterKey` VARCHAR(120) NOT NULL,
    `chapterTitle` VARCHAR(191) NOT NULL,
    `chapterOrder` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL,
    `courseSlug` VARCHAR(120) NULL,
    `lessonId` VARCHAR(191) NULL,

    INDEX `ExamArchiveTopic_syllabus_courseKey_idx`(`syllabus`, `courseKey`),
    INDEX `ExamArchiveTopic_lessonId_idx`(`lessonId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExamArchiveQuestionTopic` (
    `questionId` VARCHAR(191) NOT NULL,
    `topicId` VARCHAR(191) NOT NULL,

    INDEX `ExamArchiveQuestionTopic_topicId_idx`(`topicId`),
    PRIMARY KEY (`questionId`, `topicId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ExamArchiveGrant` ADD CONSTRAINT `ExamArchiveGrant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExamArchiveGrant` ADD CONSTRAINT `ExamArchiveGrant_issuerId_fkey` FOREIGN KEY (`issuerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExamArchivePreference` ADD CONSTRAINT `ExamArchivePreference_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExamArchiveQuestion` ADD CONSTRAINT `ExamArchiveQuestion_taskVersionId_fkey` FOREIGN KEY (`taskVersionId`) REFERENCES `TaskVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExamArchivePaperQuestion` ADD CONSTRAINT `ExamArchivePaperQuestion_paperId_fkey` FOREIGN KEY (`paperId`) REFERENCES `ExamArchivePaper`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExamArchivePaperQuestion` ADD CONSTRAINT `ExamArchivePaperQuestion_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `ExamArchiveQuestion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExamArchiveSource` ADD CONSTRAINT `ExamArchiveSource_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `ExamArchiveQuestion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExamArchiveTopic` ADD CONSTRAINT `ExamArchiveTopic_lessonId_fkey` FOREIGN KEY (`lessonId`) REFERENCES `Lesson`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExamArchiveQuestionTopic` ADD CONSTRAINT `ExamArchiveQuestionTopic_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `ExamArchiveQuestion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExamArchiveQuestionTopic` ADD CONSTRAINT `ExamArchiveQuestionTopic_topicId_fkey` FOREIGN KEY (`topicId`) REFERENCES `ExamArchiveTopic`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
