# Arena → Maths4U: аудит, 13 сентября 2026

На момент исходного аудита применимых AGENTS.md в Arena, родительских папках и двух читаемых проектах не найдено. Исходный git status: только пользовательский `database/demo_5_series_tests.sql` (untracked). Позднее пользователь явно разрешил удалить старые незакоммиченные тесты; этот файл удалён в рамках очистки. После обновления Next.js появились автоматически созданные AGENTS.md/CLAUDE.md; инструкции прочитаны, файлы сохранены в Git.

Сохранён стек Next.js 16 / React 19 / TypeScript / Tailwind / Zod / Prisma 7 / MySQL (MariaDB adapter), standalone Node entrypoint, bcrypt и компоненты приглашения по QR/копирования.

Старая модель содержит отдельные User и StudentAccount, JWT без серверного реестра сессий, гостевых Participant без userId, ссылки опубликованных TestVersion на изменяемые Question и каскадное удаление результатов. Assignment start/save/submit и игровые маршруты используют эту модель. Под новую базу их нельзя безопасно оставить активными. После переноса подходящих компонентов старые 269 файлов сверены с HEAD по Git-хешам и удалены из рабочей папки вместе с устаревшими SQL и игровыми ресурсами; исходники остаются в истории Git. Временная legacy-папка также удалена. Игра с ведущим отложена; новое приложение развивается в этом же репозитории.

В `.env` DATABASE_URL указывает на localhost и базу со старым именем Arena. Назначение и сохранность этой базы не подтверждены. Подключений к ней не выполнялось. Новая конфигурация читает только MATHS4U_DATABASE_URL и проверяет MATHS4U_DATABASE_NAME; прежние DATABASE_URL/DB_* игнорируются. Для проверки используется отдельный локальный экземпляр на порту 33317 с данными внутри Arena.

Источники изучены только чтением файлов, без подключения к базам:

- maths4u: `club-import-work/schema.sql`, `AS-Alevel/browse_exam_questions.php`, таблицы problems/parts, предметы, главы, syllabus, exam_year, exam_session, paper_code, question_number. Материалы используют HTML и TeX.
- olymp: `database/schema.sql`, `database/seed.sql`, Laravel Models/Problem.php и ProblemText.php: course/chapter, problems, problem_texts RU/EN, source_* и problem_media с ролью statement/hint/solution/teacher_note.
- Arena: Question, QuestionOption, gradingRulesJson, TestVersionQuestion.

Импорт должен принимать ограниченные файловые выгрузки, сохранять пару sourceProject + legacyId и хеш содержимого. Не запускать SQL старых проектов: в нём встречаются DROP TABLE. Массовый перенос и работа с действующими базами исключены.
