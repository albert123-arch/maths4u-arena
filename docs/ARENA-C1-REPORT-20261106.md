# C1 — Further Pure Mathematics 1: Roots of polynomial equations

Дата: 6 ноября 2026. Канонический проект: `D:\www\arena`.
Выполнен только C1. После отдельной команды владельца глава **PUBLISHED**
в локальной тестовой базе; подробности — раздел 10. Первоначальная приёмка
ниже зафиксирована для состояния DRAFT.

## 1. Результат и границы

В существующий курс `maths4u-9231-fp1` добавлена самостоятельная глава
`fp1_roots` с четырьмя уроками. Названия существующих курсов в базе не менялись.
Подключены **все 62 адаптации владельца** (502 письменных балла), 32 новые
короткие проверки и 16 разобранных примеров. Отложенных задач — **0**.
Дополнительные 11 задач включены согласно последующему решению владельца.
Числовой порог сходства и исключение по нему отменены в плане и roadmap.

Существующие задачи Cambridge не изменены и не получили новые версии от этого
импорта. Адаптации получили новые Task и стабильные editorial UID
`M4U-9231-FP1-RPE-<id>`. Сопоставление с архивом — служебные данные администратора,
а не утверждение о сходстве формулировок или вывод об авторстве.

Исходная папка `E:\my folder\questions_data\original\Pure1 9231` не изменялась.
SHA-256 файла `01_Roots_of_polynomial_equations_9231_revised.json`:

`916ce7b9f0d567beb6053efadf7e95e5285a3160458ed3bcb7ab27833aa214e2`.

Сохранены предоставленные условия, ответы, решения, подсказки, баллы и критерии.
Нормализованы только структура импорта и представление критериев.
Сложность: standard → 3, advanced → 4, challenge → 5.
Поле exam и происхождение не попадают в ученические и учительские DTO.

Учебник `D:\new_books\furhter_cambridge.pdf` использован как справочник по
математическим идеям и требуемым методам. Новые конспекты, объяснения и примеры
составлены самостоятельно; примеры имеют свои данные и решения. Тексты, рисунки
и изображения страниц учебника в пакет и приложение не переносились.

## 2. Уроки и распределение

| Урок | ID | Exam-style | Quick checks | Примеры |
|---|---|---:|---:|---:|
| Roots and coefficients of quadratic, cubic and quartic equations | fp1_roots_coefficients | 7 | 8 | 4 |
| Symmetric functions of roots and power sums | fp1_roots_symmetric_sums | 11 | 8 | 4 |
| Transforming equations by substitution | fp1_roots_transformations | 30 | 8 | 4 |
| Mixed problems | fp1_roots_mixed | 14 | 8 | 4 |
| **Итого** | | **62** | **32** | **16** |

Распределение использует syllabus_tags и содержание задачи, а не исходные
контейнеры lessons. Пересекающиеся навыки сохранены в данных; каждой задаче
назначен один основной урок. У всех уроков есть Objective, Before you start со
ссылками, Key ideas с обоснованиями, Method, четыре Worked examples и Common
mistakes. Алгебраические формулы отображаются KaTeX.

В каждом уроке 6 SHORT и 2 MC. Четыре семейства по два варианта позволяют
повторять навык на других данных. Проверяются все запрошенные поля, включая
точные дроби и полное уравнение; эквивалентные точные ответы принимаются.
Пустой или частичный ответ не считается верным.

Гостевые черновики и результаты восстанавливаются из браузера. Для вошедшего
ученика используется существующий движок IndependentCheck/LearningProgress;
ошибки и использованная помощь влияют на повторение. На главной новые карточки
относятся к выбранному опубликованному курсу. Новый параллельный движок прогресса
не создавался.

Письменные задачи имеют отдельные Hint / Worked solution / Marking guidance.
Критерии представлены таблицей с общей суммой и отдельной самооценкой;
легенда кодов раскрывается отдельно. Внутренний статус критериев — DRAFT.
Самооценка не создаёт автоматическую оценку, ответ за ученика или Review учителя.
Полнота письменного доказательства автоматическим проверяющим не оценивается.

### Сопоставление всех 62 адаптаций

Ниже указан исходный ID из provenance и соответствующий архивный Task.
Новый editorial UID всегда равен `M4U-9231-FP1-RPE-<ID>`.
Полная машиночитаемая таблица, включая archiveVersionId, теги и хеши:
[ARENA-C1-SOURCE-AUDIT-20261106.json](ARENA-C1-SOURCE-AUDIT-20261106.json).
Служебные диагностические числа в этом файле не используются для допуска
публикации, не выводятся ученику и не являются заключением об авторстве.

| ID | Архивный Task | Основной урок | Баллы |
|---|---|---|---:|
| 4157 | `cmu2x1s1p05y37b41mngms0x5` | Transformations | 6 |
| 4164 | `cmu2x1s1w05y87b41snr0m1hc` | Transformations | 6 |
| 4246 | `cmu2x1sco05yt7b4110ghw4hi` | Roots and coefficients | 8 |
| 4268 | `cmu2x1scw05yy7b41u3d2qnwj` | Transformations | 11 |
| 4274 | `cmu2x1sd405z37b41n3zvmyv1` | Symmetric functions | 6 |
| 5809 | `cmu2x1sn905ze7b41ununcogp` | Transformations | 8 |
| 5851 | `cmu2x1so405zy7b41mz3dheuc` | Mixed problems | 8 |
| 5871 | `cmu2x1syl06097b4115ihi96t` | Roots and coefficients | 6 |
| 5889 | `cmu2x1sys060e7b41ij4fotty` | Symmetric functions | 8 |
| 6218 | `cmu2x1sz2060j7b415w4yyoom` | Symmetric functions | 5 |
| 6236 | `cmu2x1szb060o7b41tqqkjttg` | Symmetric functions | 8 |
| 6267 | `cmu2x1t9m060z7b41aa99234g` | Roots and coefficients | 5 |
| 6284 | `cmu2x1t9t06147b41q1433ng2` | Roots and coefficients | 8 |
| 6317 | `cmu2x1tb6061e7b410ussgep9` | Symmetric functions | 6 |
| 6355 | `cmu2x1tlo061u7b417ccqq59w` | Symmetric functions | 8 |
| 6409 | `cmu2x1tx6062k7b41ma6wcl4d` | Symmetric functions | 6 |
| 6420 | `cmu2x1txt062u7b41btfcr5ji` | Symmetric functions | 6 |
| 6445 | `cmu2x1u7z06357b4158v6so41` | Mixed problems | 8 |
| 6477 | `cmu2x1u8i063f7b41tnr361vd` | Mixed problems | 6 |
| 6498 | `cmu2x1uiu063q7b41naa0w21x` | Roots and coefficients | 5 |
| 6516 | `cmu2x1uj2063v7b416q3cjodz` | Symmetric functions | 8 |
| 6535 | `cmu2x1ujj06457b417sk9h6fe` | Roots and coefficients | 6 |
| 6544 | `cmu2x1ujq064a7b414sptg3q3` | Transformations | 7 |
| 6374 | `cmu2x1tly061z7b41jlw0r438` | Mixed problems | 14 |
| 6385 | `cmu2x1tm706247b41jt2laq0n` | Mixed problems | 14 |
| 6398 | `cmu2x1twv062f7b416t9bepla` | Transformations | 6 |
| 6418 | `cmu2x1txl062p7b41l8ymazys` | Mixed problems | 14 |
| 6566 | `cmu2x1uu3064l7b41nvpn64iy` | Transformations | 5 |
| 6587 | `cmu2x1uul064v7b41e6kqykr4` | Mixed problems | 10 |
| 4138 | `cmu2x1v5406567b41v9rajnkg` | Transformations | 10 |
| 4145 | `cmu2x1v5b065b7b41su13jd69` | Symmetric functions | 10 |
| 4152 | `cmu2x1v5h065g7b41pr6wmiau` | Transformations | 10 |
| 4180 | `cmu2x1v5q065l7b41899bhs4l` | Symmetric functions | 8 |
| 4194 | `cmu2x1v5x065q7b41jl0svg7c` | Transformations | 8 |
| 4262 | `cmu2x1vge06667b416f7z0b6e` | Transformations | 9 |
| 6292 | `cmu2x1vgw066h7b41u7x4ts49` | Roots and coefficients | 6 |
| 4108 | `cmu2x1rqw05xn7b413nog2scp` | Transformations | 7 |
| 4116 | `cmu2x1rr705xs7b41cqfvhwrd` | Transformations | 7 |
| 4172 | `cmu2x1s2305yd7b41ombq6jbe` | Transformations | 7 |
| 4235 | `cmu2x1s2c05yi7b41rc5pqsph` | Transformations | 8 |
| 5820 | `cmu2x1snh05zj7b41zqr1z2oj` | Transformations | 9 |
| 5843 | `cmu2x1snw05zt7b41fzf8pk5y` | Transformations | 9 |
| 5864 | `cmu2x1syd06047b41m8ynhove` | Transformations | 8 |
| 6243 | `cmu2x1t9f060u7b41mdva0p7i` | Transformations | 5 |
| 6307 | `cmu2x1tax06197b415o8vvdbc` | Transformations | 8 |
| 6335 | `cmu2x1tl8061k7b41t2i8ps4c` | Transformations | 10 |
| 6340 | `cmu2x1tlg061p7b41cjnlz3bz` | Transformations | 4 |
| 6388 | `cmu2x1twi062a7b41xk5d7imy` | Transformations | 8 |
| 6456 | `cmu2x1u88063a7b41nfinq84l` | Transformations | 7 |
| 6494 | `cmu2x1u8q063k7b412fafjopf` | Transformations | 10 |
| 6527 | `cmu2x1uja06407b41b6c2u0r6` | Transformations | 9 |
| 6594 | `cmu2x1uut06507b41zfu462wr` | Transformations | 9 |
| 4215 | `cmu2x1vg0065w7b41pwom3f1u` | Transformations | 9 |
| 4254 | `cmu2x1vg806617b41o3pjgmao` | Transformations | 9 |
| 5884 | `cmu2x1vgl066b7b4163vk1wer` | Transformations | 8 |
| 4132 | `cmu2x1s1h05xy7b41kqf3a9h0` | Mixed problems | 10 |
| 4240 | `cmu2x1scg05yo7b41w6pv1cef` | Mixed problems | 7 |
| 5803 | `cmu2x1sdd05z87b41fw8zj4x1` | Mixed problems | 11 |
| 5834 | `cmu2x1snp05zo7b41yyvj70nm` | Mixed problems | 11 |
| 6429 | `cmu2x1u7r06307b41si36y9ai` | Mixed problems | 14 |
| 6557 | `cmu2x1utv064g7b415cyc9juq` | Mixed problems | 7 |
| 6582 | `cmu2x1uub064q7b41lwhz3cgi` | Mixed problems | 8 |

## 3. Повторно используемый механизм пакетов

Пакет `content/original/9231-fp1/roots-v1.json`:
`schema_version=1`, `key=9231-fp1-roots`, `version=1.0.0`.
Всего **94 учебные задачи**: 62 письменные, 24 SHORT и 8 MC.

- Строгая схема Zod, серверный реестр и CI-проверка пакета. Следующие главы
  используют тот же формат без отдельных флагов деплоя.
- Раздел администратора `/admin/content-packages`: dry-run с числами
  create/update/skip и токеном снимка. Dry-run не пишет в базу.
- Применение требует фактического администратора вне режима «Смотреть как».
  Токен проверяется повторно внутри сериализуемой транзакции. Изменившийся
  снимок отклоняется как STALE_DRY_RUN.
- Новые задачи создаются PRIVATE, с ручным origin ORIGINAL. ImportRecord
  сохраняет устойчивое сопоставление. Изменения следующей версии добавляют
  TaskVersion/LessonVersion вместо перезаписи истории.
- На пакет и версию создаётся один ContentRelease и AuditEvent применения.
  Повтор той же версии — ноль записей, включая отсутствие нового AuditEvent.
  Замена содержимого под уже применённым номером версии отклоняется.
- Первое применение не публикует главу. Отдельное действие Publish chapter
  открывает её гостю. До этого публичные страницы и API возвращают 404.
- Archive package обратимо архивирует только записи своего пакета.
  Restore draft возвращает их PRIVATE; публикация снова требует отдельного
  действия. Версии, попытки, ответы и прогресс сохраняются.
- Утверждённые ключи связаны с конкретными TaskVersion. Если текущая задача
  независимо отредактирована, проверка отклоняется, а не использует старый ключ.
  Ключи задач, выданных в работе, зафиксированы в неизменяемых TaskPart.
- В public DTO нет ключей и provenance. Серверные JSON не раздаются статикой:
  `/content/original/9231-fp1/roots-v1.json` возвращает настоящий 404.

Описание эксплуатации: [CONTENT-PACKAGES.md](CONTENT-PACKAGES.md).
Миграция `20261106100000_content_packages` добавляет таблицу ContentPackage;
существующие таблицы учебных результатов не перестраиваются.

## 4. Математическая и редакторская проверка

Журнал: [ARENA-C1-MATH-CHECKS-20261106.json](ARENA-C1-MATH-CHECKS-20261106.json).

| Группа | Проверок | Результат |
|---|---:|---|
| Алгебраические утверждения в 62 задачах владельца | 194 | PASS |
| Новые разобранные примеры (16 примеров) | 21 | PASS |
| Поля ответов и варианты новых 32 quick checks | 52 | PASS |
| Суммы критериев всех 94 задач | 94 | PASS |
| **Итого** | **361** | **Ошибок 0** |

Sympy 1.14.0 проверяет суммы степеней, элементарные симметрические функции,
результанты преобразований, множество корней и особые случаи. Проверки
привязаны к хешам текста и ключей, чтобы последующая правка пакета не могла
незаметно использовать старый успешный журнал.

Ошибок в математических ответах предоставленных 62 задач не выявлено.
Это не означает автоматической проверки каждой фразы доказательства:
педагогическая оценка всей главы остаётся за владельцем.

При подготовке исправлена ошибка **в новом примере E-T4**, а не в файле
владельца. Для `P(x)=x³−x²+2x−3` и `y=(x+2)/(x−1)` верное уравнение
`y³−12y²+3y−19=0`; дополнительная проверка `Q(1)=−27` исключает ложный
корень от устранения знаменателя. После исправления полный журнал повторён.

Редакторская проверка: британский английский, единое оформление формул,
полные ограничения на нулевые знаменатели и повторяющиеся корни, без
экзаменационных обозначений в публичных карточках.

## 5. Тесты, внешний вид и роли

| Проверка | Результат |
|---|---|
| Unit/regression: пакеты, все 152 прежние задачи Quadratics, точные форматы, повторение, view lens, происхождение | 19/19 |
| Local integration: dry-run, stale token, права, идемпотентность, публикация/архив/возврат, прогресс, самооценка, замороженные ключи старой работы | 2/2 |
| Playwright: 4 урока и полная проверка, гостевая практика/приватность, общие страницы/кабинеты | 3/3 |
| Адаптивные матрицы: 32 для главы + 56 общих страниц | 88/88 |
| Контраст 12 пар текста/фона, обе темы | Все ≥ 4.5:1, минимум 5.6:1 |
| TypeScript `tsc --noEmit` | PASS |
| ESLint изменённого TypeScript/JavaScript | PASS, без предупреждений |
| Полная production-сборка Node 22 / Webpack / standalone | PASS, локальная Windows |
| Аудит standalone-артефакта (23643 файла) и поиск служебных полей в клиентском JS | PASS, секретов нет; ключи и provenance отсутствуют в клиентском JS |
| `git diff --check` | PASS |
| Локальный `/api/health` | HTTP 200 |

Четыре ширины: 1280, 390, 360 и 768 px; светлая и тёмная темы.
Проверены отсутствие горизонтальной прокрутки и обрезанных кнопок, KaTeX,
ошибочный/полный ответ, подсказка, восстановление полей после reload, свежий
вариант и сохранение письменной самооценки. Снимки 390/1280 сохранены.

| Роль | Проверено |
|---|---|
| Гость | Черновая глава и прямые API закрыты 404; после временной локальной публикации доступна практика без записи аккаунта, с восстановлением в браузере |
| Ученик | Сохранение независимых проверок, повторение, выбранный FP1 на главной; самооценка отдельно от autoPoints/Review |
| Учитель | Административные пакеты 403; неопубликованные уроки 404; все прежние маршруты презентаций 404 |
| Администратор | Dry-run/apply/state и частный предпросмотр; доступны все 59 прежних презентаций |
| Viewing lens | Изменения пакетов запрещены; существующие проверки USER/ROLE и stale nonce проходят |

Во время тестов публикация выполнялась только на локальной копии: гостевой
каталог 688 → 782, после archive/restore снова **688**.
Итоговое состояние главы — **DRAFT**, она не опубликована.

Linux CI дополнен проверкой схемы и математики, но удалённый GitHub Actions
в этом запуске не запускался: push запрещён. Успешная Windows-сборка не
выдаётся за выполненную Linux-проверку.

### Воспроизведение

```powershell
python scripts/content/verify-fp1-roots.py --owner 'E:\my folder\questions_data\original\Pure1 9231\01_Roots_of_polynomial_equations_9231_revised.json' --report docs/ARENA-C1-MATH-CHECKS-20261106.json
& '.local/node22/node.exe' --import tsx --test tests/content-packages.test.ts tests/square-learning.test.ts tests/quadratics-learning.test.ts tests/content-stage6b.test.ts tests/view-lens.test.ts
& '.local/node22/node.exe' scripts/content-package-local.mjs --import tsx --test tests/content-packages-local.test.ts
$env:ARENA_UX_BASE_URL='http://127.0.0.1:3109'
& '.local/node22/node.exe' node_modules/@playwright/test/cli.js test --config=playwright.ux.config.ts tests/ux-browser/content-c1.spec.ts
```

Тесты жизненного цикла используют уже созданную C1-базу, временно меняют
состояние только этого пакета и возвращают DRAFT. Не запускать их на рабочем
сервере. Скрипт-обёртка проверяет test/loopback/точное имя C1-базы и удаляет
временные разрешающие флаги Release D/bootstrap из окружения дочернего процесса.

## 6. Сохранность локальных данных

Использована одна новая тестовая база `maths4u_test_bank_c1_1cf6766c2a4d`
на `127.0.0.1:33317`, восстановленная из **существующей локальной** репетиционной
копии Release D. Подключения к рабочему серверу не выполнялись.
Другие тестовые базы не менялись. Второй checkout проекта не создавался.

После всех тестов повторена сверка SHA-256 каждого из **39 757 исходных рядов
в 62 таблицах**: отсутствующих или изменённых рядов — **0**.
Это сравнение содержимого, а не только количества записей.

| Исходные данные | Сохранено без изменений |
|---|---:|
| Пользователи | 13 |
| Классы | 5 |
| Работы | 46 |
| Попытки | 48 |
| Ответы | 46 |
| Review | 14 |
| Презентации | 59 |
| Все прежние Task | 3342 |

Итоговый сырой Task count локальной QA-базы — **3444**:
3342 старых + 94 учебных + 8 синтетических задач теста обновления версии.
Последние восемь архивированы, к учебной главе не относятся и гостю не видны.
Дополнительно есть три синтетических QA-аккаунта и их тестовые события.
Исходные пользователи и их прогресс не изменены.

Итог: UNKNOWN = **0**, прежний Release D ContentRelease = **1**,
ContentRelease пакета roots 1.0.0 = **1**, презентаций **59**.
Частные runtime/fixture/журнал сохранности лежат в игнорируемой
`.local/c1-20261106/`; пароли и строка подключения в git и отчёт не включены.
Проверено свободное место: C: **37.14 GiB**, D: **141.86 GiB**.

## 7. Изменённые файлы

Локально закоммичены **только план и дорожная карта**:

- `47a07c6` — C1–C5, принятие Release D, перенос F1–F5.
- `6a4c002` — включение всех 62 адаптаций и отмена порога.

Файлы этих двух коммитов:

- `docs/CODEX-ARENA-CONTENT-PLAN-20261106.md`
- `docs/CODEX-ARENA-ROADMAP-20261105.md`

Реализация C1 остаётся локальной и **незакоммиченной** до просмотра владельцем.
К дорожной карте добавлен результат C1 и ссылка на этот отчёт.

Модель и механизм:

- `prisma/schema.prisma`
- `prisma/migrations/20261106100000_content_packages/migration.sql`
- `src/lib/content-package-schema.ts`
- `src/lib/content-package-content.ts`
- `src/lib/content-packages.ts`
- `src/components/content-packages.tsx`

Подключение к существующему интерфейсу и движку:

- `src/app/api/[...path]/route.ts`
- `src/components/admin-screen.tsx`
- `src/components/learning-home.tsx`
- `src/components/platform.tsx`
- `src/components/square-lesson.tsx`
- `src/components/square-progress.tsx`
- `src/lib/courses.ts`
- `src/lib/learning-home.ts`
- `src/lib/public-pages.tsx`
- `src/lib/question-support.ts`
- `src/lib/square-content.ts`
- `src/lib/square-learning.ts`
- `src/lib/square-model.ts`
- `src/lib/view-lens.ts`
- `src/lib/works.ts`

Содержание, проверка и документация:

- `content/original/9231-fp1/roots-v1.json`
- `content/original/9231-fp1/roots-quick-verification-v1.json`
- `scripts/content/fp1_roots_teaching.py`
- `scripts/content/prepare-fp1-roots.py`
- `scripts/content/verify-fp1-roots.py`
- `scripts/content-package-local.mjs`
- `scripts/content-package-qa-fixture.ts`
- `tests/content-packages.test.ts`
- `tests/content-packages-local.test.ts`
- `tests/ux-browser/content-c1.spec.ts`
- `docs/CONTENT-PACKAGES.md`
- `docs/ARENA-C1-SOURCE-AUDIT-20261106.json`
- `docs/ARENA-C1-MATH-CHECKS-20261106.json`
- `docs/ARENA-C1-REPORT-20261106.md`
- `.github/workflows/hostinger-preview.yml`
- `.gitignore` — исключение Python __pycache__.

Чужие незакоммиченные документы Release D / Future plan, `output/` и `tmp/`
не изменялись и не добавлялись. `test-results/`, `.local/` и база не добавлены.

## 8. Скриншоты

Первичный частный предпросмотр в браузере оставлен открытым администратору.
Проверены вручную Objective, отображение дробей и корней, компактные критерии
на 390 px. Основные снимки:

- `test-results/c1-20261106/cua-chapter-preview.png` — глава и четыре урока.
- `test-results/c1-20261106/cua-coefficients-390-light.png` — первый экран урока.
- `test-results/c1-20261106/cua-marking-390-light.png` — письменная самооценка.

Полный перечень PNG:

- `test-results/c1-20261106/chapter-admin.png`
- `test-results/c1-20261106/coefficients-1280-dark.png`
- `test-results/c1-20261106/coefficients-1280-light.png`
- `test-results/c1-20261106/coefficients-390-dark.png`
- `test-results/c1-20261106/coefficients-390-light.png`
- `test-results/c1-20261106/cua-chapter-preview.png`
- `test-results/c1-20261106/cua-coefficients-390-light.png`
- `test-results/c1-20261106/cua-marking-390-light.png`
- `test-results/c1-20261106/marking-390-light.png`
- `test-results/c1-20261106/mixed-1280-dark.png`
- `test-results/c1-20261106/mixed-1280-light.png`
- `test-results/c1-20261106/mixed-390-dark.png`
- `test-results/c1-20261106/mixed-390-light.png`
- `test-results/c1-20261106/shared-admin-0-1280-dark.png`
- `test-results/c1-20261106/shared-admin-0-1280-light.png`
- `test-results/c1-20261106/shared-admin-0-390-dark.png`
- `test-results/c1-20261106/shared-admin-0-390-light.png`
- `test-results/c1-20261106/shared-guest-0-1280-dark.png`
- `test-results/c1-20261106/shared-guest-0-1280-light.png`
- `test-results/c1-20261106/shared-guest-0-390-dark.png`
- `test-results/c1-20261106/shared-guest-0-390-light.png`
- `test-results/c1-20261106/shared-guest-1-1280-dark.png`
- `test-results/c1-20261106/shared-guest-1-1280-light.png`
- `test-results/c1-20261106/shared-guest-1-390-dark.png`
- `test-results/c1-20261106/shared-guest-1-390-light.png`
- `test-results/c1-20261106/shared-guest-2-1280-dark.png`
- `test-results/c1-20261106/shared-guest-2-1280-light.png`
- `test-results/c1-20261106/shared-guest-2-390-dark.png`
- `test-results/c1-20261106/shared-guest-2-390-light.png`
- `test-results/c1-20261106/shared-guest-3-1280-dark.png`
- `test-results/c1-20261106/shared-guest-3-1280-light.png`
- `test-results/c1-20261106/shared-guest-3-390-dark.png`
- `test-results/c1-20261106/shared-guest-3-390-light.png`
- `test-results/c1-20261106/shared-student-0-1280-dark.png`
- `test-results/c1-20261106/shared-student-0-1280-light.png`
- `test-results/c1-20261106/shared-student-0-390-dark.png`
- `test-results/c1-20261106/shared-student-0-390-light.png`
- `test-results/c1-20261106/shared-teacher-0-1280-dark.png`
- `test-results/c1-20261106/shared-teacher-0-1280-light.png`
- `test-results/c1-20261106/shared-teacher-0-390-dark.png`
- `test-results/c1-20261106/shared-teacher-0-390-light.png`
- `test-results/c1-20261106/symmetric_sums-1280-dark.png`
- `test-results/c1-20261106/symmetric_sums-1280-light.png`
- `test-results/c1-20261106/symmetric_sums-390-dark.png`
- `test-results/c1-20261106/symmetric_sums-390-light.png`
- `test-results/c1-20261106/transformations-1280-dark.png`
- `test-results/c1-20261106/transformations-1280-light.png`
- `test-results/c1-20261106/transformations-390-dark.png`
- `test-results/c1-20261106/transformations-390-light.png`

Матрицы и контраст:
`test-results/c1-20261106/responsive.json`,
`test-results/c1-20261106/shared-pages.json`,
`test-results/c1-20261106/contrast.json`.

## 9. Предпросмотр, ограничения и вопросы владельцу

**Глава:** http://127.0.0.1:3109/admin/content-packages/9231-fp1-roots

**Первый урок:**
http://127.0.0.1:3109/admin/content-packages/9231-fp1-roots/preview/fp1_roots_coefficients

Сервер запущен на loopback, порт 3109. Во вкладке локальный вход администратора
уже выполнен. Если сервер остановлен, из `D:\www\arena`:

```powershell
& '.local/node22/node.exe' scripts/content-package-local.mjs server.js
```

Перед C2 нужен просмотр владельцем: подходит ли подробность объяснений и
ступенчатость примеров; удобно ли распределение 30 задач в Transformations
или позже нужны дополнительные фильтры внутри этого урока.
Публичная публикация и production-импорт в текущем запуске не выполнялись.
Сначала замечания владельца должны быть внесены в общий шаблон.

Не выполнены C2–C5, Stage 7 и будущие F1–F5. Нет видеоуроков, ИИ-проверки
письменного решения и автоматического присвоения M/A-кодов там, где их нет
в исходных критериях. Это не было частью C1.

**Подтверждение:** без push, deploy, изменения production-базы, реальных
вызовов ИИ, включения рекламы и подключения платежей. Проект maths4u.sbs,
его файлы и база не затронуты. После этого отчёта работа останавливается.

## 10. Публикация по отдельной команде владельца — 6 ноября 2026

По запросу «publish эту главу» выполнено штатное действие Publish chapter
через административный API **только на http://127.0.0.1:3109**.
Пакет `9231-fp1-roots` теперь PUBLISHED; 94 задачи PUBLIC:
62 exam-style и 32 короткие проверки. Повторного импорта нет, ContentRelease
пакета по-прежнему один.

Гостем проверены глава и все четыре урока — HTTP 200. В гостевом каталоге
782 задачи вместо 688. UNKNOWN = 0. Повторная сверка 39 757 исходных рядов
в 62 таблицах: отсутствующих и изменённых рядов нет. Презентаций по-прежнему 59.
Журнал операции: `.local/c1-20261106/owner-publication.json` (не в git).

Публичная локальная ссылка:
http://127.0.0.1:3109/courses/maths4u-9231-fp1?chapter=fp1_roots

Публикация в интернете, push, deploy и изменения рабочей базы не выполнялись.
