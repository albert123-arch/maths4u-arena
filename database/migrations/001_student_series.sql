-- Maths4U Arena: student accounts and series league support.
-- Import this file manually in phpMyAdmin after selecting the production database.
-- This migration is additive only: it creates new tables and adds Participant.studentAccountId.

CREATE TABLE IF NOT EXISTS `StudentAccount` (
  `id` VARCHAR(191) NOT NULL,
  `username` VARCHAR(191) NOT NULL,
  `displayName` VARCHAR(191) NOT NULL,
  `passwordHash` VARCHAR(255) NOT NULL,
  `groupName` VARCHAR(191) NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `StudentAccount_username_key` (`username`),
  KEY `StudentAccount_status_idx` (`status`),
  KEY `StudentAccount_groupName_idx` (`groupName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Series` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` LONGTEXT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  `startsAt` DATETIME(3) NULL,
  `endsAt` DATETIME(3) NULL,
  `settingsJson` LONGTEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Series_status_idx` (`status`),
  KEY `Series_startsAt_idx` (`startsAt`),
  KEY `Series_endsAt_idx` (`endsAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `SeriesRegistration` (
  `id` VARCHAR(191) NOT NULL,
  `seriesId` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `displayNameSnapshot` VARCHAR(191) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'REGISTERED',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `SeriesRegistration_seriesId_studentId_key` (`seriesId`, `studentId`),
  KEY `SeriesRegistration_studentId_idx` (`studentId`),
  KEY `SeriesRegistration_status_idx` (`status`),
  CONSTRAINT `SeriesRegistration_seriesId_fkey`
    FOREIGN KEY (`seriesId`) REFERENCES `Series` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `SeriesRegistration_studentId_fkey`
    FOREIGN KEY (`studentId`) REFERENCES `StudentAccount` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `SeriesRound` (
  `id` VARCHAR(191) NOT NULL,
  `seriesId` VARCHAR(191) NOT NULL,
  `testVersionId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `roundNumber` INT NOT NULL,
  `scheduledAt` DATETIME(3) NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  `sessionId` VARCHAR(191) NULL,
  `settingsJson` LONGTEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `SeriesRound_seriesId_roundNumber_key` (`seriesId`, `roundNumber`),
  KEY `SeriesRound_testVersionId_idx` (`testVersionId`),
  KEY `SeriesRound_sessionId_idx` (`sessionId`),
  KEY `SeriesRound_status_idx` (`status`),
  KEY `SeriesRound_scheduledAt_idx` (`scheduledAt`),
  CONSTRAINT `SeriesRound_seriesId_fkey`
    FOREIGN KEY (`seriesId`) REFERENCES `Series` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `SeriesRound_testVersionId_fkey`
    FOREIGN KEY (`testVersionId`) REFERENCES `TestVersion` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `SeriesRound_sessionId_fkey`
    FOREIGN KEY (`sessionId`) REFERENCES `GameSession` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `SeriesScore` (
  `id` VARCHAR(191) NOT NULL,
  `seriesId` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `roundId` VARCHAR(191) NULL,
  `sessionId` VARCHAR(191) NULL,
  `points` INT NOT NULL DEFAULT 0,
  `correctCount` INT NOT NULL DEFAULT 0,
  `answeredCount` INT NOT NULL DEFAULT 0,
  `percentage` DOUBLE NOT NULL DEFAULT 0,
  `rank` INT NULL,
  `metaJson` LONGTEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `SeriesScore_seriesId_idx` (`seriesId`),
  KEY `SeriesScore_studentId_idx` (`studentId`),
  KEY `SeriesScore_roundId_idx` (`roundId`),
  KEY `SeriesScore_sessionId_idx` (`sessionId`),
  KEY `SeriesScore_rank_idx` (`rank`),
  CONSTRAINT `SeriesScore_seriesId_fkey`
    FOREIGN KEY (`seriesId`) REFERENCES `Series` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `SeriesScore_studentId_fkey`
    FOREIGN KEY (`studentId`) REFERENCES `StudentAccount` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `SeriesScore_roundId_fkey`
    FOREIGN KEY (`roundId`) REFERENCES `SeriesRound` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `SeriesScore_sessionId_fkey`
    FOREIGN KEY (`sessionId`) REFERENCES `GameSession` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @add_participant_student_column := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `Participant` ADD COLUMN `studentAccountId` VARCHAR(191) NULL AFTER `sessionId`',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Participant'
    AND COLUMN_NAME = 'studentAccountId'
);
PREPARE stmt FROM @add_participant_student_column;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_participant_student_index := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX `Participant_studentAccountId_idx` ON `Participant` (`studentAccountId`)',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Participant'
    AND INDEX_NAME = 'Participant_studentAccountId_idx'
);
PREPARE stmt FROM @add_participant_student_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_participant_student_fk := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `Participant` ADD CONSTRAINT `Participant_studentAccountId_fkey` FOREIGN KEY (`studentAccountId`) REFERENCES `StudentAccount` (`id`) ON DELETE SET NULL ON UPDATE CASCADE',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND CONSTRAINT_NAME = 'Participant_studentAccountId_fkey'
);
PREPARE stmt FROM @add_participant_student_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
