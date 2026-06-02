-- Maths4U Arena: teacher-owned series support.
-- Import this file manually in phpMyAdmin after selecting the production database.
-- This migration is additive only: admin/global series keep teacherId = NULL.

SET @add_series_teacher_column := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `Series` ADD COLUMN `teacherId` VARCHAR(191) NULL AFTER `id`',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Series'
    AND COLUMN_NAME = 'teacherId'
);
PREPARE stmt FROM @add_series_teacher_column;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_series_teacher_index := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX `Series_teacherId_idx` ON `Series` (`teacherId`)',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Series'
    AND INDEX_NAME = 'Series_teacherId_idx'
);
PREPARE stmt FROM @add_series_teacher_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_series_teacher_fk := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `Series` ADD CONSTRAINT `Series_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND CONSTRAINT_NAME = 'Series_teacherId_fkey'
);
PREPARE stmt FROM @add_series_teacher_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
