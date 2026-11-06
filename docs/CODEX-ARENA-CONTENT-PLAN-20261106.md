# Arena: наполнение курсов (этапы C1–C5)

Дата: 6 ноября 2026. Решение владельца: сначала наполняем содержанием все курсы, Stage 7 (проверка ИИ) — после. Индексация и реклама пока не в приоритете: сайт позже переедет на maths4u.sbs.

Постоянные правила roadmap и AGENTS.md действуют: без push и deploy без разрешения владельца; maths4u.sbs не трогать; Cambridge-архив виден только администратору; секреты не попадают в git; `output/` и `tmp/` не коммитить.

## 1. Что есть сейчас (проверено 6 ноября на живом сайте и в папках)

| Курс | Уроки с конспектом и примерами | Exam-style | Short / MC |
|---|---|---|---|
| 9709 Pure 1 — Quadratics | 5 | ≈162 | ≈33 / ≈9 |
| 9709 Pure 1 — остальные 9 глав | по 5 | по 10 на главу (2 на урок) | ≈35 / ≈6 на главу |
| Book 2 (олимпиада) | 2 темы | 20 | — |
| 9231 FP1 | нет | на сайте 0; у владельца готово 390 адаптаций | нет |
| 0606, 9231 FP2, Further Mechanics, Further Probability & Statistics | нет | только архив Cambridge (админ) | нет |

Конспекты 9709 Pure 1 в исходных пакетах помечены `teacher_review: pending`.

### Адаптации владельца 9231 FP1

Папка: `E:\my folder\questions_data\original\Pure1 9231\`

| Файл | Глава | Задач | Схема | Рисунки |
|---|---|---|---|---|
| 01_Roots_of_polynomial_equations_9231_revised.json | 1 Roots of polynomial equations | 62 | своя: нет `content_uid`, есть `exam`, difficulty словами, `mark_scheme.parts` | нет |
| 02_Rational_functions_9231_revised.json | 2 Rational functions | 53 | maths4u-9231-practice-v1 | 92 ссылки `images/…`, файлов нет |
| 03_Summation_of_series_9231_revised.json | 3 Summation of series | 68 | maths4u-9231-practice-v1 | нет |
| 04_Matrices_1_9231_revised.json | 4 Matrices 1 | 60 | maths4u.revised.practice.v1 | нет |
| 05_Polar_coordinates_9231_revised.json | 5 Polar coordinates | 63 | maths4u.revised-bank.v1 | 64 ссылки, файлов нет (по import_notes — solution-only) |
| 06_Vectors_9231_revised.json | 6 Vectors | 84 | без schema_version | 8 ссылок, файлов нет |

Учесть:
- Группировка `lessons` в файлах унаследована от структуры учебника: Vectors «Planes» — 77 задач, «The vector product rule» — 1; пустые «Quadratics» в гл. 1 и «End-of-chapter review exercise» в гл. 3 и 5. Для уроков на сайте использовать поля `topic` / `syllabus_tags`, а не эти контейнеры.
- `provenance` содержит исходную кембриджскую задачу (original_id, original_uid, original_exam). Это служебная связь — только для администратора.
- Рисунки есть только встроенными (data:image) в `9231_Chapter_0N_Teacher_Review.html`; отдельных файлов нет. Сначала использовать папку `images/` владельца; извлекать из HTML, только если её нет, со сверкой имени файла и задачи.
- Главы 7 Proof by induction нет.
- Конспектов, разобранных примеров и быстрых проверок нет ни для одной главы.

## 2. Правила содержания для всех этапов C

1. **Только своё.** Не пересказывать и не копировать задачи, примеры, тексты, mark schemes и учебники Cambridge (включая coursebook). Названия уроков — по разделам syllabus, своими словами; заголовки учебника («End-of-chapter review exercise…», «The vector product rule» и т. п.) не использовать.
2. **Адаптация — новая задача.** Каждая адаптация владельца — новый Task с origin ORIGINAL и собственным идентификатором (`content_uid`; для гл. 1 — сгенерировать стабильный). Кембриджскую задачу не менять и не делать её новой версией: она остаётся в архиве для F1. Связь с источником хранить только в поле, видимом администратору. Ученику и учителю не показывать год, сессию, paper, номер вопроса, поле `exam`.
3. **Проверка сходства.** Каждую адаптацию сравнить с исходной кембриджской задачей из архива (по original_id / original_uid). Сходство > 0.5 — не публиковать, вынести в отчёт владельцу. Таблица сходства — в отчёте.
4. **Язык и оформление.** Британский английский, формулы KaTeX `\( \)` и `\[ \]`. Нигде на сайте: упоминаний ИИ, «Maths4U Original», «teacher review pending», внутренних статусов и служебных заметок.
5. **Состав урока** (как в 9709 Pure 1, расширенно):
   - Objective — одна фраза.
   - Before you start — что нужно знать, со ссылками на уроки-предпосылки.
   - Key ideas — определения и результаты (формулы выделены), короткое обоснование или вывод там, где его требует syllabus.
   - Method — шаги решения типовой задачи.
   - Worked examples — 3–4, от базового к экзаменационному уровню, с полными решениями.
   - Common mistakes — 3–5.
   - Quick checks — 6–10 автопроверяемых задач урока (SHORT / MC, режимы Short answer и Multiple choice) с ответом и объяснением в одну-две фразы.
   - Practice — exam-style задачи этого урока.
6. **Математика проверяется кодом.** Каждый ответ в примерах и quick checks проверить скриптом (sympy или численно); журнал проверок — в отчёт. Ошибки, найденные в задачах владельца, не исправлять молча: список в отчёт, исправление — после согласия владельца.
7. **Marking guidance** — формат Stage 4b (таблица; отдельные кнопки Hint / Worked solution / Marking guidance; легенда кодов за ⓘ), статус DRAFT. Разные формы `mark_scheme` привести к одной.
8. **Сложность** — единая шкала 1–5 (гл. 1: standard → 3, advanced → 4, challenge → 5).
9. **Рисунки** — только файлы владельца; рисунки, помеченные как solution-only, в условии не показывать.
10. **Публикация через повторно используемые пакеты содержания**, а не отдельный релиз с флагами для каждой главы:
    - пакет — файл с версией в `content/original/<course>/…`; схема проверяется в CI;
    - применение только добавляет записи или создаёт новые версии (история сохраняется), ничего не удаляет;
    - повторное применение той же версии ничего не меняет (маркер ContentRelease на пакет + версию);
    - в production сначала dry-run с числами (создать / обновить / пропустить); применяет только администратор, с AuditEvent;
    - откат пакета — архивирование его записей, обратимо;
    - курс или глава становятся видны гостям только после отдельного действия «опубликовать» владельцем; администратор видит неопубликованное с пометкой.
    Механизм предложить и реализовать в C1; дальше использовать для всех курсов.
11. **Порядок каждого этапа:** локальная тестовая база → предпросмотр владельцем (desktop и 390 px, светлая и тёмная темы) → отдельное разрешение владельца на push и deploy → применение пакета в production → проверка живого сайта.

## 3. Этапы

### C1. 9231 FP1, пилот: глава 1 и механизм пакетов

- Механизм пакетов из п. 10.
- Курс «Further Pure Mathematics 1 (9231)» со стабильным URL (пригодится при переезде). Если уже есть архивный кембриджский курс 9231 FP1, добавить в него оригинальные главы так же, как в 9709 Pure 1: гость видит только оригинальные главы, кембриджские — только администратор.
- Глава 1 Roots of polynomial equations, предлагаемые уроки (62 задачи распределить по `syllabus_tags`; таблица распределения — в отчёт):
  1. Roots and coefficients of quadratic, cubic and quartic equations
  2. Symmetric functions of roots and power sums
  3. Transforming equations by substitution
  4. Mixed problems
- Для каждого урока — полный состав из п. 5.
- Владелец оценивает качество всей главы прежде, чем писать остальные; его замечания вносятся в шаблон урока.
- Отчёт: `docs/ARENA-C1-REPORT-YYYYMMDD.md`.

### C2. 9231 FP1, главы 2–6

По одной главе на коммит, отчёт по каждой. Предлагаемые уроки (окончательно — по распределению задач):
- 2 Rational functions: 5 тем владельца (Asymptotes and curve sketching; Ranges and stationary points; Parameter families and reconstruction; Modulus and inequalities; Relationships between curves).
- 3 Summation of series: Standard sums Σr, Σr², Σr³; Method of differences (including partial fractions); Convergence and sums to infinity; Applications, limits and bounds.
- 4 Matrices 1: Matrix operations; Determinants and inverses; Transformations in two and three dimensions (including invariant points and lines); Mixed problems.
- 5 Polar coordinates: Polar and Cartesian forms; Sketching polar curves; Areas of regions; Extreme values and composite regions.
- 6 Vectors: The vector product; Lines and planes; Angles and distances; Skew lines and shortest distance; Parameter and special-case problems.

В каждом уроке не меньше 6 exam-style задач; если меньше — указать в отчёте. Рисунки гл. 2, 5, 6 — см. разд. 1.

### C3. 9231 FP1, глава 7 Proof by induction и Cross-topic revision

Задач владельца нет. Урок — по шаблону; задачи — по решению владельца: он готовит адаптации или Codex пишет новые по п. 1–6.

### C4. 9709 Pure 1: углубление

- В 9 главах (кроме Quadratics) по 10 exam-style. Цель — не меньше 6 exam-style на урок (≈30 на главу).
- Добавить четвёртый пример там, где три примера не доходят до экзаменационного уровня.
- Владелец просматривает конспекты; после просмотра — внутренний статус reviewed (на сайте не показывается).

### C5 и далее. 0606, 9231 FP2, Further Mechanics, Further Probability & Statistics

Порядок курсов — по решению владельца. Для каждого: адаптации владельца (когда будут готовы) + уроки по шаблону; главы — по syllabus.

## 4. Отчёт каждого этапа C

- Сколько уроков, примеров, quick checks; сколько задач импортировано и сколько отложено, с причинами.
- Таблица распределения задач по урокам.
- Таблица сходства с источниками; всё, что выше 0.5.
- Журнал проверок математики; найденные ошибки в задачах владельца.
- Скриншоты: desktop и 390 px, светлая и тёмная темы.
- Вопросы к владельцу.
