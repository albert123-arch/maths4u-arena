# C2: Vectors — локальный отчёт

Дата: 6 ноября 2026. Канонический проект `D:\www\arena`.
Выполнена только глава 6, пакет `9231-fp1-vectors` версии `1.0.0`.

## 1. Что сделано и почему

Глава открыта для проверки без входа:
http://127.0.0.1:3109/courses/maths4u-9231-fp1?chapter=fp1_vectors

PUBLISHED только в изолированной локальной тестовой базе.

- Пять уроков с Objective, Before you start, Key ideas, Method,
  Common mistakes и переходами между навыками.
- 20 самостоятельно составленных разобранных примеров.
- Все 84 задачи владельца: 258 подпунктов, 975 баллов, 919 критериев.
  Отложено 0. Ответы, решения, подсказки, критерии и баллы сохранены.
- 40 коротких проверок: по 6 SHORT и 2 MC на урок, свежие варианты
  и повторение через существующий механизм.
- Проверка всех требуемых координат, коэффициентов плоскости, параметров,
  расстояний и точных величин. Неполный набор не считается полным ответом.
- Все восемь рисунков владельца доступны только после открытия решения.
- Письменный каталог использует согласованную в Polar вёрстку: условие
  по ширине карточки, буквенные подпункты, баллы справа.

Перед началом предыдущая глава Polar и её согласованная правка вёрстки
зафиксированы отдельным локальным коммитом
`c62d47a63799f1fe685637cd816a5bdb0a1cb21c`: ровно 92 файла разрешённого
списка, включая roadmap. Output/, tmp/, test-results/ и .local/ не включены.
Vectors оставлена незакоммиченной для проверки владельцем.

## 2. Структура, авторство и сопоставление источников

Изучены разделы 6.1–6.3 книги `D:\new_books\furhter_cambridge.pdf`,
PDF-страницы 131–149, печатные 119–137. Сохранена последовательность
математических методов. Объяснения написаны своими словами, примеры
составлены заново. Упражнения, экзаменационный пример, рисунки и тексты
книги не переносились.

| Урок | Примеры | SHORT / MC | Задачи владельца |
|---|---:|---:|---:|
| Vector products, orientation and area | 4 | 6 / 2 | 8 |
| Lines and common perpendiculars | 4 | 6 / 2 | 23 |
| Describing and intersecting planes | 4 | 6 / 2 | 18 |
| Angles, projections and distances | 4 | 6 / 2 | 18 |
| Parameters and exceptional configurations | 4 | 6 / 2 | 17 |
| Всего | 20 | 30 / 10 | 84 |

В каждом уроке больше шести письменных задач. Некоторые многошаговые задачи
на произведения и прямые используют последующие методы плоскостей: это
явно отмечено в prerequisites, с рекомендацией вернуться после нужного урока.
Целые задачи не разрезались и не теряли подпункты или баллы.

Файлы владельца только читались; SHA-256 повторно сверены после работы:

- `E:\my folder\questions_data\original\Pure1 9231\06_Vectors_9231_revised.json`
  — `48760c9d501df7511872283c0ae6b3c76a4e84428a8732cb599e94c89244777c`.
- `E:\my folder\questions_data\original\Pure1 9231\9231_Chapter_06_Teacher_Review.html`
  — `2d854d1938d8d4684b5d769bf9506bc45ea2faeb3cfe038e820ad3ae85bd2060`.

В исходнике 61 new_skill_matched_variant и 23 topic_replacement. Последние
заменяют 21 ошибочно отнесённую задачу о матрицах и две об абстрактном базисе
собственными векторными задачами владельца. Все 84 имеют однозначную связь
с архивными Task / TaskVersion. Новым задачам созданы отдельные ORIGINAL
Task с content_uid владельца; архивные записи не переименовывались и не
заменялись. Порог сходства не используется. Происхождение доступно только
администратору; исходные экзаменационные вопросы не попадают в новый урок.

Полная таблица сопоставления, распределение и изображения:
[ARENA-C2-VECTORS-SOURCE-AUDIT-20261106.json](ARENA-C2-VECTORS-SOURCE-AUDIT-20261106.json).

## 3. Рисунки и формулы

Каталога images/ нет. Восемь ссылок исходного JSON сопоставлены с модельными
SVG внутри `<figure class="model-figure">` решений в учительском HTML.
Проверены номер статьи, заголовок задачи и title SVG. Извлечение сохраняет
регистр XML-атрибутов и игнорирует вложенные SVG формул MathJax.

Созданы восемь уникальных PNG, максимальная сторона 1600 px, пропорции
сохранены; общий размер 454 892 байта. Все рисунки просмотрены на контактном
листе, решение — отдельно на мобильной и широкой странице. Это файлы владельца,
не иллюстрации из учебника. Существующие архивные рисунки остались на месте.

PNG подключены как неизменяемые SOLUTION-ресурсы TaskVersion. Все восемь
после разрешения решения возвращают 200; прямые ссылки возвращают 404.
Гостевое разрешение не работает в сессии учителя. Учитель после публикации
может открыть решение и получить собственное разрешение. Исходный JSON
и физические пути закрыты. Ответы и рисунки решения в условие не вынесены.

KaTeX отрисовывает формулы на сервере: дроби, корни и столбцы векторов
остаются формулами. Длинные исходные выражения могут прокручиваться внутри
своего блока; горизонтальной прокрутки всей страницы нет.

## 4. Математическая и редакторская проверка

[ARENA-C2-VECTORS-MATH-CHECKS-20261106.json](ARENA-C2-VECTORS-MATH-CHECKS-20261106.json):
1 142 записи, из них 1 133 PASS и 9 REVIEWED; FAIL = 0, errors = 0,
unhandled = 0. Проверены все 84 задачи и 258 подпунктов, 20 примеров,
40 коротких ключей. Записи проверки привязаны к SHA фактического содержания.

- Векторные произведения, ориентация, площади и условия компланарности
  пересчитаны точной алгеброй.
- Основания общих перпендикуляров проверены по принадлежности исходным
  прямым и скалярным произведениям; расстояния — независимо через проекции.
- Нормали плоскостей, их константы и линии пересечения проверены подстановкой.
  Углы проверены точными отношениями квадратов и численно с округлением.
- Проекции и отражения проверяют все координаты, включая образ целой прямой.
- Отдельно проверены параллельные случаи, исчезновение знаменателя,
  полные множества параметров и оба знака уравнения расстояния.
- Обратные утверждения, полнота геометрических мест и глобальные минимумы
  разобраны отдельно; девять таких записей имеют REVIEWED, а не символический PASS.
- Короткие ключи проверены независимыми координатными ограничениями,
  формулой Грама, нормировками коэффициентов и полными наборами корней.
- Условия, ответы, подсказки, решения, критерии и баллы напрямую сверены
  с исходником. Изменены только ссылки рисунков SVG → защищённый PNG.
  Математических ошибок владельца, требующих согласования, не найдено.

Без `--owner` локально выполнены 1 057 проверок по content-bound fixtures:
1 048 PASS и 9 REVIEWED, ошибок нет. Это режим для CI без диска E:.
Сам Linux CI не запускался: push не разрешён. Проверки не заменяют внешнюю
независимую редакторскую экспертизу текста.

## 5. Тесты, роли и внешний вид

- 31 unit/regression тест прошёл: пакеты, полные ответы, прежние главы,
  π, вёрстка подпунктов, Quadratics и повторение.
- TypeScript, ESLint изменённых файлов и ESLint проекта с исключением
  существующих owner output/ и tmp/ прошли. Эти папки не изменялись.
- Node 22 / Webpack, standalone и Hostinger artifact audit прошли.
  Проверены 23 827 файлов артефакта: dotenv, тестовых fixtures и обнаруженных
  секретов нет. Все восемь PNG в артефакте совпадают по байтам с пакетом.
- Guarded lifecycle прошёл: dry-run без записи; 124 новых Task,
  124 TaskVersion и восемь StoredFile; неверный токен и роль учителя отклонены.
  Публикация, обратимое архивирование и независимость прогресса проверены.
  Старые пять опубликованных пакетов остались неизменны.
- Три сценария Playwright прошли: 40 сочетаний пяти уроков,
  четырёх ширин 360/390/768/1280 и двух тем; ещё 40 сочетаний письменного
  каталога и 56 сочетаний общих страниц и кабинетов. Нет ошибок страницы,
  KaTeX, наложений элементов или горизонтальной прокрутки всей страницы.
- Гостевой сценарий: неполные/полные координаты, эквивалентные дроби,
  сохранение черновика, пустой свежий вариант, все коэффициенты плоскости,
  оба корня параметра, отдельная формула для параллельного случая,
  письменная самооценка и её сохранение после перезагрузки.
- Открыты hint/solution/guidance всех 84 задач; проверены все восемь
  изображений и ограничения доступа к ним. В учебном тексте нет внутреннего
  происхождения или ссылок на архивные экзаменационные названия.
- Главная, /courses, /library, Completing the square и кабинеты ученика,
  учителя и администратора проверены. Контраст 12 сочетаний текста/фона
  в двух темах не ниже 5.60:1.
- После итоговой публикации все пять уроков дают 200 гостю, ученику,
  учителю и администратору; ошибки страницы отсутствуют. Health 200.

## 6. Сохранность и итог локальной публикации

База `maths4u_test_bank_c1_1cf6766c2a4d`, только 127.0.0.1:33317,
MATHS4U_ENV=test. Использован существующий guarded runtime, без подключения
к рабочему серверу и без создания новой копии проекта или новой базы.

| Показатель | До | После |
|---|---:|---:|
| Task | 3 840 | 3 964 |
| TaskVersion | 3 884 | 4 008 |
| StoredFile | 3 204 | 3 212 |
| Гостевой каталог | 1 178 | 1 302 |
| UNKNOWN | 0 | 0 |
| Презентации | 59 | 59 |

ContentRelease этого пакета ровно один. Повтор: skip=124, create=0,
update=0, zeroWrites=true. Все шесть подготовленных глав FP1 PUBLISHED.
Сверены 45 175 прежних строк в 63 таблицах: отсутствующих или изменённых
строк 0, необъяснённых изменений 0. LearningProgress сверён по составному
userId/lessonId: расхождений 0. Старые пользователи, классы, задания, ответы,
попытки, файлы и презентации сохранены. Добавлены только новые учебные
записи пакета и QA-события.

Перед завершением свободно: C: 36.01 GiB, D: 141.53 GiB.
Полных копий проекта не создавалось.

## 7. Изменённые файлы, ограничения и вопросы владельцу

Точный список для будущего отдельного коммита:
[ARENA-C2-VECTORS-FILES-20261106.json](ARENA-C2-VECTORS-FILES-20261106.json).
Включает пакет, две группы проверочных fixtures, восемь PNG, пять скриптов,
три теста, реестр, CI, roadmap и документы. Новых миграций нет.

Приватные доказательства: `.local/c2-vectors-20261106/` — baseline,
lifecycle, preservation, publication, repeat, финальные роли и логи.
Секреты не включены в отчёт или git. Снимки перечислены ниже; test-results/,
.local/, output/ и tmp/ не входят в список будущего коммита. Использован
headless Edge, без управления рабочим столом владельца.

Ограничения:

- Письменные доказательства остаются бумажной самооценкой с DRAFT
  Marking guidance; автоматическая проверка рассуждений и ИИ не добавлялись.
- Проверка полных коротких ответов использует координаты или явно заданную
  нормировку. Произвольная запись уравнения плоскости в трёх переменных
  не разбирается новым универсальным парсером; для этих задач он не нужен.
- Внешняя экспертная редактура, Linux CI, production dry-run и живой сайт
  в локальную проверку не входят.
- C3 Proof by induction, Cross-topic revision и C4–C5 не начаты.

Обязательных вопросов для завершения главы нет. Владелец может оценить
уроки и распределение сложных задач в локальном предпросмотре.

**Подтверждение:** без push, deploy, изменения production-базы, реальных
вызовов ИИ, включения рекламы или подключения платежей. Проект maths4u.sbs,
его файлы и база не затрагивались. Работа остановлена после Vectors.

### Скриншоты

- `test-results/c2-vectors-20261106/catalogue-distances-1280-dark.png`
- `test-results/c2-vectors-20261106/catalogue-distances-1280-light.png`
- `test-results/c2-vectors-20261106/catalogue-distances-390-dark.png`
- `test-results/c2-vectors-20261106/catalogue-distances-390-light.png`
- `test-results/c2-vectors-20261106/catalogue-lines-1280-dark.png`
- `test-results/c2-vectors-20261106/catalogue-lines-1280-light.png`
- `test-results/c2-vectors-20261106/catalogue-lines-390-dark.png`
- `test-results/c2-vectors-20261106/catalogue-lines-390-light.png`
- `test-results/c2-vectors-20261106/catalogue-parameters-1280-dark.png`
- `test-results/c2-vectors-20261106/catalogue-parameters-1280-light.png`
- `test-results/c2-vectors-20261106/catalogue-parameters-390-dark.png`
- `test-results/c2-vectors-20261106/catalogue-parameters-390-light.png`
- `test-results/c2-vectors-20261106/catalogue-planes-1280-dark.png`
- `test-results/c2-vectors-20261106/catalogue-planes-1280-light.png`
- `test-results/c2-vectors-20261106/catalogue-planes-390-dark.png`
- `test-results/c2-vectors-20261106/catalogue-planes-390-light.png`
- `test-results/c2-vectors-20261106/catalogue-products-1280-dark.png`
- `test-results/c2-vectors-20261106/catalogue-products-1280-light.png`
- `test-results/c2-vectors-20261106/catalogue-products-390-dark.png`
- `test-results/c2-vectors-20261106/catalogue-products-390-light.png`
- `test-results/c2-vectors-20261106/chapter-preview.png`
- `test-results/c2-vectors-20261106/distances-1280-dark.png`
- `test-results/c2-vectors-20261106/distances-1280-light.png`
- `test-results/c2-vectors-20261106/distances-390-dark.png`
- `test-results/c2-vectors-20261106/distances-390-light.png`
- `test-results/c2-vectors-20261106/examples-1280-dark.png`
- `test-results/c2-vectors-20261106/examples-1280-light.png`
- `test-results/c2-vectors-20261106/examples-390-dark.png`
- `test-results/c2-vectors-20261106/examples-390-light.png`
- `test-results/c2-vectors-20261106/lines-1280-dark.png`
- `test-results/c2-vectors-20261106/lines-1280-light.png`
- `test-results/c2-vectors-20261106/lines-390-dark.png`
- `test-results/c2-vectors-20261106/lines-390-light.png`
- `test-results/c2-vectors-20261106/mobile-first-screen.png`
- `test-results/c2-vectors-20261106/parameters-1280-dark.png`
- `test-results/c2-vectors-20261106/parameters-1280-light.png`
- `test-results/c2-vectors-20261106/parameters-390-dark.png`
- `test-results/c2-vectors-20261106/parameters-390-light.png`
- `test-results/c2-vectors-20261106/planes-1280-dark.png`
- `test-results/c2-vectors-20261106/planes-1280-light.png`
- `test-results/c2-vectors-20261106/planes-390-dark.png`
- `test-results/c2-vectors-20261106/planes-390-light.png`
- `test-results/c2-vectors-20261106/products-1280-dark.png`
- `test-results/c2-vectors-20261106/products-1280-light.png`
- `test-results/c2-vectors-20261106/products-390-dark.png`
- `test-results/c2-vectors-20261106/products-390-light.png`
- `test-results/c2-vectors-20261106/published-chapter-1280-dark.png`
- `test-results/c2-vectors-20261106/published-chapter-1280-light.png`
- `test-results/c2-vectors-20261106/published-chapter-390-dark.png`
- `test-results/c2-vectors-20261106/published-chapter-390-light.png`
- `test-results/c2-vectors-20261106/published-lesson-1280-dark.png`
- `test-results/c2-vectors-20261106/published-lesson-1280-light.png`
- `test-results/c2-vectors-20261106/published-lesson-390-dark.png`
- `test-results/c2-vectors-20261106/published-lesson-390-light.png`
- `test-results/c2-vectors-20261106/shared-admin-0-1280-dark.png`
- `test-results/c2-vectors-20261106/shared-admin-0-1280-light.png`
- `test-results/c2-vectors-20261106/shared-admin-0-390-dark.png`
- `test-results/c2-vectors-20261106/shared-admin-0-390-light.png`
- `test-results/c2-vectors-20261106/shared-guest-0-1280-dark.png`
- `test-results/c2-vectors-20261106/shared-guest-0-1280-light.png`
- `test-results/c2-vectors-20261106/shared-guest-0-390-dark.png`
- `test-results/c2-vectors-20261106/shared-guest-0-390-light.png`
- `test-results/c2-vectors-20261106/shared-guest-1-1280-dark.png`
- `test-results/c2-vectors-20261106/shared-guest-1-1280-light.png`
- `test-results/c2-vectors-20261106/shared-guest-1-390-dark.png`
- `test-results/c2-vectors-20261106/shared-guest-1-390-light.png`
- `test-results/c2-vectors-20261106/shared-guest-2-1280-dark.png`
- `test-results/c2-vectors-20261106/shared-guest-2-1280-light.png`
- `test-results/c2-vectors-20261106/shared-guest-2-390-dark.png`
- `test-results/c2-vectors-20261106/shared-guest-2-390-light.png`
- `test-results/c2-vectors-20261106/shared-guest-3-1280-dark.png`
- `test-results/c2-vectors-20261106/shared-guest-3-1280-light.png`
- `test-results/c2-vectors-20261106/shared-guest-3-390-dark.png`
- `test-results/c2-vectors-20261106/shared-guest-3-390-light.png`
- `test-results/c2-vectors-20261106/shared-student-0-1280-dark.png`
- `test-results/c2-vectors-20261106/shared-student-0-1280-light.png`
- `test-results/c2-vectors-20261106/shared-student-0-390-dark.png`
- `test-results/c2-vectors-20261106/shared-student-0-390-light.png`
- `test-results/c2-vectors-20261106/shared-teacher-0-1280-dark.png`
- `test-results/c2-vectors-20261106/shared-teacher-0-1280-light.png`
- `test-results/c2-vectors-20261106/shared-teacher-0-390-dark.png`
- `test-results/c2-vectors-20261106/shared-teacher-0-390-light.png`
- `test-results/c2-vectors-20261106/solution-1280-dark.png`
- `test-results/c2-vectors-20261106/solution-1280-light.png`
- `test-results/c2-vectors-20261106/solution-390-dark.png`
- `test-results/c2-vectors-20261106/solution-390-light.png`
