# Файловый импорт

Источники изучались только чтением. PHP/Laravel-приложения и старые SQL не запускались, базы не подключались, файлы не менялись.

| Источник | Прочитанные модели | Соответствие |
| --- | --- | --- |
| maths4u | club-import-work/schema.sql; AS-Alevel/browse_exam_questions.php | body_html → statement; solution_html → solution; syllabus/exam_board/exam_year/exam_session/component/question_no → поля TaskVersion |
| olymp | database/schema.sql; Laravel Problem/ProblemText; database/seed.sql | problem_texts по lang → переводы конкретной версии; statement/hint/solution/teacher_note и source_name/year/problem_code |
| Arena | прежние Question/QuestionOption/GradingRules | prompt/explanation → тексты; EXACT/ACCEPTED_ANSWERS/NUMERIC_TOLERANCE → явные правила |

Контейнер: `{ "project": "maths4u|olymp|arena", "records": [{ "id": "legacy-id", ... }] }`.

Минимальные примеры в fixtures:

- arena.json — реально существовавшая строка из удалённого демо-SQL: demo_series_test_01_q_numeric.
- maths4u.json — **синтетическая**, не подлинная экзаменационная задача в изученном формате. ID с префиксом fixture: и источник явно обозначают пример.
- olymp.json — **синтетическая** двуязычная задача на чётность в формате problem_texts.

Для точного переноса можно передать `{ id, material: TaskInput }`. Material соответствует Zod-схеме `src/lib/content.ts`: переводы, части, критерии, варианты, допустимые ответы, темы, метаданные и assets. Неизвестные правила старого Arena требуют MANUAL либо явного преобразования, а не приблизительной автопроверки.

Одинаковый импорт пропускается. Изменившийся сохраняет Task.id и создаёт новую редакцию; опубликованные работы остаются на прежней. Весь файл проверяется до записи и импортируется одной транзакцией.

V1 не читает SQL и не копирует файлы по внешним путям. Старые SQL содержат разрушительные команды. Рисунки/PDF сначала загружаются через редактор или POST /api/files; их fileId затем указываются в canonical material.assets с ролью STATEMENT/HINT/SOLUTION/TEACHER. Для массового переноса нужна отдельная процедура преобразования путей, проверки файлов и TeX-макросов. Курсы и теория добавляются административным редактором.

Лимит одной загрузки — 100 материалов и 2 МБ. Пользователи и результаты старых проектов не импортируются в этой задаче.
