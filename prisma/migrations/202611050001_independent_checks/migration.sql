CREATE TABLE `IndependentCheck` (
 `id` VARCHAR(191) NOT NULL,
 `userId` VARCHAR(191) NOT NULL,
 `taskVersionId` VARCHAR(191) NOT NULL,
 `eventKey` VARCHAR(64) NOT NULL,
 `contentVersion` VARCHAR(40) NOT NULL,
 `answers` JSON NOT NULL,
 `correct` BOOLEAN NOT NULL,
 `helpUsed` BOOLEAN NOT NULL,
 `imported` BOOLEAN NOT NULL DEFAULT false,
 `checkedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY (`id`),
 UNIQUE INDEX `IndependentCheck_userId_eventKey_key` (`userId`, `eventKey`),
 INDEX `IndependentCheck_userId_contentVersion_checkedAt_idx` (`userId`, `contentVersion`, `checkedAt`),
 INDEX `IndependentCheck_taskVersionId_idx` (`taskVersionId`),
 CONSTRAINT `IndependentCheck_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT `IndependentCheck_taskVersionId_fkey` FOREIGN KEY (`taskVersionId`) REFERENCES `TaskVersion` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
