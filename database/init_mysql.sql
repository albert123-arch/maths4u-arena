-- Maths4U Arena manual MySQL initialization.
-- Import this file into the selected Hostinger MySQL database with phpMyAdmin.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `User` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `passwordHash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(191) NULL,
  `role` VARCHAR(32) NOT NULL DEFAULT 'TEACHER',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Test` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `subject` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `locale` VARCHAR(16) NOT NULL DEFAULT 'ru',
  `status` VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Test_slug_key` (`slug`),
  KEY `Test_createdById_idx` (`createdById`),
  KEY `Test_status_idx` (`status`),
  KEY `Test_subject_idx` (`subject`),
  CONSTRAINT `Test_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `TestVersion` (
  `id` VARCHAR(191) NOT NULL,
  `testId` VARCHAR(191) NOT NULL,
  `versionNumber` INT NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `instructions` LONGTEXT NULL,
  `settingsJson` LONGTEXT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  `publishedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `TestVersion_testId_versionNumber_key` (`testId`, `versionNumber`),
  KEY `TestVersion_status_idx` (`status`),
  CONSTRAINT `TestVersion_testId_fkey`
    FOREIGN KEY (`testId`) REFERENCES `Test` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Question` (
  `id` VARCHAR(191) NOT NULL,
  `subject` VARCHAR(191) NOT NULL,
  `type` VARCHAR(64) NOT NULL,
  `prompt` LONGTEXT NOT NULL,
  `explanation` LONGTEXT NULL,
  `difficulty` INT NOT NULL DEFAULT 1,
  `tagsJson` LONGTEXT NULL,
  `mediaJson` LONGTEXT NULL,
  `gradingType` VARCHAR(64) NOT NULL,
  `gradingRulesJson` LONGTEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Question_subject_idx` (`subject`),
  KEY `Question_type_idx` (`type`),
  KEY `Question_difficulty_idx` (`difficulty`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `QuestionOption` (
  `id` VARCHAR(191) NOT NULL,
  `questionId` VARCHAR(191) NOT NULL,
  `optionText` LONGTEXT NOT NULL,
  `isCorrect` TINYINT(1) NOT NULL DEFAULT 0,
  `sortOrder` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `QuestionOption_questionId_idx` (`questionId`),
  CONSTRAINT `QuestionOption_questionId_fkey`
    FOREIGN KEY (`questionId`) REFERENCES `Question` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `TestVersionQuestion` (
  `id` VARCHAR(191) NOT NULL,
  `testVersionId` VARCHAR(191) NOT NULL,
  `questionId` VARCHAR(191) NOT NULL,
  `sortOrder` INT NOT NULL,
  `points` INT NOT NULL DEFAULT 1,
  `timeLimitSeconds` INT NULL,
  `settingsJson` LONGTEXT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `TestVersionQuestion_testVersionId_questionId_key` (`testVersionId`, `questionId`),
  KEY `TestVersionQuestion_questionId_idx` (`questionId`),
  CONSTRAINT `TestVersionQuestion_testVersionId_fkey`
    FOREIGN KEY (`testVersionId`) REFERENCES `TestVersion` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TestVersionQuestion_questionId_fkey`
    FOREIGN KEY (`questionId`) REFERENCES `Question` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `GameSession` (
  `id` VARCHAR(191) NOT NULL,
  `testVersionId` VARCHAR(191) NOT NULL,
  `code` VARCHAR(16) NOT NULL,
  `mode` VARCHAR(32) NOT NULL DEFAULT 'CLASSIC',
  `status` VARCHAR(32) NOT NULL DEFAULT 'LOBBY',
  `settingsJson` LONGTEXT NULL,
  `showResults` TINYINT(1) NOT NULL DEFAULT 1,
  `startedAt` DATETIME(3) NULL,
  `finishedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `GameSession_code_key` (`code`),
  KEY `GameSession_testVersionId_idx` (`testVersionId`),
  KEY `GameSession_status_idx` (`status`),
  CONSTRAINT `GameSession_testVersionId_fkey`
    FOREIGN KEY (`testVersionId`) REFERENCES `TestVersion` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Participant` (
  `id` VARCHAR(191) NOT NULL,
  `sessionId` VARCHAR(191) NOT NULL,
  `displayName` VARCHAR(191) NOT NULL,
  `tokenHash` VARCHAR(255) NOT NULL,
  `teamId` VARCHAR(191) NULL,
  `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Participant_sessionId_idx` (`sessionId`),
  KEY `Participant_teamId_idx` (`teamId`),
  CONSTRAINT `Participant_sessionId_fkey`
    FOREIGN KEY (`sessionId`) REFERENCES `GameSession` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Answer` (
  `id` VARCHAR(191) NOT NULL,
  `sessionId` VARCHAR(191) NOT NULL,
  `participantId` VARCHAR(191) NOT NULL,
  `questionId` VARCHAR(191) NOT NULL,
  `answerJson` LONGTEXT NOT NULL,
  `isCorrect` TINYINT(1) NULL,
  `points` INT NOT NULL DEFAULT 0,
  `responseMs` INT NULL,
  `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Answer_sessionId_idx` (`sessionId`),
  KEY `Answer_participantId_idx` (`participantId`),
  KEY `Answer_questionId_idx` (`questionId`),
  CONSTRAINT `Answer_sessionId_fkey`
    FOREIGN KEY (`sessionId`) REFERENCES `GameSession` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Answer_participantId_fkey`
    FOREIGN KEY (`participantId`) REFERENCES `Participant` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Answer_questionId_fkey`
    FOREIGN KEY (`questionId`) REFERENCES `Question` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ScoreEvent` (
  `id` VARCHAR(191) NOT NULL,
  `sessionId` VARCHAR(191) NOT NULL,
  `participantId` VARCHAR(191) NULL,
  `questionId` VARCHAR(191) NULL,
  `eventType` VARCHAR(64) NOT NULL,
  `pointsDelta` INT NOT NULL DEFAULT 0,
  `metaJson` LONGTEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ScoreEvent_sessionId_idx` (`sessionId`),
  KEY `ScoreEvent_participantId_idx` (`participantId`),
  KEY `ScoreEvent_questionId_idx` (`questionId`),
  KEY `ScoreEvent_eventType_idx` (`eventType`),
  CONSTRAINT `ScoreEvent_sessionId_fkey`
    FOREIGN KEY (`sessionId`) REFERENCES `GameSession` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ScoreEvent_participantId_fkey`
    FOREIGN KEY (`participantId`) REFERENCES `Participant` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ScoreEvent_questionId_fkey`
    FOREIGN KEY (`questionId`) REFERENCES `Question` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
