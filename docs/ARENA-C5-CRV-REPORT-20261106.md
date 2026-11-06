# C5: Further Statistics — Continuous random variables

Дата: 6 ноября 2026. Канонический проект `D:\www\arena`.
Выполнена только первая глава, пакет `9231-stats-crv` версии `1.0.0`.

## 1. Что сделано и почему

Предпросмотр без входа:
http://127.0.0.1:3109/courses/maths4u-9231-statistics?chapter=stats_crv

PUBLISHED только в изолированной локальной тестовой базе. Переиспользован
существующий курс `maths4u-9231-statistics`; названия в базе не менялись.

- Пять уроков с Objective, Before you start, Key ideas, Method,
  Common mistakes и переходами к предпосылкам и следующим навыкам.
- 20 самостоятельно составленных разобранных примеров.
- Все 38 задач владельца: 119 подпунктов, 343 балла. Отложено 0.
- 40 коротких проверок: по шесть SHORT и два MC на урок, свежие варианты,
  гостевые черновики и повторение слабых навыков.
- Полные квантили, коэффициенты, формулы CDF, функции плотности и границы
  носителя. Неполный ответ не считается полным.
- Все 16 рисунков владельца доступны только в решениях. Формулы остаются
  KaTeX, а не картинками.
- Письменный каталог использует согласованные буквенные подпункты,
  баллы справа и условие по ширине карточки.

Перед началом Induction зафиксирована отдельным локальным коммитом
`69edc6235d6c1c98741191b5fb35306380b0d31c`: ровно 16 файлов её списка,
включая roadmap, без output/, tmp/, test-results/ и .local/.
Новая глава Statistics оставлена незакоммиченной для просмотра владельцем.

## 2. Структура и источник

Изучена указанная владельцем книга
`D:\new_books\cambridge_international_as_a_level_full_book_for_further_pure_mathematics.pdf`.
Несмотря на имя файла, это полный Further Mathematics Coursebook на 646 страниц.
Первая глава Further Statistics в нём — глава 8 Continuous random variables.
Использован математический порядок разделов 8.1–8.4, PDF-страницы 167–198,
печатные 155–186. Тексты, примеры, упражнения и иллюстрации книги не переносились.
Объяснения и новые примеры составлены самостоятельно по учебным целям.

| Урок | Примеры | SHORT / MC | Задачи владельца |
|---|---:|---:|---:|
| Density models and probability areas | 4 | 6 / 2 | 6 |
| CDFs, quantiles and conditional probabilities | 4 | 6 / 2 | 8 |
| Expectations of functions and variance | 4 | 6 / 2 | 7 |
| Increasing and decreasing transformations | 4 | 6 / 2 | 11 |
| Mapped breakpoints and multiple inverse branches | 4 | 6 / 2 | 6 |
| Всего | 20 | 30 / 10 | 38 |

Группировка исходных контейнеров не копировалась: в них есть пустые разделы
и смешанные вопросы. Использованы фактические topic/skills. Задача 7 начинается
с заданной плотности и отнесена к первому уроку; остальные три экспоненциальные
модели начинаются с CDF и находятся во втором. У многошаговых задач первого
урока есть продолжения на квантили и моменты: prerequisites прямо рекомендует
вернуться к ним после соответствующих уроков. Задачи не разрезались на новые ID.
Во всех пяти уроках не меньше шести письменных задач.

Файлы владельца только читались:

- `E:\my folder\questions_data\original\Statistics 9231\01_Continuous_random_variables_9231_revised.json`
  SHA-256 `30e29a21272f1709dad928f7ef708969af996367fb53d72c763ce22fb38c2845`.
- `E:\my folder\questions_data\original\Statistics 9231\9231_Statistics_Chapter_01_Teacher_Review.html`
  SHA-256 `dde78285614108771eede00274edbf1854ea0e4cbded943317d987c5f12cffe4`.

Все 38 адаптаций получили отдельные ORIGINAL Task с content_uid владельца.
Для каждой найдена единственная связь с архивным Task/TaskVersion по UID или
legacy ID. Источник и его экзаменационные поля хранятся только у администратора;
в публичные названия, условия, столбцы TaskVersion или DTO не копировались.
Архивные задачи не переименовывались, не заменялись и не публиковались.
Числовой порог сходства не используется.

Полная таблица сопоставления и распределения:
[ARENA-C5-CRV-SOURCE-AUDIT-20261106.json](ARENA-C5-CRV-SOURCE-AUDIT-20261106.json).

## 3. Рисунки и отображение

Каталога images/ рядом с JSON нет. Все 16 модельных SVG найдены встроенными
в учительском HTML. Проверены номер статьи, заголовок задачи, JSON-путь и alt,
aria-label SVG и префикс имён элементов с исходным именем файла. Извлекаются
только figure.model-figure внутри решения; вложенные SVG формул игнорируются.
Регистр XML-атрибутов сохраняется, внешних ресурсов у рисунков нет.

Созданы 16 уникальных PNG, максимум 1600 px по большей стороне, пропорции
сохранены, общий размер 813 878 байт. Все просмотрены на двух контактных листах.
Кривые, точки разрыва, носители и подписанные оси соответствуют моделям задач.
Одиннадцать прежних оригинальных изображений не использованы для новых ответов;
существующие файлы архива сохранены.

PNG — неизменяемые SOLUTION-ресурсы TaskVersion. Все 16 загружаются с HTTP 200
после разрешения решения. Все прямые URL без разрешения дают 404; гостевая
ссылка не работает в сессии учителя. Сам учитель после публикации может
открыть решение и получить своё разрешение. Исходный JSON и физические пути
закрыты. Рисунки решений в условиях не появляются.

Дроби, корни, интегралы и кусочные функции отрисованы KaTeX на сервере.
Для новых примеров проверены также фактические отображаемые ветви CDF/PDF,
внешние значения и границы. Плотности на внутренних стыках определены одной
ветвью; интегрируемая особенность в отдельном примере не превращается в атом.

## 4. Математическая и редакторская проверка

[ARENA-C5-CRV-MATH-CHECKS-20261106.json](ARENA-C5-CRV-MATH-CHECKS-20261106.json):
2 171 запись — 2 121 PASS и 50 REVIEWED; FAIL=0, errors=0, unhandled=0.
Это математические и структурные проверки, включая прямую сверку исходника.
Проверены все 38 задач, 119 подпунктов, 20 примеров и 40 коротких ключей.

- Независимые модели восстановлены из условий: нормировка, заданные площади,
  непрерывность плотности только там, где она явно дана, и концевые условия.
  Системы для параметров решены заново; проверена единственность решения.
- Проверены полная масса, неотрицательность каждой ветви через точный диапазон
  или символьную факторизацию, производная CDF, непрерывность и предельные значения.
  Выборочная сетка не используется как доказательство знака плотности.
- Фактические скалярные ответы и ветви CDF/PDF разобраны из TeX и сопоставлены
  с заново проинтегрированными моделями. Компактные записи вроде `\frac16`,
  `\sqrt3` и аргументы логарифмов уточняются только внутри проверяющего скрипта;
  содержание владельца не переписывается.
- Вероятности интервалов, хвосты и условные события пересчитаны. Для независимых
  печатей проверены обе соседние целые границы строгого порога и монотонность.
- Квантили проверены на правильных ветвях и внутри носителя. Оба квартиля
  найдены отдельно перед проверкой IQR. Численный 80-й процентиль задачи 20
  подтверждён скобкой вероятности, соответствующей округлению 0.601.
- Пересчитаны E(h(X)), E(h(X)²), дисперсии и дробные/обратные моменты,
  включая четвёртый момент для Var(X²) и сходимость нужных интегралов.
- Преобразованные распределения выведены через CDF до дифференцирования:
  направление неравенства, обратная функция, все отображённые границы и стыки,
  положительная плотность и масса 1. Новые примеры также включают два прообраза
  квадрата, абсолютную величину и сохранение разрыва носителя без совместных плотностей.
- REVIEWED отдельно отмечает 38 авторских проверок полноты письменного метода,
  два эскиза и десять логических MC. Это не внешняя независимая экспертиза.
- Условия, ответы, подсказки, решения, критерии и баллы напрямую сверены
  с исходным файлом. Изменены только ссылки SVG → защищённый PNG.
  Ошибок владельца, требующих согласования, не найдено.

Без `--owner` локально пройдено 1 980 проверок по связанным с содержанием
fixtures, без ошибок. Этот режим работает без диска E: и добавлен в CI.
Сам Linux CI не запускался, поскольку push не разрешён.

## 5. Тесты, роли и внешний вид

- 37 unit/regression тестов прошли: схема пакетов, прежние главы, все полные
  короткие ключи, пропуски и неверные поля, эквивалентные дроби и рациональные
  плотности, замороженные дескрипторы оценивания, скрытое происхождение,
  ручные письменные задачи, KaTeX и повторение.
- TypeScript и ESLint проекта прошли. Существующие owner output/ и tmp/
  исключены из lint и оставлены без изменений.
- Node 22 / Webpack / standalone / Hostinger artifact audit прошли:
  проверено 23 847 файлов, dotenv, тестовых данных и обнаруженных секретов нет.
  Все 16 PNG в артефакте совпадают по байтам с пакетом.
- Lifecycle на guarded test DB прошёл: dry-run без записи; 78 новых Task,
  78 TaskVersion, 16 StoredFile; учитель и неверный токен отклонены;
  публикация, архивирование и восстановление обратимы. Семь прежних пакетов
  и их состояния остались неизменны. Повторный импорт ничего не пишет.
- Три сценария Playwright прошли: 40 сочетаний пяти уроков, 40 сочетаний
  письменного каталога, 56 общих страниц и кабинетов. Ширины
  360/390/768/1280, светлая и тёмная темы. Ошибок страницы, KaTeX,
  наложений и горизонтальной прокрутки всей страницы нет.
- Гость: различие точки и плотности; все три ответа о квартилях; момент
  преобразованной величины; полная рациональная плотность с концами носителя;
  оба прообраза в CDF; ошибка → свежий вариант в повторении; черновики,
  перезагрузка, письменная самооценка и её сохранение.
- Открыты hint/solution/guidance всех 38 задач и все 16 рисунков; проверены
  ограничения доступа к исходникам и файлам. Внутреннее происхождение не показывается.
- Главная, /courses, /library, Completing the square и кабинеты ученика,
  учителя и администратора проверены. Контраст 12 сочетаний текста/фона
  в двух темах не ниже 5.60:1.
- После итоговой публикации все пять уроков дают 200 гостю, ученику,
  учителю и администратору. Health 200, ошибок страницы нет.

## 6. Сохранность данных

Только существующая локальная база `maths4u_test_bank_c1_1cf6766c2a4d`,
127.0.0.1:33317, MATHS4U_ENV=test. Новая база или копия проекта не создавалась.
Курс Statistics уже имел published=1; его запись и название не менялись.

| Показатель | До | После |
|---|---:|---:|
| Task | 4 034 | 4 112 |
| TaskVersion | 4 218 | 4 296 |
| StoredFile | 3 212 | 3 228 |
| Гостевой каталог | 1 372 | 1 450 |
| UNKNOWN | 0 | 0 |
| Презентации | 59 | 59 |

Маркер `pkg:9231-stats-crv:1.0.0` ровно один. Повтор: skip=78,
create/update=0, zeroWrites=true. Все семь глав FP1 и новая глава Statistics
PUBLISHED только локально.

Сверены 48 547 прежних строк в 63 таблицах: отсутствующих/изменённых строк 0,
расхождений прежнего LearningProgress 0, необъяснённых изменений 0.
Пользователи, классы, задания, ответы, попытки, банк, версии, файлы и
59 презентаций сохранены. Добавлены только новые учебные записи и QA-события.

Перед завершением свободно C: 35.95 GiB, D: 141.45 GiB.
Хеши обоих исходных файлов повторно сверены и совпали.

## 7. Файлы, ограничения и вопросы владельцу

Точный список для будущего отдельного коммита:
[ARENA-C5-CRV-FILES-20261106.json](ARENA-C5-CRV-FILES-20261106.json).
Включает пакет, проверочные модели, 16 PNG, пять скриптов, три теста,
реестр, CI, roadmap и документы. Новых миграций нет.

Приватные доказательства в `.local/c5-crv-20261106/`: baseline, lifecycle,
preservation, source mappings, publication, repeat, роли, контактные листы
и логи. Скриншоты перечислены ниже. .local/, test-results/, output/ и tmp/
не включены в список коммита. Использован headless Edge без управления
рабочим столом владельца. Секреты не выводились и не добавлялись в git.

Ограничения:

- Письменные задачи остаются бумажной самооценкой с DRAFT Marking guidance;
  это не автоматическая проверка полного рассуждения или официальная MS.
- Короткая проверка принимает все запрошенные поля в явно указанном формате.
  Универсальный ввод произвольных экспоненциальных/логарифмических функций
  не добавлялся; такие письменные формулы сравниваются с решением на бумаге.
- Длинные формулы могут прокручиваться внутри своего блока на узком экране,
  без горизонтальной прокрутки всей страницы.
- Внешняя экспертная редактура, Linux CI, production dry-run и живой сайт
  не входят в локальные проверки.
- Следующие главы Statistics, Cross-topic revision и другие курсы не начаты.

Обязательных вопросов нет; следующий шаг — просмотр главы владельцем.

**Подтверждение:** без push, deploy, изменения production-базы, реальных
вызовов ИИ, включения рекламы и подключения платежей. Проект maths4u.sbs,
его файлы и база не затрагивались. Работа остановлена после первой главы Statistics.

### Скриншоты

- `test-results/c5-crv-20261106/catalogue-cdf-1280-dark.png`
- `test-results/c5-crv-20261106/catalogue-cdf-1280-light.png`
- `test-results/c5-crv-20261106/catalogue-cdf-390-dark.png`
- `test-results/c5-crv-20261106/catalogue-cdf-390-light.png`
- `test-results/c5-crv-20261106/catalogue-density-1280-dark.png`
- `test-results/c5-crv-20261106/catalogue-density-1280-light.png`
- `test-results/c5-crv-20261106/catalogue-density-390-dark.png`
- `test-results/c5-crv-20261106/catalogue-density-390-light.png`
- `test-results/c5-crv-20261106/catalogue-moments-1280-dark.png`
- `test-results/c5-crv-20261106/catalogue-moments-1280-light.png`
- `test-results/c5-crv-20261106/catalogue-moments-390-dark.png`
- `test-results/c5-crv-20261106/catalogue-moments-390-light.png`
- `test-results/c5-crv-20261106/catalogue-monotone-1280-dark.png`
- `test-results/c5-crv-20261106/catalogue-monotone-1280-light.png`
- `test-results/c5-crv-20261106/catalogue-monotone-390-dark.png`
- `test-results/c5-crv-20261106/catalogue-monotone-390-light.png`
- `test-results/c5-crv-20261106/catalogue-piecewise-1280-dark.png`
- `test-results/c5-crv-20261106/catalogue-piecewise-1280-light.png`
- `test-results/c5-crv-20261106/catalogue-piecewise-390-dark.png`
- `test-results/c5-crv-20261106/catalogue-piecewise-390-light.png`
- `test-results/c5-crv-20261106/cdf-1280-dark.png`
- `test-results/c5-crv-20261106/cdf-1280-light.png`
- `test-results/c5-crv-20261106/cdf-390-dark.png`
- `test-results/c5-crv-20261106/cdf-390-light.png`
- `test-results/c5-crv-20261106/chapter-preview.png`
- `test-results/c5-crv-20261106/density-1280-dark.png`
- `test-results/c5-crv-20261106/density-1280-light.png`
- `test-results/c5-crv-20261106/density-390-dark.png`
- `test-results/c5-crv-20261106/density-390-light.png`
- `test-results/c5-crv-20261106/examples-1280-dark.png`
- `test-results/c5-crv-20261106/examples-1280-light.png`
- `test-results/c5-crv-20261106/examples-390-dark.png`
- `test-results/c5-crv-20261106/examples-390-light.png`
- `test-results/c5-crv-20261106/mobile-first-screen.png`
- `test-results/c5-crv-20261106/moments-1280-dark.png`
- `test-results/c5-crv-20261106/moments-1280-light.png`
- `test-results/c5-crv-20261106/moments-390-dark.png`
- `test-results/c5-crv-20261106/moments-390-light.png`
- `test-results/c5-crv-20261106/monotone-1280-dark.png`
- `test-results/c5-crv-20261106/monotone-1280-light.png`
- `test-results/c5-crv-20261106/monotone-390-dark.png`
- `test-results/c5-crv-20261106/monotone-390-light.png`
- `test-results/c5-crv-20261106/piecewise-1280-dark.png`
- `test-results/c5-crv-20261106/piecewise-1280-light.png`
- `test-results/c5-crv-20261106/piecewise-390-dark.png`
- `test-results/c5-crv-20261106/piecewise-390-light.png`
- `test-results/c5-crv-20261106/published-chapter-1280-dark.png`
- `test-results/c5-crv-20261106/published-chapter-1280-light.png`
- `test-results/c5-crv-20261106/published-chapter-390-dark.png`
- `test-results/c5-crv-20261106/published-chapter-390-light.png`
- `test-results/c5-crv-20261106/published-lesson-1280-dark.png`
- `test-results/c5-crv-20261106/published-lesson-1280-light.png`
- `test-results/c5-crv-20261106/published-lesson-390-dark.png`
- `test-results/c5-crv-20261106/published-lesson-390-light.png`
- `test-results/c5-crv-20261106/shared-admin-0-1280-dark.png`
- `test-results/c5-crv-20261106/shared-admin-0-1280-light.png`
- `test-results/c5-crv-20261106/shared-admin-0-390-dark.png`
- `test-results/c5-crv-20261106/shared-admin-0-390-light.png`
- `test-results/c5-crv-20261106/shared-guest-0-1280-dark.png`
- `test-results/c5-crv-20261106/shared-guest-0-1280-light.png`
- `test-results/c5-crv-20261106/shared-guest-0-390-dark.png`
- `test-results/c5-crv-20261106/shared-guest-0-390-light.png`
- `test-results/c5-crv-20261106/shared-guest-1-1280-dark.png`
- `test-results/c5-crv-20261106/shared-guest-1-1280-light.png`
- `test-results/c5-crv-20261106/shared-guest-1-390-dark.png`
- `test-results/c5-crv-20261106/shared-guest-1-390-light.png`
- `test-results/c5-crv-20261106/shared-guest-2-1280-dark.png`
- `test-results/c5-crv-20261106/shared-guest-2-1280-light.png`
- `test-results/c5-crv-20261106/shared-guest-2-390-dark.png`
- `test-results/c5-crv-20261106/shared-guest-2-390-light.png`
- `test-results/c5-crv-20261106/shared-guest-3-1280-dark.png`
- `test-results/c5-crv-20261106/shared-guest-3-1280-light.png`
- `test-results/c5-crv-20261106/shared-guest-3-390-dark.png`
- `test-results/c5-crv-20261106/shared-guest-3-390-light.png`
- `test-results/c5-crv-20261106/shared-student-0-1280-dark.png`
- `test-results/c5-crv-20261106/shared-student-0-1280-light.png`
- `test-results/c5-crv-20261106/shared-student-0-390-dark.png`
- `test-results/c5-crv-20261106/shared-student-0-390-light.png`
- `test-results/c5-crv-20261106/shared-teacher-0-1280-dark.png`
- `test-results/c5-crv-20261106/shared-teacher-0-1280-light.png`
- `test-results/c5-crv-20261106/shared-teacher-0-390-dark.png`
- `test-results/c5-crv-20261106/shared-teacher-0-390-light.png`
- `test-results/c5-crv-20261106/solution-1280-dark.png`
- `test-results/c5-crv-20261106/solution-1280-light.png`
- `test-results/c5-crv-20261106/solution-390-dark.png`
- `test-results/c5-crv-20261106/solution-390-light.png`
