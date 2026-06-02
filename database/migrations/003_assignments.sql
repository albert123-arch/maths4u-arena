-- Maths4U Arena manual migration 003
-- Assignments, homework submissions, and answer records.
-- Import this file in phpMyAdmin after database/migrations/002_teacher_classes_library.sql.

CREATE TABLE IF NOT EXISTS `Assignment` (
  `id` VARCHAR(191) NOT NULL,
  `teacherId` VARCHAR(191) NOT NULL,
  `classId` VARCHAR(191) NOT NULL,
  `testVersionId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` LONGTEXT NULL,
  `type` VARCHAR(32) NOT NULL DEFAULT 'HOMEWORK',
  `status` VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  `openAt` DATETIME(3) NULL,
  `dueAt` DATETIME(3) NULL,
  `timeLimitMinutes` INT NULL,
  `attemptsAllowed` INT NOT NULL DEFAULT 1,
  `showResultsToStudents` BOOLEAN NOT NULL DEFAULT TRUE,
  `showCorrectAnswers` BOOLEAN NOT NULL DEFAULT FALSE,
  `allowLateSubmission` BOOLEAN NOT NULL DEFAULT FALSE,
  `allowPhotoSolutions` BOOLEAN NOT NULL DEFAULT FALSE,
  `settingsJson` LONGTEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Assignment_teacherId_idx` (`teacherId`),
  KEY `Assignment_classId_idx` (`classId`),
  KEY `Assignment_testVersionId_idx` (`testVersionId`),
  KEY `Assignment_status_idx` (`status`),
  KEY `Assignment_type_idx` (`type`),
  KEY `Assignment_openAt_idx` (`openAt`),
  KEY `Assignment_dueAt_idx` (`dueAt`),
  CONSTRAINT `Assignment_teacherId_fkey`
    FOREIGN KEY (`teacherId`) REFERENCES `User` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Assignment_classId_fkey`
    FOREIGN KEY (`classId`) REFERENCES `Classroom` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Assignment_testVersionId_fkey`
    FOREIGN KEY (`testVersionId`) REFERENCES `TestVersion` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `AssignmentSubmission` (
  `id` VARCHAR(191) NOT NULL,
  `assignmentId` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `attemptNumber` INT NOT NULL DEFAULT 1,
  `status` VARCHAR(32) NOT NULL DEFAULT 'NOT_STARTED',
  `startedAt` DATETIME(3) NULL,
  `submittedAt` DATETIME(3) NULL,
  `gradedAt` DATETIME(3) NULL,
  `score` INT NOT NULL DEFAULT 0,
  `maxScore` INT NOT NULL DEFAULT 0,
  `correctCount` INT NOT NULL DEFAULT 0,
  `answeredCount` INT NOT NULL DEFAULT 0,
  `percentage` DOUBLE NOT NULL DEFAULT 0,
  `teacherFeedback` LONGTEXT NULL,
  `aiFeedbackJson` LONGTEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `AssignmentSubmission_assignmentId_studentId_attemptNumber_key` (`assignmentId`, `studentId`, `attemptNumber`),
  KEY `AssignmentSubmission_assignmentId_idx` (`assignmentId`),
  KEY `AssignmentSubmission_studentId_idx` (`studentId`),
  KEY `AssignmentSubmission_status_idx` (`status`),
  KEY `AssignmentSubmission_submittedAt_idx` (`submittedAt`),
  CONSTRAINT `AssignmentSubmission_assignmentId_fkey`
    FOREIGN KEY (`assignmentId`) REFERENCES `Assignment` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `AssignmentSubmission_studentId_fkey`
    FOREIGN KEY (`studentId`) REFERENCES `StudentAccount` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `AssignmentAnswer` (
  `id` VARCHAR(191) NOT NULL,
  `submissionId` VARCHAR(191) NOT NULL,
  `questionId` VARCHAR(191) NOT NULL,
  `answerJson` LONGTEXT NOT NULL,
  `isCorrect` BOOLEAN NULL,
  `points` INT NOT NULL DEFAULT 0,
  `feedback` LONGTEXT NULL,
  `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `AssignmentAnswer_submissionId_questionId_key` (`submissionId`, `questionId`),
  KEY `AssignmentAnswer_submissionId_idx` (`submissionId`),
  KEY `AssignmentAnswer_questionId_idx` (`questionId`),
  KEY `AssignmentAnswer_isCorrect_idx` (`isCorrect`),
  CONSTRAINT `AssignmentAnswer_submissionId_fkey`
    FOREIGN KEY (`submissionId`) REFERENCES `AssignmentSubmission` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `AssignmentAnswer_questionId_fkey`
    FOREIGN KEY (`questionId`) REFERENCES `Question` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TODO: Add SubmissionFile once photo uploads and storage quotas are implemented.
