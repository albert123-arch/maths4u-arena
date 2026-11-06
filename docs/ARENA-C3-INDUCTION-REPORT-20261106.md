# C3: Proof by induction — локальный отчёт

Дата: 6 ноября 2026. Канонический проект `D:\www\arena`.
Выполнена только глава 7, пакет `9231-fp1-induction`, итоговая версия `1.0.2`.
Cross-topic revision не начата.

## 1. Что сделано и почему

Глава доступна без входа:
http://127.0.0.1:3109/courses/maths4u-9231-fp1?chapter=fp1_induction

PUBLISHED только в изолированной локальной тестовой базе.

- Пять последовательных уроков с Objective, Before you start, Key ideas,
  Method, Common mistakes и переходами к предпосылкам и соседним урокам.
- 20 самостоятельно составленных примеров с полным начальным случаем,
  гипотезой, переходом и заключением.
- 30 новых письменных задач: 60 подпунктов, 224 балла, решения, подсказки
  и отдельные критерии. Нет задач из экзаменов или банка владельца.
- 40 коротких проверок (30 SHORT, 10 MC), включая свежие варианты,
  гостевые черновики и повторение по слабым навыкам.
- Полные коэффициенты и элементы матриц, целые алгебраические переходы,
  правильный порядок производной, начальные условия и точные остатки.
- Письменные задачи оформлены по согласованному шаблону: буквенные
  подпункты, баллы справа, условие по ширине карточки.

Короткая проверка оценивает ингредиенты доказательства и точную алгебру.
Она не выдаёт автоматическую оценку за полное рассуждение. Все письменные
задачи имеют MANUAL и `autoPoints=null`, решение на бумаге и самооценку
по DRAFT Marking guidance. Существующие учительские оценки не менялись.

Перед началом Vectors зафиксирована отдельным локальным коммитом
`793cde7b26b7453ebf5378595d6b44a22d4c239c`: ровно 27 файлов её списка,
включая roadmap. Output/, tmp/, test-results/ и .local/ не включены.
Новая глава Induction оставлена незакоммиченной для просмотра владельцем.

## 2. Структура и источники

Изучены разделы 7.1–7.2 книги `D:\new_books\furhter_cambridge.pdf`,
PDF-страницы 152–160, печатные 140–148. Использован математический порядок,
а не текст книги: суммы → повторные производные → рекуррентные соотношения
и границы → степени матриц → делимость. Названия уроков и объяснения свои.
Экзаменационный разбор не использован; иллюстрации не требуются.

| Урок | Примеры | SHORT / MC | Письменные задачи | Письменные баллы |
|---|---:|---:|---:|---:|
| Building an induction proof | 4 | 6 / 2 | 6 | 42 |
| Induction through repeated differentiation | 4 | 6 / 2 | 6 | 42 |
| Recursive formulae and invariant bounds | 4 | 6 / 2 | 6 | 48 |
| Induction for matrix powers | 4 | 6 / 2 | 6 | 44 |
| Divisibility and a complete inductive argument | 4 | 6 / 2 | 6 | 48 |
| Всего | 20 | 30 / 10 | 30 | 224 |

Письменные задачи включают нестандартный начальный индекс, контрпример
ошибочной формулы, взвешенную сумму, производные произведений, парные
начальные условия, знаки знаменателей, обоснование сходимости, матрицы 3×3,
проекторы, нулевой параметр, целочисленный остаток и полную область индексов.

Новых задач всего 70; отложено 0. Присвоены собственные стабильные UID
`M4U-9231-IN-*` и ORIGINAL с ручным происхождением. Ни одному архивному Task
не присваивалась новая формулировка или новая роль. Связи с экзаменационными
источниками не выдумывались: `archiveLink=null`, `source.supplied=0`.
SHA источника связывает самостоятельно составленный authoring brief.

Таблица всех 70 идентификаторов, распределения, происхождения и хешей:
[ARENA-C3-INDUCTION-SOURCE-AUDIT-20261106.json](ARENA-C3-INDUCTION-SOURCE-AUDIT-20261106.json).
Файлы владельца и учебник только читались; исходная папка задач не менялась.

## 3. Редакторская сверка и история версий

При финальной визуальной сверке с упражнениями книги обнаружились совпадения
нескольких стандартных формул. Перед просмотром владельца они заменены:
примеры E-V2/E-V3, письменная V05 и короткие V21/V22. Итоговые задания
составлены самостоятельно: в частности, V05 соединяет экспоненциальную
поправку с доказательством чётности через треугольные числа.

Первая 1.0.0 уже использовалась в локальном QA, поэтому она не переписывалась
в базе. Применена новая 1.0.1: Task новых не добавлено, созданы 70 новых
TaskVersion штатным механизмом версии пакета. Последующая вычитка нашла
неверное промежуточное разложение в примере E-S3: итоговая оценка была верной,
но равенство нуждалось в исправлении. В 1.0.2 записано правильное разложение
и добавлена его прямая символическая проверка. По механизму версии пакета
добавлены ещё 70 TaskVersion. Сверены все 140 прежних
TaskVersion с вложенными текстами, частями, ключами, вариантами и ресурсами —
изменений нет. Прежние QA-записи сохранены. Для старого банка это изменений
не создаёт. На чистой базе импортируется только итоговая 1.0.2.

Существуют три исторические ContentRelease главы: по одной на 1.0.0, 1.0.1
и 1.0.2. Для актуальной 1.0.2 маркер ровно один; повтор не создаёт ни версий,
ни маркеров, ни AuditEvent. Это редакционная история, не повторный импорт.

## 4. Математическая и редакторская проверка

[ARENA-C3-INDUCTION-MATH-CHECKS-20261106.json](ARENA-C3-INDUCTION-MATH-CHECKS-20261106.json):
770 записей — 726 PASS, 44 REVIEWED; FAIL=0, errors=0, unhandled=0.
Проверены все 30 письменных задач, 20 примеров и 40 коротких проверок.
Модели привязаны к хешам фактического содержания, включая уроки и критерии.

- Суммы: начальный случай и тождество F(n+1)−F(n)=t(n+1), отдельные
  конечные суммы, хвосты, строгие границы и первые контрпримеры.
- Производные: прямой начальный порядок и общий символический переход
  нужным числом дифференцирований; дополнительно первые пять порядков.
- Последовательности: начальные условия, общий переход первого/второго
  порядка, знаки знаменателей, образы границ и факторизации приращений.
- Матрицы: все элементы, A⁰=I, общий продукт F(n)A=F(n+1), парные
  степени, идемпотентность, нулевой параметр, полный образ вектора.
- Делимость: символический остаток и его целочисленность для всех n≥0.
  Для полиномиального частного использованы целые коэффициенты Ньютона
  (конечные разности в 0); это общий сертификат, а не выборочная подстановка.
- Равенство чётности V05 проверено через отдельное тождество для разности
  частного и треугольного числа; начальный случай и целочисленность проверены.
- Короткие ответы проверяют всю запрошенную формулу/матрицу/набор констант.
  Численные подстановки — дополнительные диагностические проверки.
- REVIEWED отдельно отмечает авторскую проверку логики MC, полноты
  письменного доказательства, области индексов и аргументов сходимости.
  Это не внешняя независимая экспертиза текста.

Генератор и verifier работают без диска E: и без сети. Ошибок в задачах
владельца нет в списке: в этом этапе его задачи не импортировались.
Linux CI добавлен в workflow, но удалённо не запускался, поскольку push запрещён.

## 5. Тесты, роли и внешний вид

- 34 unit/regression теста прошли: все главы FP1, полные ключи, неверные
  и пропущенные поля, эквивалентная алгебра, замороженные ключи заданий,
  оригинальное происхождение, ссылки-предпосылки, отсутствие ключей
  в публичных DTO, KaTeX, ручные доказательства и повторение.
- TypeScript и ESLint проекта прошли; существующие owner output/ и tmp/
  исключены из lint и оставлены без изменений.
- Node 22 / Webpack / standalone / Hostinger artifact audit прошли.
  Артефакт проверен на dotenv, тестовые данные и обнаруженные секреты.
- Guarded lifecycle: dry-run без записи, отказ учителю/неверному токену,
  публикация, обратимое архивирование, восстановление, независимый прогресс,
  повтор без записи. Шесть прежних пакетов сохранили PUBLISHED и прежние записи.
- Три сценария Playwright прошли на итоговом содержании: 40 сочетаний
  уроков, 40 сочетаний письменного каталога, 56 общих страниц и кабинетов.
  Ширины 360/390/768/1280, светлая и тёмная темы. Нет ошибок страницы,
  KaTeX, наложений или горизонтальной прокрутки всей страницы.
- Гость: неверный шаг → повторение на свежем варианте; возвращение
  к черновику; правильная эквивалентная формула; дробный коэффициент;
  порядок производной в MC; каждый элемент матрицы; точный остаток;
  письменное решение и сохранение самооценки после перезагрузки.
- Hint, solution и guidance открыты у всех 30 письменных задач.
  Source JSON закрыт (404), внутреннее происхождение не показывается.
- Главная, /courses, /library, Completing the square и кабинеты ученика,
  учителя и администратора проверены. Для 12 сочетаний текста/фона
  контраст не ниже 5.60:1.
- После итоговой публикации пять уроков доступны гостю, ученику,
  учителю и администратору с HTTP 200; health 200.

## 6. Сохранность и итог локальной публикации

Только `maths4u_test_bank_c1_1cf6766c2a4d`, 127.0.0.1:33317,
MATHS4U_ENV=test. Существующий guarded runtime переиспользован.

| Показатель | До главы | После итоговой версии |
|---|---:|---:|
| Task | 3 964 | 4 034 |
| TaskVersion | 4 008 | 4 218 |
| StoredFile | 3 212 | 3 212 |
| Гостевой каталог | 1 302 | 1 372 |
| UNKNOWN | 0 | 0 |
| Презентации | 59 | 59 |

Из 210 добавленных TaskVersion по 70 относятся к локальным редакциям
1.0.0, 1.0.1 и 1.0.2; исходные 4 008 версий не менялись. Все семь глав FP1
PUBLISHED локально. Повтор актуальной версии: skip=70, create/update=0,
zeroWrites=true. Маркер актуальной версии ровно один.

Сверены 46 526 прежних строк в 63 таблицах. Отсутствующих/изменённых
старых строк 0, расхождений прежнего LearningProgress 0, необъяснённых
изменений 0. Пользователи, классы, работы, ответы, попытки, старые версии,
банк, файлы и 59 презентаций сохранены. Дополнительно проверена сохранность
140 прежних версий новой главы при итоговом редакционном обновлении.

Полных копий проекта или новых баз не создавалось. Перед завершением
свободно C: 36.01 GiB, D: 141.50 GiB. Секреты не выводились в отчёт
и не добавлялись в git.

## 7. Файлы, ограничения, вопросы владельцу

Точный список для будущего отдельного коммита:
[ARENA-C3-INDUCTION-FILES-20261106.json](ARENA-C3-INDUCTION-FILES-20261106.json).
Включает пакет, проверочные модели, три скрипта, три теста, реестр, CI,
roadmap и документы. Миграций и новых изображений нет.

Приватные доказательства в `.local/c3-induction-20261106/`: baseline,
preservation, первая и итоговая lifecycle-проверки, revision, repeat,
publication, финальные роли и логи. Снимки в test-results/ перечислены ниже.
Эти папки, output/ и tmp/ в список коммита не входят. Работа выполнена
через headless Edge и CLI, без управления рабочим столом владельца.

Ограничения:

- Нет автоматической проверки полного текста доказательства, учительской
  оценки по самоотметкам или ИИ-проверки. Письменные критерии — предлагаемые,
  не официальная Cambridge mark scheme и не внешняя экспертная верификация.
- Linux CI и production-проверки не запускались; проверена локальная
  Windows-сборка и артефакт. Публикация только в локальной тестовой базе.
- Длинные цепочки равенств и матрицы на узком экране прокручиваются
  внутри собственного блока формулы. Горизонтальной прокрутки страницы нет.
- Cross-topic revision и остальные C3/C4–C5 не реализованы.

Обязательных вопросов для завершения нет; следующий шаг — просмотр владельцем.

**Подтверждение:** без push, deploy, изменения production-базы, реальных
вызовов ИИ, включения рекламы и подключения платежей. Проект maths4u.sbs,
его файлы и база не затрагивались. Работа остановлена после Proof by induction.

### Скриншоты

- `test-results/c3-induction-20261106/catalogue-derivatives-1280-dark.png`
- `test-results/c3-induction-20261106/catalogue-derivatives-1280-light.png`
- `test-results/c3-induction-20261106/catalogue-derivatives-390-dark.png`
- `test-results/c3-induction-20261106/catalogue-derivatives-390-light.png`
- `test-results/c3-induction-20261106/catalogue-divisibility-1280-dark.png`
- `test-results/c3-induction-20261106/catalogue-divisibility-1280-light.png`
- `test-results/c3-induction-20261106/catalogue-divisibility-390-dark.png`
- `test-results/c3-induction-20261106/catalogue-divisibility-390-light.png`
- `test-results/c3-induction-20261106/catalogue-matrices-1280-dark.png`
- `test-results/c3-induction-20261106/catalogue-matrices-1280-light.png`
- `test-results/c3-induction-20261106/catalogue-matrices-390-dark.png`
- `test-results/c3-induction-20261106/catalogue-matrices-390-light.png`
- `test-results/c3-induction-20261106/catalogue-recurrences-1280-dark.png`
- `test-results/c3-induction-20261106/catalogue-recurrences-1280-light.png`
- `test-results/c3-induction-20261106/catalogue-recurrences-390-dark.png`
- `test-results/c3-induction-20261106/catalogue-recurrences-390-light.png`
- `test-results/c3-induction-20261106/catalogue-sums-1280-dark.png`
- `test-results/c3-induction-20261106/catalogue-sums-1280-light.png`
- `test-results/c3-induction-20261106/catalogue-sums-390-dark.png`
- `test-results/c3-induction-20261106/catalogue-sums-390-light.png`
- `test-results/c3-induction-20261106/chapter-preview.png`
- `test-results/c3-induction-20261106/derivatives-1280-dark.png`
- `test-results/c3-induction-20261106/derivatives-1280-light.png`
- `test-results/c3-induction-20261106/derivatives-390-dark.png`
- `test-results/c3-induction-20261106/derivatives-390-light.png`
- `test-results/c3-induction-20261106/divisibility-1280-dark.png`
- `test-results/c3-induction-20261106/divisibility-1280-light.png`
- `test-results/c3-induction-20261106/divisibility-390-dark.png`
- `test-results/c3-induction-20261106/divisibility-390-light.png`
- `test-results/c3-induction-20261106/examples-1280-dark.png`
- `test-results/c3-induction-20261106/examples-1280-light.png`
- `test-results/c3-induction-20261106/examples-390-dark.png`
- `test-results/c3-induction-20261106/examples-390-light.png`
- `test-results/c3-induction-20261106/matrices-1280-dark.png`
- `test-results/c3-induction-20261106/matrices-1280-light.png`
- `test-results/c3-induction-20261106/matrices-390-dark.png`
- `test-results/c3-induction-20261106/matrices-390-light.png`
- `test-results/c3-induction-20261106/mobile-first-screen.png`
- `test-results/c3-induction-20261106/proof-step-1280-dark.png`
- `test-results/c3-induction-20261106/proof-step-1280-light.png`
- `test-results/c3-induction-20261106/proof-step-390-dark.png`
- `test-results/c3-induction-20261106/proof-step-390-light.png`
- `test-results/c3-induction-20261106/published-chapter-1280-dark.png`
- `test-results/c3-induction-20261106/published-chapter-1280-light.png`
- `test-results/c3-induction-20261106/published-chapter-390-dark.png`
- `test-results/c3-induction-20261106/published-chapter-390-light.png`
- `test-results/c3-induction-20261106/published-lesson-1280-dark.png`
- `test-results/c3-induction-20261106/published-lesson-1280-light.png`
- `test-results/c3-induction-20261106/published-lesson-390-dark.png`
- `test-results/c3-induction-20261106/published-lesson-390-light.png`
- `test-results/c3-induction-20261106/recurrences-1280-dark.png`
- `test-results/c3-induction-20261106/recurrences-1280-light.png`
- `test-results/c3-induction-20261106/recurrences-390-dark.png`
- `test-results/c3-induction-20261106/recurrences-390-light.png`
- `test-results/c3-induction-20261106/shared-admin-0-1280-dark.png`
- `test-results/c3-induction-20261106/shared-admin-0-1280-light.png`
- `test-results/c3-induction-20261106/shared-admin-0-390-dark.png`
- `test-results/c3-induction-20261106/shared-admin-0-390-light.png`
- `test-results/c3-induction-20261106/shared-guest-0-1280-dark.png`
- `test-results/c3-induction-20261106/shared-guest-0-1280-light.png`
- `test-results/c3-induction-20261106/shared-guest-0-390-dark.png`
- `test-results/c3-induction-20261106/shared-guest-0-390-light.png`
- `test-results/c3-induction-20261106/shared-guest-1-1280-dark.png`
- `test-results/c3-induction-20261106/shared-guest-1-1280-light.png`
- `test-results/c3-induction-20261106/shared-guest-1-390-dark.png`
- `test-results/c3-induction-20261106/shared-guest-1-390-light.png`
- `test-results/c3-induction-20261106/shared-guest-2-1280-dark.png`
- `test-results/c3-induction-20261106/shared-guest-2-1280-light.png`
- `test-results/c3-induction-20261106/shared-guest-2-390-dark.png`
- `test-results/c3-induction-20261106/shared-guest-2-390-light.png`
- `test-results/c3-induction-20261106/shared-guest-3-1280-dark.png`
- `test-results/c3-induction-20261106/shared-guest-3-1280-light.png`
- `test-results/c3-induction-20261106/shared-guest-3-390-dark.png`
- `test-results/c3-induction-20261106/shared-guest-3-390-light.png`
- `test-results/c3-induction-20261106/shared-student-0-1280-dark.png`
- `test-results/c3-induction-20261106/shared-student-0-1280-light.png`
- `test-results/c3-induction-20261106/shared-student-0-390-dark.png`
- `test-results/c3-induction-20261106/shared-student-0-390-light.png`
- `test-results/c3-induction-20261106/shared-teacher-0-1280-dark.png`
- `test-results/c3-induction-20261106/shared-teacher-0-1280-light.png`
- `test-results/c3-induction-20261106/shared-teacher-0-390-dark.png`
- `test-results/c3-induction-20261106/shared-teacher-0-390-light.png`
- `test-results/c3-induction-20261106/solution-1280-dark.png`
- `test-results/c3-induction-20261106/solution-1280-light.png`
- `test-results/c3-induction-20261106/solution-390-dark.png`
- `test-results/c3-induction-20261106/solution-390-light.png`
- `test-results/c3-induction-20261106/sums-1280-dark.png`
- `test-results/c3-induction-20261106/sums-1280-light.png`
- `test-results/c3-induction-20261106/sums-390-dark.png`
- `test-results/c3-induction-20261106/sums-390-light.png`
