# C2: Summation of series — локальный отчёт

Дата: 6 ноября 2026. Проект: `D:\www\arena`.
Выполнена только следующая глава C2: **3 Summation of series**.

## 1. Что сделано

Глава добавлена через механизм пакетов C1 и открыта в локальном каталоге,
как ранее Roots и Rational functions. Пакет `9231-fp1-summation`,
версия `1.0.0`, глава `fp1_summation`, **PUBLISHED только локально**.

- 4 урока: Objective, prerequisites, Key ideas, Method, Common mistakes.
- 16 самостоятельно написанных примеров с полными решениями.
- Все 68 задач владельца с исходными подсказками, ответами, решениями,
  баллами и критериями. Отложено 0.
- 32 короткие проверки: в каждом уроке 6 SHORT и 2 MC, четыре семейства
  по два варианта. Проверяются полные формулы, обе суммы разной чётности,
  рациональные ответы, точные значения и least integer.
- Повторение на свежем варианте и сохранение черновиков используют
  существующий механизм. IndependentCheck отделён от Review.
- Для письменных задач — отдельная самооценка по Marking guidance,
  не автоматическая оценка доказательства. Критерии остаются DRAFT.

Rational перед началом этой главы зафиксирована локальным коммитом
`b3c8466873c971a311701850987e6a7343945293`: ровно 105 файлов из её
списка, включая roadmap. Коммит самой Summation пока не создан.

## 2. Структура по книге и распределение

По уточнению владельца изучена глава 3 книги
`D:\new_books\furhter_cambridge.pdf`: PDF-страницы 57–69,
печатные страницы 45–57. Сначала раздел 3.1 — суммы степеней,
затем 3.2 — сходящиеся ряды через разности.
Каждый раздел разделён на два урока, с расширениями из задач владельца.

Объяснения написаны своими словами; примеры составлены заново.
Тексты, экзаменационные примеры, рисунки и упражнения учебника
в пакет не переносились. Заголовки уроков сформулированы самостоятельно.

| Урок | Порядок в книге | Примеры | SHORT / MC | Задачи владельца |
|---|---|---:|---:|---:|
| Deriving power-sum formulae | 3.1: обозначения и вывод формул | 4 | 6 / 2 | 6 |
| Using power sums and finite limits | 3.1: применение | 4 | 6 / 2 | 14 |
| Telescoping sums from differences | 3.2: разложение и сокращение | 4 | 6 / 2 | 27 |
| Convergence, remainders and bounds | 3.2: пределы; расширения владельца | 4 | 6 / 2 | 21 |
| Всего | | 16 | 24 / 8 | 68 |

Урок 1: вывод стандартных сумм, проверка индукцией, старшие степени.
Урок 2: движущиеся пределы, веса, чётность, восстановление членов,
применение сумм корней. Урок 3: несколько surviving boundaries,
частичные дроби, параметры, радикалы и факториалы.
Урок 4: геометрические веса, исключительные концы области,
остатки, строгие оценки и тригонометрические примеры расходимости.
Везде не меньше шести письменных задач.

## 3. Источник и сопоставление

Только чтение:
`E:\my folder\questions_data\original\Pure1 9231\03_Summation_of_series_9231_revised.json`.

SHA-256 до и после:
`3c3b8f9244b2e9fb4b45694456d92fcb777e715bdfb84754a7036c29e3dfba05`.

Полная таблица 68 строк:
[ARENA-C2-SERIES-SOURCE-AUDIT-20261106.json](ARENA-C2-SERIES-SOURCE-AUDIT-20261106.json),
массив `rows` с колонками `id / uid / original_id / original_uid /
archiveTaskId / archiveVersionId / lesson / marks / contentSha256`.
Для каждой адаптации найден ровно один старый архивный Task.

| Пример ID | Новый content_uid | Урок |
|---|---|---|
| 4107 | m4u_9231_fp1_ss_4107_v1 | differences |
| 4124 | m4u_9231_fp1_ss_4124_v1 | finite-sums |
| 5858 | m4u_9231_fp1_ss_5858_v1 | convergence |
| 6472 | m4u_9231_fp1_ss_6472_v1 | power-sums |

Новые задачи имеют отдельные Task/TaskVersion и ручной ORIGINAL.
Старые архивные версии не заменены. Provenance хранится на сервере
и в административных данных; в гостевых и учительских проекциях
нет original_uid, original_exam или ожидаемых ответов проверяющего механизма.
Порог сходства не используется.

Рисунков в учебном содержании этих задач нет. 11 preserved_assets относятся
к исходному архиву и не импортировались.
5858 взята как предоставленная владельцем задача на 14 баллов;
старый архивный EITHER/OR на 28 баллов сохранён отдельно.
Ключи, критерии и баллы владельца не исправлялись.

## 4. Математика и редакторская проверка

```powershell
python scripts/content/verify-fp1-series.py --owner 'E:\my folder\questions_data\original\Pure1 9231\03_Summation_of_series_9231_revised.json' --report docs/ARENA-C2-SERIES-MATH-CHECKS-20261106.json
```

Журнал:
[ARENA-C2-SERIES-MATH-CHECKS-20261106.json](ARENA-C2-SERIES-MATH-CHECKS-20261106.json).

**622 записи: 616 PASS, 6 REVIEWED, ошибок 0.**
PASS включает математические сертификаты, связи с исходным содержанием,
сохранение баллов и хешей. Это не «622 разные задачи».
REVIEWED отдельно обозначает аналитические рассуждения о сходимости,
чётности показателей и исключительных концах области.
Отдельно выполнен вариант для CI без доступа к E: — 553 записи,
ошибок 0; разница 69 — проверки SHA и прямого совпадения с файлом владельца.

- Для 87 частей проверены явные или именованные суммы: база и разность
  соседних итогов; движущиеся границы через символическую первообразную
  разности; бесконечные суммы через предел проверенной конечной формы.
- В пяти задачах с корнями использованы тождества Ньютона.
  Для параметров проверены все допустимые положительные решения.
- Проверены восстановление членов, оба результата разной чётности,
  отношения и произведения сумм, движущиеся блоки и строгие оценки.
- Для least integer проверены результат, предыдущий индекс и убывание
  остатка: 13, 8, 1000, 9999, 498; для радикальной задачи — 38.
- Все 16 новых примеров и 32 полных ключа практики покрыты кодом.
- Два выражения `\lim` из 5852 не разбираются общим LaTeX-парсером:
  обе формулы чётности и оба предела проверены отдельными сертификатами.
  Это ограничение парсера с записанным разрешением, не пропущенная задача.
- Проверены KaTeX, суммы баллов, полные/неполные/неверные ответы,
  эквивалентные дроби и отсутствие исходных экзаменационных заголовков.

**Ошибок, требующих согласования исправления задач владельца, не найдено.**
Письменные доказательства требуют преподавательского суждения:
проверка итогового ответа не оценивает полноту объяснения.
Критерии Maths4U не являются официальной экзаменационной схемой.

## 5. Тесты, внешний вид и роли

- Unit: **9/9** — Roots, Rational и Series. Старые манифесты и fingerprints
  не менялись. Проверены новые полные ключи и свежие варианты.
- `tests/content-series-local.test.ts`: **1/1** — dry-run без записи,
  отклонение неверного token, повтор без новых версий/файлов,
  обратимые publish/archive/restore. Прежние два пакета не изменились.
- Три сценария Playwright прошли. Первый запуск гостевого теста искал
  Select, но исходные критерии по одному баллу используют checkbox.
  Исправлен только тест; повтор гостевого сценария прошёл.
  Исправлено и имя вида критериев в тесте: guidance.
- 32 сочетания новых уроков, четырёх ширин и двух тем;
  56 сочетаний общих страниц и кабинетов. Ширины 360, 390, 768, 1280.
  Нет горизонтального переполнения страницы и ошибок JavaScript.
- Длинные формулы на узких экранах прокручиваются внутри математического
  блока; страницу они не расширяют. Масштаб не уменьшался до нечитаемого.
- Гостевой сценарий: неверная формула отклонена, эквивалентная полная
  принята, черновик восстановлен, новый вариант пустой, обе формулы
  чётности и рациональный ответ принимаются; самооценка сохранена.
- У всех 68 письменных задач открываются Hint / Worked solution /
  Marking guidance, без katex-error и административного provenance.
- До публикации уроки гостю/учителю 404, API пакетов учителю 403.
  После локальной публикации все четыре урока 200 гостю, ученику,
  учителю и администратору.
- Контраст: 12 пар текст/фон в двух темах, минимум **5.60:1**.
- TypeScript и сборка Node 22 / Webpack прошли.
  Артефакт: 23 746 файлов, без dotenv, фикстур и обнаруженных секретов.
- Обычный `npm run lint` показывает **30 прежних ошибок в owner tmp/pdf
  scripts**. Эти файлы не менялись. ESLint кода с исключением `tmp/**`
  и `output/**` прошёл. Конфигурация lint не менялась.
- `git diff --check` пройден.

Частные логи: `.local/c2-series-20261106/` — unit.log, lifecycle.log,
math-final.log, typecheck-final.log, lint.log, lint-code.log, build.log,
browser.log, browser-guest-rerun.log, final-view.json.
Пароли и настройки не выводились и в git не добавлялись.

## 6. Сохранность

Сверены **42 014 прежних строк в 63 таблицах**: все исходные хеши
сохранились, изменённых или пропавших строк **0**.
LearningProgress дополнительно сверён по составному ключу
userId/lessonId: изменений прежних полей **0**.

| Показатель | До → после |
|---|---:|
| Task | 3537 → 3637 (+100) |
| TaskVersion | 3581 → 3681 (+100) |
| StoredFile | 3140 → 3140 |
| Презентации | 59 → 59 |
| UNKNOWN | 0 → 0 |
| Гостевой каталог | 875 → 975 |
| Маркер Summation 1.0.0 | 0 → 1 |
| Roots / Rational / Summation | PUBLISHED / PUBLISHED / PUBLISHED |
| Health | 200 |

Последний повтор после публикации: create **0**, update **0**,
skip **100**, новых записей **0**. Пользователи, классы, задания,
ответы, попытки, Review, IndependentCheck и презентации сохранены.
Журналы: lifecycle.json, publication.json, repeat.json, preservation.json.
Папка E: и другие тестовые базы не изменялись.
Свободно после сборки: C: **36.20 GiB**, D: **141.74 GiB**.

## 7. Изменённые файлы

Точный список для будущего отдельного коммита:
[ARENA-C2-SERIES-FILES-20261106.json](ARENA-C2-SERIES-FILES-20261106.json).
18 файлов, включая отчёт и roadmap. Без `output/`, `tmp/`,
`test-results/`, `.local/` и сторонних документов.
Существовавшие owner-файлы сохранены.

## 8. Предпросмотр и ограничения

**Глава:**
http://127.0.0.1:3109/courses/maths4u-9231-fp1?chapter=fp1_summation

**Первый урок:**
http://127.0.0.1:3109/courses/maths4u-9231-fp1/topics/fp1_series_power_sums

**Управление пакетом:**
http://127.0.0.1:3109/admin/content-packages/9231-fp1-summation

Сервер оставлен работающим на 3109 с прежней локальной базой.
Повторный запуск:

```powershell
& '.local/node22/node.exe' scripts/content-package-local.mjs server.js
```

Вопросов, блокирующих просмотр, нет. Владельцу остаётся оценить ясность
и темп уроков. Следующая глава Matrices 1 и остальные главы C2/C3–C5
в этой работе не начинались. AI-проверка доказательств, видео,
реклама и платежи не подключались.

**Без push, deploy и изменений production. Файлы и база maths4u.sbs
не затронуты. Всё в фоне, на локальной тестовой базе Arena.**

## 9. Скриншоты

Проверены мобильный первый экран, примеры, решение, светлая и тёмная темы.
`examples-*.png` — снимки полного элемента: закреплённая шапка может
попасть внутрь длинного снимка. `published-lesson-*.png` — фактический
первый экран. Матрицы: responsive.json, shared-pages.json, guest-flow.json,
contrast.json в `test-results/c2-series-20261106/`.

- `test-results/c2-series-20261106/chapter-preview.png`
- `test-results/c2-series-20261106/convergence-1280-dark.png`
- `test-results/c2-series-20261106/convergence-1280-light.png`
- `test-results/c2-series-20261106/convergence-390-dark.png`
- `test-results/c2-series-20261106/convergence-390-light.png`
- `test-results/c2-series-20261106/differences-1280-dark.png`
- `test-results/c2-series-20261106/differences-1280-light.png`
- `test-results/c2-series-20261106/differences-390-dark.png`
- `test-results/c2-series-20261106/differences-390-light.png`
- `test-results/c2-series-20261106/examples-1280-dark.png`
- `test-results/c2-series-20261106/examples-1280-light.png`
- `test-results/c2-series-20261106/examples-390-dark.png`
- `test-results/c2-series-20261106/examples-390-light.png`
- `test-results/c2-series-20261106/finite_sums-1280-dark.png`
- `test-results/c2-series-20261106/finite_sums-1280-light.png`
- `test-results/c2-series-20261106/finite_sums-390-dark.png`
- `test-results/c2-series-20261106/finite_sums-390-light.png`
- `test-results/c2-series-20261106/mobile-first-screen.png`
- `test-results/c2-series-20261106/power_sums-1280-dark.png`
- `test-results/c2-series-20261106/power_sums-1280-light.png`
- `test-results/c2-series-20261106/power_sums-390-dark.png`
- `test-results/c2-series-20261106/power_sums-390-light.png`
- `test-results/c2-series-20261106/published-chapter-1280-dark.png`
- `test-results/c2-series-20261106/published-chapter-1280-light.png`
- `test-results/c2-series-20261106/published-chapter-390-dark.png`
- `test-results/c2-series-20261106/published-chapter-390-light.png`
- `test-results/c2-series-20261106/published-lesson-1280-dark.png`
- `test-results/c2-series-20261106/published-lesson-1280-light.png`
- `test-results/c2-series-20261106/published-lesson-390-dark.png`
- `test-results/c2-series-20261106/published-lesson-390-light.png`
- `test-results/c2-series-20261106/shared-admin-0-1280-dark.png`
- `test-results/c2-series-20261106/shared-admin-0-1280-light.png`
- `test-results/c2-series-20261106/shared-admin-0-390-dark.png`
- `test-results/c2-series-20261106/shared-admin-0-390-light.png`
- `test-results/c2-series-20261106/shared-guest-0-1280-dark.png`
- `test-results/c2-series-20261106/shared-guest-0-1280-light.png`
- `test-results/c2-series-20261106/shared-guest-0-390-dark.png`
- `test-results/c2-series-20261106/shared-guest-0-390-light.png`
- `test-results/c2-series-20261106/shared-guest-1-1280-dark.png`
- `test-results/c2-series-20261106/shared-guest-1-1280-light.png`
- `test-results/c2-series-20261106/shared-guest-1-390-dark.png`
- `test-results/c2-series-20261106/shared-guest-1-390-light.png`
- `test-results/c2-series-20261106/shared-guest-2-1280-dark.png`
- `test-results/c2-series-20261106/shared-guest-2-1280-light.png`
- `test-results/c2-series-20261106/shared-guest-2-390-dark.png`
- `test-results/c2-series-20261106/shared-guest-2-390-light.png`
- `test-results/c2-series-20261106/shared-guest-3-1280-dark.png`
- `test-results/c2-series-20261106/shared-guest-3-1280-light.png`
- `test-results/c2-series-20261106/shared-guest-3-390-dark.png`
- `test-results/c2-series-20261106/shared-guest-3-390-light.png`
- `test-results/c2-series-20261106/shared-student-0-1280-dark.png`
- `test-results/c2-series-20261106/shared-student-0-1280-light.png`
- `test-results/c2-series-20261106/shared-student-0-390-dark.png`
- `test-results/c2-series-20261106/shared-student-0-390-light.png`
- `test-results/c2-series-20261106/shared-teacher-0-1280-dark.png`
- `test-results/c2-series-20261106/shared-teacher-0-1280-light.png`
- `test-results/c2-series-20261106/shared-teacher-0-390-dark.png`
- `test-results/c2-series-20261106/shared-teacher-0-390-light.png`
- `test-results/c2-series-20261106/solution-1280-dark.png`
- `test-results/c2-series-20261106/solution-1280-light.png`
- `test-results/c2-series-20261106/solution-390-dark.png`
- `test-results/c2-series-20261106/solution-390-light.png`
