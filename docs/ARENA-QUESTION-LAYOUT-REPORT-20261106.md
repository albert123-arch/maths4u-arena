# Оформление письменных вопросов — локальная правка

6 ноября 2026, `D:\www\arena`, только локальный предпросмотр.

## Причина и результат

В письменном каталоге развёрнутое условие оставалось в узкой колонке
заголовка, рядом с категорией, баллами и закладкой. Обработчик безопасного
HTML также удалял type="a" и классы оформления подпунктов/баллов.
Поэтому каталожная версия выглядела иначе, чем учебный режим.

Исправлено:

- Заголовок и действия остаются в строке карточки; раскрытое условие
  занимает всю доступную ширину под ней. На телефоне действия переносятся
  отдельными строками, не сжимая условие.
- Подпункты a, b, c, d сохраняются, их баллы выровнены справа у первой строки.
- Такой же вид у сохранённых отдельно подпунктов прежних авторских задач.
- Существующее сворачивание, закладки, выбор в набор, подсказки, решения
  и критерии остаются на месте.
- В sanitizer разрешены только ol type/start и классы parts/marks;
  произвольные классы, inline-style, скрипты и обработчики событий удаляются.
  Старый текстовый суффикс [n] оформляется при выводе, без изменения хранения.
- Для браузеров без ::details-content предусмотрено обычное блочное
  раскрытие. Современная сетка использует subgrid; проверен установленный Edge.

## Файлы

- `src/components/catalog-screen.tsx` — контейнер условия, отдельная область
  закладки, буквенные подпункты для separatePartPrompts.
- `src/app/components.css` — ширина раскрытой карточки и оформление подпунктов.
- `src/lib/content.ts` — ограниченное сохранение нужных атрибутов и безопасное
  оформление конечных баллов; повторный HTML-разбор только для таких списков.
- `tests/question-layout.test.ts` — безопасность HTML и сверка подпунктов/баллов
  всех пяти пакетов FP1.
- `tests/ux-browser/question-layout.spec.ts` — проверка геометрии и поведения
  каталога, учебного режима и общих страниц.
- `.github/workflows/hostinger-preview.yml` — новый unit-тест в существующей CI.
- Этот отчёт, дополнение отчёта Polar, roadmap и список файлов Polar.

## Проверки

- 30 unit/regression тестов прошли: форматирование, sanitizer, все пакеты,
  ключи ответов, критерии, π и повторение. Всего проверены подпункты 304
  письменных задач с соответствующей HTML-разметкой.
- TypeScript и ESLint изменённых TS/TSX-файлов прошли.
- Node 22 / Webpack / standalone и Hostinger artifact audit прошли.
  Linux CI, push и deploy не выполнялись.
- Каталог: 160 сочетаний пяти глав FP1, четырёх ролей, ширин
  360/390/768/1280 и светлой/тёмной темы. Буквы, правые баллы, отсутствие
  перекрытия действий с условием, полная ширина, сворачивание/раскрытие
  и отсутствие прокрутки всей страницы проверены геометрически.
- Учебный режим: восемь сочетаний ширины/темы и проверка полного ответа с π.
- Общие страницы: 56 сочетаний главной, /courses, /library, Completing the square
  и кабинетов ученика/учителя/администратора; ошибок страницы/KaTeX и переполнения нет.
- Три браузерных сценария прошли. В ходе настройки теста добавлено ожидание
  aria-busy=false: клиентское обновление каталога заменяет первоначальный SSR DOM.
  Это ожидание загрузки, не изменение поведения приложения.
- Цвета не менялись; прежние 12 проверенных пар сохраняют контраст ≥5.60:1.
- Health 200, повторный запуск пакета: skip=103, create=0, update=0, записей нет.

## Сохранность

Изменений учебных исходников или базы не было. Снимок перед правкой:
45 156 существующих строк в 63 таблицах. Итог: изменённых/пропавших 0,
расхождений LearningProgress 0. В браузерных тестах добавлялись только
локальные QA-сессии; гостевая проверка сохранялась в браузере.

Не изменялись вопросы, ключи, решения, критерии, баллы, номера версий,
состояния пакетов, архив и прогресс. Импорт задач не запускался.
Все пять глав остаются PUBLISHED только в тестовой базе на 127.0.0.1:33317.
Режим учебного урока и письменного каталога сохраняют своё назначение;
оформление самого условия приведено к одному виду.

Просмотр исправленной темы:
http://127.0.0.1:3109/courses/maths4u-9231-fp1/topics/fp1_polar_extrema?mode=WRITTEN

Без commit, push, deploy, изменений production и проекта maths4u.sbs.
Использовался фоновый headless-браузер, рабочий стол владельца не занимался.

## Скриншоты

- `test-results/question-layout-20261106/lesson-1280-dark.png`
- `test-results/question-layout-20261106/lesson-1280-light.png`
- `test-results/question-layout-20261106/lesson-390-dark.png`
- `test-results/question-layout-20261106/lesson-390-light.png`
- `test-results/question-layout-20261106/polar-admin-1280-dark.png`
- `test-results/question-layout-20261106/polar-admin-1280-light.png`
- `test-results/question-layout-20261106/polar-admin-390-dark.png`
- `test-results/question-layout-20261106/polar-admin-390-light.png`
- `test-results/question-layout-20261106/polar-diagnostic.png`
- `test-results/question-layout-20261106/polar-guest-1280-dark.png`
- `test-results/question-layout-20261106/polar-guest-1280-light.png`
- `test-results/question-layout-20261106/polar-guest-390-dark.png`
- `test-results/question-layout-20261106/polar-guest-390-light.png`
- `test-results/question-layout-20261106/shared-admin-0-1280-dark.png`
- `test-results/question-layout-20261106/shared-admin-0-1280-light.png`
- `test-results/question-layout-20261106/shared-admin-0-390-dark.png`
- `test-results/question-layout-20261106/shared-admin-0-390-light.png`
- `test-results/question-layout-20261106/shared-guest-0-1280-dark.png`
- `test-results/question-layout-20261106/shared-guest-0-1280-light.png`
- `test-results/question-layout-20261106/shared-guest-0-390-dark.png`
- `test-results/question-layout-20261106/shared-guest-0-390-light.png`
- `test-results/question-layout-20261106/shared-guest-1-1280-dark.png`
- `test-results/question-layout-20261106/shared-guest-1-1280-light.png`
- `test-results/question-layout-20261106/shared-guest-1-390-dark.png`
- `test-results/question-layout-20261106/shared-guest-1-390-light.png`
- `test-results/question-layout-20261106/shared-guest-2-1280-dark.png`
- `test-results/question-layout-20261106/shared-guest-2-1280-light.png`
- `test-results/question-layout-20261106/shared-guest-2-390-dark.png`
- `test-results/question-layout-20261106/shared-guest-2-390-light.png`
- `test-results/question-layout-20261106/shared-guest-3-1280-dark.png`
- `test-results/question-layout-20261106/shared-guest-3-1280-light.png`
- `test-results/question-layout-20261106/shared-guest-3-390-dark.png`
- `test-results/question-layout-20261106/shared-guest-3-390-light.png`
- `test-results/question-layout-20261106/shared-student-0-1280-dark.png`
- `test-results/question-layout-20261106/shared-student-0-1280-light.png`
- `test-results/question-layout-20261106/shared-student-0-390-dark.png`
- `test-results/question-layout-20261106/shared-student-0-390-light.png`
- `test-results/question-layout-20261106/shared-teacher-0-1280-dark.png`
- `test-results/question-layout-20261106/shared-teacher-0-1280-light.png`
- `test-results/question-layout-20261106/shared-teacher-0-390-dark.png`
- `test-results/question-layout-20261106/shared-teacher-0-390-light.png`
