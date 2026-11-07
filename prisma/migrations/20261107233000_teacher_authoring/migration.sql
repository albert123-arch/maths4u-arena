-- Additive self-service/first-party authoring metadata only. No pre-existing
-- teacher, imported task, immutable version, assignment or response is rewritten.
-- CreateTable
CREATE TABLE `TeacherAccount` (
    `userId` VARCHAR(191) NOT NULL,
    `selfRegistered` BOOLEAN NOT NULL DEFAULT true,
    `maxActiveClasses` INTEGER NOT NULL DEFAULT 3,
    `maxDistinctStudents` INTEGER NOT NULL DEFAULT 100,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaskAuthoring` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `latestVersionId` VARCHAR(191) NOT NULL,
    `publicTaskId` VARCHAR(191) NULL,
    `courseId` VARCHAR(191) NULL,
    `topicId` VARCHAR(191) NULL,
    `revision` INTEGER NOT NULL DEFAULT 0,
    `declarationVersion` VARCHAR(80) NOT NULL DEFAULT 'teacher-original-v1',
    `declaredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TaskAuthoring_taskId_key`(`taskId`),
    UNIQUE INDEX `TaskAuthoring_latestVersionId_key`(`latestVersionId`),
    UNIQUE INDEX `TaskAuthoring_publicTaskId_key`(`publicTaskId`),
    INDEX `TaskAuthoring_ownerId_updatedAt_idx`(`ownerId`, `updatedAt`),
    INDEX `TaskAuthoring_courseId_idx`(`courseId`),
    INDEX `TaskAuthoring_topicId_idx`(`topicId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaskAuthoringSubmission` (
    `id` VARCHAR(191) NOT NULL,
    `authoringId` VARCHAR(191) NOT NULL,
    `taskVersionId` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `topicId` VARCHAR(191) NOT NULL,
    `contentFingerprint` CHAR(64) NOT NULL,
    `authorDeclaration` BOOLEAN NOT NULL,
    `permissionToPublish` BOOLEAN NOT NULL,
    `declarationVersion` VARCHAR(80) NOT NULL,
    `note` TEXT NOT NULL,
    `status` ENUM('SUBMITTED', 'CHANGES_REQUESTED', 'REJECTED', 'APPROVED', 'WITHDRAWN') NOT NULL DEFAULT 'SUBMITTED',
    `revision` INTEGER NOT NULL DEFAULT 0,
    `feedback` TEXT NULL,
    `reviewerId` VARCHAR(191) NULL,
    `publishedVersionId` VARCHAR(191) NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,

    UNIQUE INDEX `TaskAuthoringSubmission_publishedVersionId_key`(`publishedVersionId`),
    INDEX `TaskAuthoringSubmission_authoringId_submittedAt_idx`(`authoringId`, `submittedAt`),
    INDEX `TaskAuthoringSubmission_status_submittedAt_idx`(`status`, `submittedAt`),
    INDEX `TaskAuthoringSubmission_taskVersionId_idx`(`taskVersionId`),
    INDEX `TaskAuthoringSubmission_reviewerId_idx`(`reviewerId`),
    INDEX `TaskAuthoringSubmission_courseId_idx`(`courseId`),
    INDEX `TaskAuthoringSubmission_topicId_idx`(`topicId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TeacherAccount` ADD CONSTRAINT `TeacherAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAuthoring` ADD CONSTRAINT `TaskAuthoring_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAuthoring` ADD CONSTRAINT `TaskAuthoring_publicTaskId_fkey` FOREIGN KEY (`publicTaskId`) REFERENCES `Task`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAuthoring` ADD CONSTRAINT `TaskAuthoring_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAuthoring` ADD CONSTRAINT `TaskAuthoring_latestVersionId_fkey` FOREIGN KEY (`latestVersionId`) REFERENCES `TaskVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAuthoring` ADD CONSTRAINT `TaskAuthoring_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAuthoring` ADD CONSTRAINT `TaskAuthoring_topicId_fkey` FOREIGN KEY (`topicId`) REFERENCES `Topic`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAuthoringSubmission` ADD CONSTRAINT `TaskAuthoringSubmission_authoringId_fkey` FOREIGN KEY (`authoringId`) REFERENCES `TaskAuthoring`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAuthoringSubmission` ADD CONSTRAINT `TaskAuthoringSubmission_taskVersionId_fkey` FOREIGN KEY (`taskVersionId`) REFERENCES `TaskVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAuthoringSubmission` ADD CONSTRAINT `TaskAuthoringSubmission_publishedVersionId_fkey` FOREIGN KEY (`publishedVersionId`) REFERENCES `TaskVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAuthoringSubmission` ADD CONSTRAINT `TaskAuthoringSubmission_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAuthoringSubmission` ADD CONSTRAINT `TaskAuthoringSubmission_topicId_fkey` FOREIGN KEY (`topicId`) REFERENCES `Topic`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAuthoringSubmission` ADD CONSTRAINT `TaskAuthoringSubmission_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
