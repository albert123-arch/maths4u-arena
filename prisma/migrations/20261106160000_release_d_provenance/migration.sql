-- Runtime's HTTP readiness gate remains closed until all migrations and Release D finish.
-- Never edit an older migration checksum. Preserve all policy values before changing any.
CREATE TABLE ContentRelease (
  `key` VARCHAR(80) NOT NULL, fingerprint VARCHAR(64) NOT NULL, state VARCHAR(32) NOT NULL,
  details JSON NOT NULL, completedAt DATETIME(3) NULL, PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE ContentReleaseTaskBackup (
  releaseKey VARCHAR(80) NOT NULL, taskId VARCHAR(191) NOT NULL, origin VARCHAR(32) NOT NULL,
  originManual BOOLEAN NOT NULL, originReason VARCHAR(1000) NULL, originRule VARCHAR(80) NULL,
  examArchivedAt DATETIME(3) NULL, PRIMARY KEY (releaseKey, taskId)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
INSERT INTO ContentReleaseTaskBackup
 SELECT 'release-d-20261106', id, origin, originManual, originReason, originRule, examArchivedAt FROM Task;

-- H1 precedence: either exact alias in ANY historical version; EXAM category is irrelevant.
UPDATE Task t SET
 t.origin = IF(t.originManual, t.origin, 'CAMBRIDGE_EXAM'),
 t.originReason = IF(t.originManual, t.originReason, 'H1 exact Cambridge source/board in a preserved version'),
 t.originRule = IF(t.originManual, t.originRule, 'release-d-20261106'),
 t.examArchivedAt = COALESCE(t.examArchivedAt, CURRENT_TIMESTAMP(3))
 WHERE EXISTS (SELECT 1 FROM TaskVersion v LEFT JOIN Source s ON s.id=v.sourceId
   WHERE v.taskId=t.id AND (v.examBoard IN ('Cambridge','Cambridge International') OR s.name IN ('Cambridge','Cambridge International')));

-- Only the same corroborated Maths4U provenance accepted by the authored importers.
UPDATE Task t SET t.origin='ORIGINAL', t.originReason='Explicit Maths4U Original source, editorial UID and authoring reference', t.originRule='release-d-20261106'
 WHERE t.originManual=false AND t.examArchivedAt IS NULL
 AND EXISTS (SELECT 1 FROM TaskVersion v WHERE v.taskId=t.id)
 AND NOT EXISTS (SELECT 1 FROM TaskVersion v LEFT JOIN Source s ON s.id=v.sourceId WHERE v.taskId=t.id
   AND NOT (COALESCE(s.name,'') LIKE 'Maths4U Original%' AND COALESCE(v.sourceUid,'') LIKE 'M4U-%'
   AND (COALESCE(v.sourceReference,'') LIKE '%original exam-style%' OR COALESCE(v.sourceReference,'') LIKE '%original short practice%' OR COALESCE(v.sourceReference,'') LIKE '%owner-supplied original package%')));

-- Owner-confirmed Book 2 identities, not local Task IDs or a broad source-name approval.
UPDATE Task t JOIN ImportRecord i ON i.taskId=t.id
 SET t.origin='ORIGINAL', t.originManual=true, t.originReason='owner confirmed authorship, 6 Nov 2026', t.originRule='owner-stage6b-20261106'
 WHERE t.originManual=false AND t.examArchivedAt IS NULL AND i.sourceProject='olymp' AND i.legacyId IN ('493','494','495','496','497','498','499','500','501','502','503','504','505','506','507','508','509','510','511','512')
 AND EXISTS (SELECT 1 FROM TaskVersion v JOIN Source s ON s.id=v.sourceId WHERE v.taskId=t.id AND s.name='Olymp / Book 2. Olympiad Number Theory Methods'
 AND v.questionNumber=CONCAT('NT-B2-M01-P',LPAD(CAST(i.legacyId AS UNSIGNED)-492,3,'0')))
 AND NOT EXISTS (SELECT 1 FROM TaskVersion v LEFT JOIN Source s ON s.id=v.sourceId WHERE v.taskId=t.id
 AND (COALESCE(s.name,'') <> 'Olymp / Book 2. Olympiad Number Theory Methods' OR COALESCE(v.questionNumber,'') <> CONCAT('NT-B2-M01-P',LPAD(CAST(i.legacyId AS UNSIGNED)-492,3,'0'))));

UPDATE Task t SET
 t.originReason=IF(t.originManual,t.originReason,'owner requested demo archive, 6 Nov 2026'),
 t.originRule=IF(t.originManual,t.originRule,'owner-stage6b-20261106'),
 t.origin=IF(t.originManual,t.origin,'DEMO'), t.originManual=true,
 t.examArchivedAt=COALESCE(t.examArchivedAt,CURRENT_TIMESTAMP(3))
 WHERE EXISTS (SELECT 1 FROM TaskVersion v JOIN Source s ON s.id=v.sourceId WHERE v.taskId=t.id AND s.name='Local preview demo');
