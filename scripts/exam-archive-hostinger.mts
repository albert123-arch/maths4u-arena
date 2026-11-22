import { basename, join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { gzipSync } from "node:zlib";
import { examArchivePlan } from "./exam-archive-metadata.mjs";

type Scalar = string | number | null;
const migration = "20261122150000_restricted_exam_archive";
const archiveTables = ["ExamArchivePaper", "ExamArchiveQuestion", "ExamArchiveTopic", "ExamArchivePaperQuestion", "ExamArchiveQuestionTopic", "ExamArchiveSource"];
const approvalFields = ["studentApproved", "statementAllowed", "solutionAllowed", "markSchemeAllowed", "assetsAllowed"];

function sql(value: Scalar) {
  if (value === null) return "NULL";
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new Error("Invalid archive number.");
    return String(value);
  }
  // Encode all metadata as UTF-8. No export value can become SQL syntax.
  return value ? "CONVERT(0x" + Buffer.from(value, "utf8").toString("hex") + " USING utf8mb4)" : "''";
}

function insertTemp(table: string, fields: readonly string[], rows: Scalar[][]) {
  const chunks = [];
  for (let offset = 0; offset < rows.length; offset += 200) {
    const values = rows.slice(offset, offset + 200).map(row => "(" + row.map(sql).join(",") + ")");
    chunks.push(`INSERT INTO ${table} (${fields.map(field => "\x60" + field + "\x60").join(",")}) VALUES\n${values.join(",\n")};`);
  }
  return chunks.join("\n");
}

async function main() {
  const { values } = parseArgs({ options: { source: { type: "string" }, out: { type: "string" }, database: { type: "string" } } });
  const { source, out, database } = values;
  if (!source || !out || !database || !/^(?:u770916388_arena|maths4u_test_[A-Za-z0-9_]+)$/.test(database)) {
    throw new Error("Usage: tsx scripts/exam-archive-hostinger.mts --source DIRECTORY --out PRIVATE_DIRECTORY --database u770916388_arena");
  }
  const { archive, hash, counts, heldAliasPlacements } = await examArchivePlan(source);
  const eligibleLinks = archive.questions.filter(row => row.syllabus === "0606" || row.syllabus === "9231");
  if (eligibleLinks.length !== 2654 || archive.sources.length !== 11825 || archive.questions.length !== 11364 || archive.papers.length !== 1113) {
    throw new Error("Unexpected archive snapshot scope.");
  }
  const eligibleIds = new Set(eligibleLinks.map(row => row.id));
  const sourceKeys = archive.sources.filter(row => eligibleIds.has(row.questionId)).map(row => {
    const ref = row.references[0];
    return [row.questionId, row.sourceKey.split(":").at(-1)!, ref.syllabus, ref.year, ref.session, ref.paperCode, ref.printed.replace(/^0+/, "")];
  });
  const start = `-- Arena restricted exam archive metadata. Source plan ${hash}.
-- Run from the selected database in one session with partial import disabled.
SET @ea_ok = 0;
SET @ea_committed = 0;
SET @ea_inserted = 0;
SET @ea_backfilled = 0;
${archiveTables.map((table, index) => `CREATE TEMPORARY TABLE ea_${index + 1} LIKE \x60${table}\x60;`).join("\n")}
CREATE TEMPORARY TABLE ea_native (
  questionId VARCHAR(191) NOT NULL,
  legacyId VARCHAR(20) NOT NULL,
  syllabus VARCHAR(10) NOT NULL,
  year INT NOT NULL,
  session VARCHAR(40) NOT NULL,
  paperCode VARCHAR(30) NOT NULL,
  printed VARCHAR(40) NOT NULL,
  UNIQUE KEY (legacyId), KEY (questionId)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
${insertTemp("ea_1", ["id","syllabus","year","session","paperCode","officialUrl"], archive.papers.map(r => [r.id,r.syllabus,r.year,r.session,r.paperCode,r.officialUrl]))}
${insertTemp("ea_2", ["id","syllabus","marks"], archive.questions.map(r => [r.id,r.syllabus,r.marks]))}
${insertTemp("ea_3", ["id","syllabus","courseKey","courseTitle","chapterKey","chapterTitle","chapterOrder","title","position"], archive.topics.map(r => [r.id,r.syllabus,r.courseKey,r.courseTitle,r.chapterKey,r.chapterTitle,r.chapterOrder,r.title,r.position]))}
${insertTemp("ea_4", ["paperId","number","questionId"], archive.paperQuestions.map(r => [r.paperId,r.number,r.questionId]))}
${insertTemp("ea_5", ["questionId","topicId"], archive.questionTopics.map(r => [r.questionId,r.topicId]))}
${insertTemp("ea_6", ["sourceKey","questionId","printedPart","references"], archive.sources.map(r => [r.sourceKey,r.questionId,r.printedPart,JSON.stringify(r.references)]))}
${insertTemp("ea_native", ["questionId","legacyId","syllabus","year","session","paperCode","printed"], sourceKeys)}
START TRANSACTION;
-- Resolve current TaskVersion IDs against target provenance and exam metadata.
CREATE TEMPORARY TABLE ea_links (PRIMARY KEY (questionId)) ENGINE=InnoDB AS
SELECT x.questionId, MIN(v.id) AS versionId, MAX(IF(v.difficultyKnown,v.difficulty,NULL)) AS difficulty
FROM ea_native x
JOIN ImportRecord i ON i.sourceProject='maths4u' AND i.legacyId IN(x.legacyId,CONCAT('problems:',x.legacyId))
JOIN Task t ON t.id=i.taskId AND t.origin='CAMBRIDGE_EXAM' AND t.examArchivedAt IS NOT NULL
JOIN TaskVersion v ON v.taskId=t.id AND v.number=(SELECT MAX(latest.number) FROM TaskVersion latest WHERE latest.taskId=t.id)
WHERE v.syllabus=x.syllabus AND v.year=x.year AND v.paper=x.paperCode
  AND TRIM(LEADING '0' FROM TRIM(v.questionNumber)) = x.printed COLLATE utf8mb4_bin
  AND CASE LOWER(TRIM(v.examSession))
    WHEN 'm' THEN 'March' WHEN 'mar' THEN 'March' WHEN 'march' THEN 'March'
    WHEN 's' THEN 'June' WHEN 'jun' THEN 'June' WHEN 'june' THEN 'June'
    WHEN 'w' THEN 'November' WHEN 'nov' THEN 'November' WHEN 'november' THEN 'November' END=x.session
GROUP BY x.questionId HAVING COUNT(DISTINCT v.id)=1;
UPDATE ea_2 draft JOIN ea_links ON ea_links.questionId=draft.id
SET draft.taskVersionId=ea_links.versionId, draft.difficulty=ea_links.difficulty;
UPDATE ea_3 a JOIN Course c ON c.slug=a.courseKey AND c.published=1 AND c.archivedAt IS NULL SET a.courseSlug=c.slug;
CREATE TEMPORARY TABLE ea_lesson_links (PRIMARY KEY (topicId)) ENGINE=InnoDB AS
SELECT a.id AS topicId, MIN(l.id) AS lessonId
FROM ea_3 a JOIN Course c ON c.slug=a.courseSlug JOIN Topic t ON t.courseId=c.id
JOIN TopicText tt ON tt.topicId=t.id AND tt.locale='en'
JOIN Lesson l ON l.topicId=t.id AND l.archivedAt IS NULL
JOIN LessonVersion lv ON lv.lessonId=l.id AND lv.number=(SELECT MAX(v.number) FROM LessonVersion v WHERE v.lessonId=l.id)
JOIN LessonText lt ON lt.versionId=lv.id AND lt.locale='en'
WHERE REGEXP_REPLACE(LOWER(tt.title),'[^a-z0-9]+','')=REGEXP_REPLACE(LOWER(a.chapterTitle),'[^a-z0-9]+','')
  AND REGEXP_REPLACE(LOWER(lt.title),'[^a-z0-9]+','')=REGEXP_REPLACE(LOWER(a.title),'[^a-z0-9]+','')
  AND EXISTS (SELECT 1 FROM LessonTask x JOIN Task q ON q.id=x.taskId WHERE x.lessonId=l.id AND q.origin='ORIGINAL' AND q.visibility='PUBLIC' AND q.archivedAt IS NULL AND q.examArchivedAt IS NULL)
GROUP BY a.id HAVING COUNT(DISTINCT l.id)=1;
UPDATE ea_3 a JOIN ea_lesson_links l ON l.topicId=a.id SET a.lessonId=l.lessonId;
SET @ea_linked = (SELECT COUNT(*) FROM ea_links);
SET @ea_conflict =
 (SELECT COUNT(*) FROM ea_1 n JOIN ExamArchivePaper o ON o.id=n.id OR (o.syllabus=n.syllabus AND o.year=n.year AND o.session=n.session AND o.paperCode=n.paperCode)
   WHERE o.id<>n.id OR o.syllabus<>n.syllabus OR o.year<>n.year OR o.session<>n.session OR o.paperCode<>n.paperCode)
 + (SELECT COUNT(*) FROM ea_2 n JOIN ExamArchiveQuestion o ON o.id=n.id OR o.taskVersionId=n.taskVersionId
   WHERE o.id<>n.id OR o.syllabus<>n.syllabus OR (n.taskVersionId IS NOT NULL AND o.taskVersionId IS NOT NULL AND o.taskVersionId<>n.taskVersionId))
 + (SELECT COUNT(*) FROM ea_3 n JOIN ExamArchiveTopic o ON o.id=n.id WHERE o.syllabus<>n.syllabus OR o.courseKey<>n.courseKey OR o.chapterKey<>n.chapterKey)
 + (SELECT COUNT(*) FROM ea_4 n JOIN ExamArchivePaperQuestion o ON o.paperId=n.paperId AND o.number=n.number WHERE o.questionId<>n.questionId)
 + (SELECT COUNT(*) FROM ea_6 n JOIN ExamArchiveSource o ON o.sourceKey=n.sourceKey WHERE o.questionId<>n.questionId);
SET @ea_ok = DATABASE()=${sql(database)} AND @ea_linked=2654 AND @ea_conflict=0
 AND (SELECT COUNT(*) FROM _prisma_migrations WHERE migration_name='${migration}' AND finished_at IS NOT NULL AND rolled_back_at IS NULL)=1
 AND (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN (${archiveTables.map(sql).join(",")}) AND ENGINE='InnoDB')=6
 ${[archive.papers,archive.questions,archive.topics,archive.paperQuestions,archive.questionTopics,archive.sources].map((rows,i) => `AND (SELECT COUNT(*) FROM ea_${i+1})=${rows.length}`).join("\n ")};
`;
  const columns = [
    "id,syllabus,year,session,paperCode,officialUrl",
    "id,syllabus,marks,difficulty,taskVersionId," + approvalFields.join(","),
    "id,syllabus,courseKey,courseTitle,chapterKey,chapterTitle,chapterOrder,title,position,courseSlug,lessonId",
    "paperId,number,questionId", "questionId,topicId", "sourceKey,questionId,printedPart,\x60references\x60",
  ];
  const identities = ["o.id=n.id", "o.id=n.id", "o.id=n.id", "o.paperId=n.paperId AND o.number=n.number", "o.questionId=n.questionId AND o.topicId=n.topicId", "o.sourceKey=n.sourceKey"];
  const apply = archiveTables.map((target, index) => `INSERT INTO \x60${target}\x60 (${columns[index]})
SELECT ${columns[index].split(",").map(column => "n." + column).join(",")} FROM ea_${index + 1} n WHERE @ea_ok=1
 AND NOT EXISTS (SELECT 1 FROM \x60${target}\x60 o WHERE ${identities[index]});
SET @ea_inserted = @ea_inserted + ROW_COUNT();`).join("\n") + `
UPDATE ExamArchiveQuestion q JOIN ea_2 n ON n.id=q.id
SET q.taskVersionId=n.taskVersionId
WHERE @ea_ok=1 AND n.taskVersionId IS NOT NULL AND q.taskVersionId IS NULL AND q.approvalReference IS NULL
 AND q.studentApproved=0 AND q.statementAllowed=0 AND q.solutionAllowed=0 AND q.markSchemeAllowed=0 AND q.assetsAllowed=0;
SET @ea_backfilled=ROW_COUNT();
SET @ea_committed = @ea_ok=1
 ${archiveTables.map((target,index) => `AND NOT EXISTS (SELECT 1 FROM ea_${index+1} n WHERE NOT EXISTS (SELECT 1 FROM \x60${target}\x60 o WHERE ${identities[index]}))`).join("\n ")}
 AND NOT EXISTS (SELECT 1 FROM ea_2 n JOIN ExamArchiveQuestion q ON q.id=n.id
   WHERE n.taskVersionId IS NOT NULL AND NOT(q.taskVersionId <=> n.taskVersionId));
SET @ea_statement = IF(@ea_committed=1,'COMMIT','ROLLBACK');
PREPARE ea_finalize FROM @ea_statement;
EXECUTE ea_finalize;
DEALLOCATE PREPARE ea_finalize;
`;
  const summary = `SELECT DATABASE() AS target, @ea_ok AS ready, @ea_committed AS committed, @ea_linked AS linked_0606_9231,
  @ea_conflict AS conflicting_keys, @ea_inserted AS inserted_rows, @ea_backfilled AS filled_version_links,
  ${sql(hash)} AS metadata_sha256;
SELECT o.syllabus, COUNT(*) AS archive_papers FROM ExamArchivePaper o JOIN ea_1 n ON n.id=o.id GROUP BY o.syllabus ORDER BY o.syllabus;
SELECT o.syllabus, COUNT(*) AS archive_questions, SUM(o.taskVersionId IS NOT NULL) AS linked_versions,
  SUM(o.studentApproved OR o.statementAllowed OR o.solutionAllowed OR o.markSchemeAllowed OR o.assetsAllowed) AS rights_enabled
  FROM ExamArchiveQuestion o JOIN ea_2 n ON n.id=o.id GROUP BY o.syllabus ORDER BY o.syllabus;
`;
  // Omit persistent output tables; phpMyAdmin only receives references and taxonomy.
  await mkdir(out, { recursive: true });
  for (const [name, data] of [["preview", start + "ROLLBACK;\n" + summary], ["apply", start + apply + summary]]) {
    await writeFile(join(out, `arena-exam-archive-${name}.sql.gz`), gzipSync(data), { flag: "wx" });
  }
  console.log(JSON.stringify({ output: basename(out), target: database, hash, counts, heldAliasPlacements }, null, 2));
}

await main().catch(error => {
  console.error(error instanceof Error ? error.message : "Archive bundle generation failed.");
  process.exitCode = 1;
});
