# C2: Matrices 1 — локальный отчёт

Дата: 6 ноября 2026. Канонический проект `D:\www\arena`.
Выполнена только глава 4 Matrices 1.

## 1. Что сделано

Пакет `9231-fp1-matrices1` версии `1.0.0` добавлен существующим
механизмом C1. Глава `fp1_matrices1` открыта для локального просмотра,
как предыдущие главы. Состояние **PUBLISHED только в тестовой базе**.

- Пять уроков с Objective, Before you start, Key ideas, Method и Common mistakes.
- 20 самостоятельно составленных разобранных примеров.
- Все 60 задач владельца с исходными ответами, подсказками, решениями,
  баллами и критериями. Отложено 0.
- 40 коротких проверок: по 6 SHORT и 2 MC на урок, четыре семейства
  с двумя вариантами. Проверяются все элементы матрицы, полный набор
  параметров, полное уравнение прямой, три координаты и множитель объёма.
- Гостевые черновики, новые варианты и повторение работают существующим
  механизмом. IndependentCheck, самооценка и Review остаются отдельными.
- Письменные задачи имеют таблицы Marking guidance со статусом DRAFT.
  Их доказательства не выдаются за автоматически проверенные.

До начала главы Summation зафиксирована отдельным локальным коммитом
`9bc3c7302dc68b6df6244db43d4da1c9486fb67f`: ровно 18 файлов её списка,
включая roadmap. Новая Matrices оставлена незакоммиченной для просмотра.

## 2. Книга, структура и распределение

Изучена глава 4 книги владельца `D:\new_books\furhter_cambridge.pdf`:
PDF-страницы 70–103, печатные 58–91. Сохранён математический порядок:
операции → обратные матрицы → определители → преобразования.
Раздел 4.4 разделён на два урока.

Объяснения написаны своими словами, примеры составлены заново.
Тексты, рисунки, упражнения и экзаменационные примеры книги не переносились.
Названия уроков самостоятельные. В частности, явно различаются неподвижная
точка и прямая, инвариантная как множество; учитываются вертикальные
направления и прямые, не проходящие через начало координат.

| Урок | Раздел книги | Примеры | SHORT / MC | Задачи владельца |
|---|---|---:|---:|---:|
| Working with matrix products | 4.1 | 4 | 6 / 2 | 12 |
| Undoing matrix equations | 4.2 | 4 | 6 / 2 | 12 |
| Determinants, restrictions and scale | 4.3 | 4 | 6 / 2 | 10 |
| Building plane transformations | начало 4.4 | 4 | 6 / 2 | 10 |
| Invariant sets and maps in space | продолжение 4.4 | 4 | 6 / 2 | 16 |
| Всего | | 20 | 30 / 10 | 60 |

Во всех уроках не менее шести письменных задач. Контейнеры исходного
JSON не скопированы как уроки: шесть смешанных задач распределены по навыкам.
Для 3D указана конвенция положительного вращения; разобраны оси,
отражения в координатных плоскостях, неподвижные множества и объём.
В предоставленном письменном банке нет отдельных 3D-задач; этот материал
покрыт конспектом, примером и короткой практикой. Новые письменные 3D-задачи
от имени владельца не придумывались.

## 3. Источник и происхождение

Файл только читался:
`E:\my folder\questions_data\original\Pure1 9231\04_Matrices_1_9231_revised.json`.

SHA-256 до и после:
`fbc03c6c4048c442bbf28c47ed4473c0f31edda5f69e67f2c480c6a533129ec6`.

Полная таблица всех 60 строк:
[ARENA-C2-MATRICES-SOURCE-AUDIT-20261106.json](ARENA-C2-MATRICES-SOURCE-AUDIT-20261106.json),
массив `rows`: ID владельца, новый UID, тип происхождения, архивный Task
и TaskVersion при наличии, урок, баллы и хеш содержания.

| Тип | Количество | Связь с прежним банком |
|---|---:|---|
| OWNER_ADAPTATION | 20 | Для каждой найден ровно один архивный Task |
| OWNER_NEW | 40 | Экзаменационного источника нет; связь не выдумывается |

Из 20 связанных задач исходный файл обозначает шесть как adapted_skill_variant
и 14 как syllabus_aligned_replacement. Все 60 создаются отдельными Task
с собственными content_uid, ручным ORIGINAL и неизменяемыми версиями.
Старые архивные задачи не заменялись. Порог сходства не используется.

Примеры сопоставления:

| ID владельца | Новый content_uid | Тип |
|---|---|---|
| 5891 | maths4u_9231_fp1_ch04_002_v1 | OWNER_ADAPTATION |
| 4171 | maths4u_9231_fp1_ch04_004_v1 | OWNER_ADAPTATION |
| m4u_9231_fp1_ch04_new_001 | maths4u_9231_fp1_ch04_021_v1 | OWNER_NEW |

Административное происхождение и исходные экзаменационные реквизиты
не попадают в гостевые или учительские проекции. Ожидаемые значения
проверяющего механизма остаются на сервере.
Учебные тексты, ключи, критерии и баллы владельца не редактировались.
Рисунков не требуется; старые файлы изображений не менялись.

## 4. Математика и редакторская проверка

```powershell
python scripts/content/verify-fp1-matrices.py --owner 'E:\my folder\questions_data\original\Pure1 9231\04_Matrices_1_9231_revised.json' --report docs/ARENA-C2-MATRICES-MATH-CHECKS-20261106.json
```

Журнал:
[ARENA-C2-MATRICES-MATH-CHECKS-20261106.json](ARENA-C2-MATRICES-MATH-CHECKS-20261106.json).

**670 записей: 666 PASS, 4 REVIEWED, ошибок 0.**
Сюда входят математические проверки, связи с исходными данными и сверка
баллов; это не 670 разных задач. Без доступа к E: CI-вариант выполняет
609 записей, также без ошибок. Разница 61 — исходный SHA и прямое
сопоставление 60 задач с файлом владельца.

- У всех 60 задач проверены конкретные матричные/алгебраические утверждения:
  произведения, обе стороны обратной матрицы, исходные уравнения с неизвестной
  матрицей, определители, ограничения и полные наборы параметров.
- Проверены прямоугольные произведения, несовпадение размеров и отсутствие
  обратимости при одностороннем тождестве.
- Для геометрических задач проверены порядок преобразований, образы и
  прообразы, уравнения прямых, площадь, неподвижные подпространства,
  инвариантные направления, повторные корни и исключительные параметры.
- Для инвариантных прямых используются коллинеарность и отдельная проверка
  вертикального направления; неподвижность проверяется через M−I.
- Четыре REVIEWED отдельно фиксируют полноту аналитических рассуждений
  об угловых условиях, классификации двух сдвигов и порядке обратных факторов.
  Эти записи не выдаются за машинное доказательство естественного языка.
- Все 20 новых примеров и 40 полных ключей практики покрыты кодом.
- Условия, решения, подсказки и критерии всех задач проверены на katex-error;
  дроби, корни, матрицы и степени выводятся KaTeX.

**Ошибок в задачах владельца, требующих согласования исправления, не найдено.**
Во время подготовки исправлено только распознавание TeX-пробела в аудиторском
парсере списка корней 5830; сами ключи не менялись.
Открытые доказательства и качество объяснения требуют преподавательского
суждения. Критерии Maths4U не являются официальной экзаменационной схемой.

## 5. Тесты, внешний вид и роли

- Unit: **12/12** — Roots, Rational, Summation и Matrices.
  Новая проверка отвергает пропущенный элемент матрицы и неполный набор
  корней, принимает точные эквивалентные числа и уравнения прямых.
- Локальная интеграция: **1/1**. Dry-run не записывает данные, неверный token
  отклоняется, повтор не создаёт версий/файлов, publish/archive/restore обратимы.
  Состояния трёх прежних пакетов не изменены.
- Playwright: **3/3**. 40 сочетаний пяти уроков, четырёх ширин и двух тем;
  56 сочетаний общих страниц и кабинетов. Ширины 360, 390, 768 и 1280.
  Переполнения страницы, обрезанных кнопок и ошибок JavaScript не обнаружено.
- Проверен гостевой ввод полной матрицы; ошибка одного элемента;
  полный набор четырёх корней; эквивалентное уравнение; все три координаты;
  сохранение черновика, свежий вариант и самооценка после перезагрузки.
- У всех 60 письменных задач открываются Hint / Worked solution /
  Marking guidance без ошибок KaTeX и административного происхождения.
- До публикации гостю/учителю уроки 404, административный API учителю 403.
  После локальной публикации все пять уроков доступны гостю, ученику,
  учителю и администратору с HTTP 200.
- Контраст: 12 пар текст/фон в двух темах, минимум **5.60:1**.
- TypeScript, ESLint кода с исключением прежних owner-папок tmp/output
  и Node 22 / Webpack build прошли. Конфигурация lint не менялась.
- Артефакт: 23 749 файлов, без dotenv, тестовых фикстур и найденных секретов.
  Это локальная сборка, не выполненный deploy.
- git diff --check пройден.

Длинные формулы и матричные произведения на узких экранах могут прокручиваться
внутри математического блока; страницу они не расширяют.
В новых объяснениях длинные пары матриц разбиты на отдельные строки.
Визуально просмотрены мобильный первый экран, открытые примеры и тёмная
версия на компьютере.

Журналы (не для git): `.local/c2-matrices-20261106/`:
unit.log, lifecycle.log, math-final.log, math-ci.log, typecheck.log,
lint.log, build.log, browser.log, final-view.json, publication.json,
repeat.json, preservation.json. Секреты не выводились.

## 6. Сохранность данных

Сверены **42 945 прежних строк в 63 таблицах**:
все исходные хеши сохранились, изменённых/пропавших строк **0**.
LearningProgress отдельно сверён по userId/lessonId:
изменений прежних полей **0**.

| Показатель | До → после |
|---|---:|
| Task | 3637 → 3737 (+100) |
| TaskVersion | 3681 → 3781 (+100) |
| StoredFile | 3140 → 3140 |
| Презентации | 59 → 59 |
| UNKNOWN | 0 → 0 |
| Гостевой каталог | 975 → 1075 |
| Маркер Matrices 1.0.0 | 0 → 1 |
| Roots / Rational / Summation / Matrices | PUBLISHED локально |
| Health | 200 |

Повтор уже опубликованного пакета: создать **0**, обновить **0**,
пропустить **100**, записей **0**.
Существующие пользователи, классы, задания, ответы, версии, попытки,
IndependentCheck, Review, прогресс и презентации сохранены.
Другие тестовые базы и исходная папка владельца не менялись.
Свободно после сборки: C: **36.19 GiB**, D: **141.70 GiB**.

## 7. Изменённые файлы

Точный список для будущего отдельного коммита:
[ARENA-C2-MATRICES-FILES-20261106.json](ARENA-C2-MATRICES-FILES-20261106.json).
17 файлов, включая отчёт и roadmap. Без output/, tmp/, test-results/,
.local/ и сторонних документов. Существовавшие owner-файлы сохранены.

## 8. Предпросмотр и оставшиеся действия

**Глава:**
http://127.0.0.1:3109/courses/maths4u-9231-fp1?chapter=fp1_matrices1

**Первый урок:**
http://127.0.0.1:3109/courses/maths4u-9231-fp1/topics/fp1_matrices_operations

**Управление пакетом:**
http://127.0.0.1:3109/admin/content-packages/9231-fp1-matrices1

Сервер оставлен работающим на порту 3109 с прежней локальной базой.
При необходимости:

```powershell
& '.local/node22/node.exe' scripts/content-package-local.mjs server.js
```

Блокирующих вопросов нет; владельцу остаётся оценить темп и ясность уроков.
Следующая глава по плану — Polar coordinates. Она, Vectors и последующие
этапы в этой работе не начинались. Новые видеоматериалы, реклама, платежи
и реальная AI-проверка не подключались.

**Без push, deploy и изменений production. Файлы и база maths4u.sbs
не затронуты. Всё выполнялось в фоне, на локальной тестовой базе Arena.**

## 9. Скриншоты

Каталог `test-results/c2-matrices-20261106/`. Матрицы проверок:
responsive.json, shared-pages.json, guest-flow.json, contrast.json.
Ниже перечислены все 66 PNG текущей проверки.

- `test-results/c2-matrices-20261106/chapter-preview.png`
- `test-results/c2-matrices-20261106/determinants-1280-dark.png`
- `test-results/c2-matrices-20261106/determinants-1280-light.png`
- `test-results/c2-matrices-20261106/determinants-390-dark.png`
- `test-results/c2-matrices-20261106/determinants-390-light.png`
- `test-results/c2-matrices-20261106/examples-1280-dark.png`
- `test-results/c2-matrices-20261106/examples-1280-light.png`
- `test-results/c2-matrices-20261106/examples-390-dark.png`
- `test-results/c2-matrices-20261106/examples-390-light.png`
- `test-results/c2-matrices-20261106/invariants-1280-dark.png`
- `test-results/c2-matrices-20261106/invariants-1280-light.png`
- `test-results/c2-matrices-20261106/invariants-390-dark.png`
- `test-results/c2-matrices-20261106/invariants-390-light.png`
- `test-results/c2-matrices-20261106/inverses-1280-dark.png`
- `test-results/c2-matrices-20261106/inverses-1280-light.png`
- `test-results/c2-matrices-20261106/inverses-390-dark.png`
- `test-results/c2-matrices-20261106/inverses-390-light.png`
- `test-results/c2-matrices-20261106/mobile-first-screen.png`
- `test-results/c2-matrices-20261106/operations-1280-dark.png`
- `test-results/c2-matrices-20261106/operations-1280-light.png`
- `test-results/c2-matrices-20261106/operations-390-dark.png`
- `test-results/c2-matrices-20261106/operations-390-light.png`
- `test-results/c2-matrices-20261106/plane_maps-1280-dark.png`
- `test-results/c2-matrices-20261106/plane_maps-1280-light.png`
- `test-results/c2-matrices-20261106/plane_maps-390-dark.png`
- `test-results/c2-matrices-20261106/plane_maps-390-light.png`
- `test-results/c2-matrices-20261106/published-chapter-1280-dark.png`
- `test-results/c2-matrices-20261106/published-chapter-1280-light.png`
- `test-results/c2-matrices-20261106/published-chapter-390-dark.png`
- `test-results/c2-matrices-20261106/published-chapter-390-light.png`
- `test-results/c2-matrices-20261106/published-lesson-1280-dark.png`
- `test-results/c2-matrices-20261106/published-lesson-1280-light.png`
- `test-results/c2-matrices-20261106/published-lesson-390-dark.png`
- `test-results/c2-matrices-20261106/published-lesson-390-light.png`
- `test-results/c2-matrices-20261106/shared-admin-0-1280-dark.png`
- `test-results/c2-matrices-20261106/shared-admin-0-1280-light.png`
- `test-results/c2-matrices-20261106/shared-admin-0-390-dark.png`
- `test-results/c2-matrices-20261106/shared-admin-0-390-light.png`
- `test-results/c2-matrices-20261106/shared-guest-0-1280-dark.png`
- `test-results/c2-matrices-20261106/shared-guest-0-1280-light.png`
- `test-results/c2-matrices-20261106/shared-guest-0-390-dark.png`
- `test-results/c2-matrices-20261106/shared-guest-0-390-light.png`
- `test-results/c2-matrices-20261106/shared-guest-1-1280-dark.png`
- `test-results/c2-matrices-20261106/shared-guest-1-1280-light.png`
- `test-results/c2-matrices-20261106/shared-guest-1-390-dark.png`
- `test-results/c2-matrices-20261106/shared-guest-1-390-light.png`
- `test-results/c2-matrices-20261106/shared-guest-2-1280-dark.png`
- `test-results/c2-matrices-20261106/shared-guest-2-1280-light.png`
- `test-results/c2-matrices-20261106/shared-guest-2-390-dark.png`
- `test-results/c2-matrices-20261106/shared-guest-2-390-light.png`
- `test-results/c2-matrices-20261106/shared-guest-3-1280-dark.png`
- `test-results/c2-matrices-20261106/shared-guest-3-1280-light.png`
- `test-results/c2-matrices-20261106/shared-guest-3-390-dark.png`
- `test-results/c2-matrices-20261106/shared-guest-3-390-light.png`
- `test-results/c2-matrices-20261106/shared-student-0-1280-dark.png`
- `test-results/c2-matrices-20261106/shared-student-0-1280-light.png`
- `test-results/c2-matrices-20261106/shared-student-0-390-dark.png`
- `test-results/c2-matrices-20261106/shared-student-0-390-light.png`
- `test-results/c2-matrices-20261106/shared-teacher-0-1280-dark.png`
- `test-results/c2-matrices-20261106/shared-teacher-0-1280-light.png`
- `test-results/c2-matrices-20261106/shared-teacher-0-390-dark.png`
- `test-results/c2-matrices-20261106/shared-teacher-0-390-light.png`
- `test-results/c2-matrices-20261106/solution-1280-dark.png`
- `test-results/c2-matrices-20261106/solution-1280-light.png`
- `test-results/c2-matrices-20261106/solution-390-dark.png`
- `test-results/c2-matrices-20261106/solution-390-light.png`
