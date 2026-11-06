# C2 — глава Rational functions

Дата: 6 ноября 2026. Проект: `D:\www\arena`.
В этом запуске выполнена только первая глава C2. После отдельной команды
владельца Rational functions **PUBLISHED локально** — см. раздел 10.
Ниже сохранён исходный отчёт подготовки черновика.

## 1. Локальный коммит C1

Создан коммит **`107d8934aadadbc571dcb32bdf08faf95a59f6c6`**
(`Add C1 FP1 roots teaching package and reusable content workflow`).
Перед коммитом программно сопоставлены индекс и разрешённый набор:
**38 файлов C1 и дорожной карты**, без посторонних файлов.
`output/`, `tmp/`, `test-results/`, `.local/`, резервные копии и базы исключены.
Сторонние незакоммиченные документы Release D / Future plan сохранены.

C2 остаётся незакоммиченным для просмотра владельцем. Push не выполнялся.

## 2. Что сделано

Добавлена глава **Rational functions** в существующий курс
`maths4u-9231-fp1`. Существующие названия и архивные главы не переименованы.
Пакет `9231-fp1-rational` версии `1.0.0` использует механизм C1:
dry-run → apply → частный предпросмотр → отдельная публикация.

Подключены **все 53 задачи владельца**, всего **639 письменных баллов**.
Отложено **0**. Дополнительно подготовлены **20 разобранных примеров** и
**40 коротких проверок** с полными ответами, свежими вариантами и повторением.
Итого пакет содержит **93 новых Task**, не новые версии задач Cambridge.

Источник только для чтения:
`E:\my folder\questions_data\original\Pure1 9231\02_Rational_functions_9231_revised.json`.
SHA-256 до и после работы:

`89ca1f448a9ae5316d72133b7876fa7f7af885a1c80f7f0cc12f92d040cda60c`.

Для каждого урока подготовлены Objective, Before you start со ссылками,
Key ideas с обоснованиями, Method, четыре Worked examples и Common mistakes.
Текст — на британском английском. Конспекты и новые примеры составлены
самостоятельно, с собственными данными и объяснениями. Учебник использован
как справочник методов; его страницы, формулировки и примеры не копировались.

### Распределение задач

| Урок | ID | Задачи владельца | Quick checks | Примеры |
|---|---|---:|---:|---:|
| Asymptotes and curve sketching | fp1_rational_asymptotes | 7 | 8 | 4 |
| Ranges and stationary points | fp1_rational_ranges | 7 | 8 | 4 |
| Parameter families and reconstruction | fp1_rational_parameters | 13 | 8 | 4 |
| Modulus and inequalities | fp1_rational_modulus | 12 | 8 | 4 |
| Relationships between curves | fp1_rational_relationships | 14 | 8 | 4 |
| **Итого** | | **53** | **40** | **20** |

Во всех пяти уроках не меньше шести письменных задач.
Короткая практика: 6 SHORT и 2 MC на урок, четыре семейства с двумя вариантами.
Проверяются целые ответы: все асимптоты, оба коэффициента, весь диапазон,
полные объединения интервалов, все стационарные пары и все исключённые входы.
Неверный или пропущенный компонент не принимается.

Для дроби в задаче о reciprocal используется существующий формат
`numerator ; denominator` и отдельное поле полного множества исключений.
Новый вычислительный движок не создавался. Применены существующие точная
алгебра, проверки интервалов, гостевые черновики и механизм повторения.

Письменные задачи имеют отдельные Hint / Worked solution / Marking guidance.
Коды M/A/B, баллы и критерии владельца сохранены, внутренний статус — DRAFT.
Самооценка остаётся отдельной от автоматических результатов и Review учителя.

## 3. Источники и редакторская нормализация

Сохранены `content_uid` владельца вида `m4u_9231_fp1_rf_<ID>_v1`.
Служебное сопоставление с архивом хранится только для администратора.
Оценка сходства не рассчитывалась, порог не применялся; сопоставление не
является утверждением о сходстве формулировок или выводом об авторстве.
Ученику и учителю не показываются provenance, исходные сессии/paper/номера.

Полная карта и хеши:
[ARENA-C2-RATIONAL-SOURCE-AUDIT-20261106.json](ARENA-C2-RATIONAL-SOURCE-AUDIT-20261106.json).

| ID | Архивный Task | Основной урок | Баллы |
|---|---|---|---:|
| 6265 | `cmu2x1wa3066n7b412hwrg98q` | Asymptotes | 14 |
| 6332 | `cmu2x1wac066s7b4123q28ofz` | Asymptotes | 8 |
| 5810 | `cmu2x1wmc067w7b41qjtaw3hm` | Asymptotes | 9 |
| 5862 | `cmu2x1wxb068i7b41x2fx137c` | Asymptotes | 8 |
| 6447 | `cmu2x1xf4069i7b41j3849vyr` | Asymptotes | 9 |
| 6583 | `cmu2x1xq2069y7b41py0bvh2d` | Asymptotes | 8 |
| 6592 | `cmu2x1xqc06a37b4150c364n7` | Asymptotes | 8 |
| 6346 | `cmu2x1wak066x7b41y091vvf1` | Ranges | 10 |
| 6360 | `cmu2x1war06727b411g2j6cef` | Ranges | 12 |
| 6226 | `cmu2x1wxq068s7b418tk4q812` | Ranges | 10 |
| 6367 | `cmu2x1xeg06937b41gu6dcmog` | Ranges | 7 |
| 6378 | `cmu2x1xen06987b410czqlqva` | Ranges | 7 |
| 6395 | `cmu2x1xew069d7b41rfjb36dh` | Ranges | 13 |
| 6301 | `cmu2x1ycd06be7b41s4rzzudg` | Ranges | 11 |
| 4162 | `cmu2x1wb106777b41przle5ok` | Parameters | 15 |
| 4169 | `cmu2x1wli067d7b410i035uzi` | Parameters | 15 |
| 5831 | `cmu2x1wml06827b41cdjlud8i` | Parameters | 9 |
| 5840 | `cmu2x1wws06887b410b3h1oo6` | Parameters | 7 |
| 5853 | `cmu2x1wx4068d7b4127ib2h0p` | Parameters | 9 |
| 5875 | `cmu2x1wxj068n7b41wcg8k7ay` | Parameters | 9 |
| 6279 | `cmu2x1xe5068y7b41rpx28k6h` | Parameters | 14 |
| 6460 | `cmu2x1xpb069o7b41vzk4z66e` | Parameters | 10 |
| 6509 | `cmu2x1xpq069t7b4161jnj2eb` | Parameters | 14 |
| 6287 | `cmu2x1y1x06b87b4181fge5jy` | Parameters | 11 |
| 6475 | `cmu2x1yco06bj7b411o6puxsp` | Parameters | 14 |
| 4127 | `cmu2x1yd906by7b41syflp5ux` | Parameters | 14 |
| 4241 | `cmu2x1zai06du7b41kdatk03v` | Parameters | 10 |
| 5806 | `cmu2x1wm0067n7b41pkbmxnxb` | Modulus | 12 |
| 4252 | `cmu2x1y0j06ae7b41274affk9` | Modulus | 16 |
| 5808 | `cmu2x1y0t06aj7b41973p3qts` | Modulus | 6 |
| 5887 | `cmu2x1y1606aq7b41fev591y5` | Modulus | 14 |
| 4113 | `cmu2x1ycw06bo7b411zs5ki6m` | Modulus | 15 |
| 4121 | `cmu2x1yd306bt7b41f7z5vpr3` | Modulus | 15 |
| 4204 | `cmu2x1yzl06d47b41ngbkl6hc` | Modulus | 15 |
| 4211 | `cmu2x1yzs06d97b41ndozp4zv` | Modulus | 15 |
| 4239 | `cmu2x1zab06dp7b41ysvoc0us` | Modulus | 6 |
| 4259 | `cmu2x1zar06dz7b41wc70lp3u` | Modulus | 15 |
| 4273 | `cmu2x1zaz06e47b4165730gqh` | Modulus | 14 |
| 4280 | `cmu2x1zl106ea7b4168pjpexh` | Modulus | 15 |
| 4266 | `cmu2x1wlp067i7b41qkg7re46` | Related curves | 15 |
| 4191 | `cmu2x1xqk06a87b411pocqi5s` | Related curves | 16 |
| 5894 | `cmu2x1y1k06az7b41hjzwfxj6` | Related curves | 14 |
| 4135 | `cmu2x1ynx06c47b41twjfbl3o` | Related curves | 16 |
| 4141 | `cmu2x1yod06c97b4149gdgvps` | Related curves | 13 |
| 4148 | `cmu2x1yom06ce7b41fkec8aem` | Related curves | 15 |
| 4155 | `cmu2x1yov06cj7b418z7h6ey9` | Related curves | 13 |
| 4176 | `cmu2x1yp206co7b41h7csuv5s` | Related curves | 13 |
| 4184 | `cmu2x1yz506cu7b41d12vkeme` | Related curves | 15 |
| 4198 | `cmu2x1yzf06cz7b41url50dv3` | Related curves | 15 |
| 4219 | `cmu2x1z0006de7b419o0wggzk` | Related curves | 13 |
| 4236 | `cmu2x1za206dk7b41rmta3ocl` | Related curves | 12 |
| 4286 | `cmu2x1zle06ef7b41uffxa5ra` | Related curves | 14 |
| 5824 | `cmu2x1zlq06ek7b41zxc0hsms` | Related curves | 12 |

Изменены только три ошибочных разделителя команд TeX в условиях:

| ID | Было | Стало |
|---|---|---|
| 4191 | `\gtf(x)` | `\gt f(x)` |
| 4184 | `\ltf(x)` | `\lt f(x)` |
| 4198 | `\gtf(x)` | `\gt f(x)` |

Это исправление отображения; математический смысл, ответы, баллы и критерии
не менялись. Файлы владельца не редактировались.
Ссылки на рисунки заменены адресами защищённого хранилища приложения.

## 4. Рисунки и защита решений

В исходных условиях нет изображений. Все **81 новый график** относятся
к решениям. Папки images рядом с JSON нет; рисунки извлечены из предоставленного
`9231_Chapter_02_Teacher_Review.html`.

Перед извлечением сопоставлены все **53 текста условий** HTML с JSON,
затем проверены принадлежность article ID, порядок, подписи и число рисунков.
SHA-256 каждого исходного SVG и конечного PNG записан в source audit.
Встроенные SVG проверены на скрипты и внешние ссылки.
Исходные SVG не менялись; для штатного хранилища получены PNG шириной
1600 px, всего **6 110 356 байт**. Все 81 диаграмма просмотрены на шести
контактных листах. **11 архивных исходных изображений** из preserved_assets
не включены в новый пакет.

Механизм пакетов расширен необязательными проверяемыми assets:

- Dry-run читает и сверяет хеши/размеры, не пишет в хранилище.
- Apply создаёт StoredFile и TaskAsset роли **SOLUTION** с устойчивыми ID.
  Новые байты хранятся вне public. Существующие файлы не перезаписываются.
- В TaskVersion остаётся собственная связь с рисунками; старые версии и файлы
  сохраняются при обновлении. Повтор применения не создаёт файлы заново.
- Гость получает изображение только через подписанное разрешение после
  открытия решения. Разрешение связано с файлом, версией, ролью и пользователем.
  Чужой токен не открывает другой файл или файл другому вошедшему пользователю.
- Прямые гостевые ссылки на все **81** файла дают 404.
  После запроса решения все 81 изображения проверены по HTTP: PNG, статус 200.
- Исходный JSON и PNG под `/content/original/…` дают 404. Это приватные
  файлы приложения, а не публичная статика.
- PNG включены в standalone и dist; для всех 81 файла в обоих артефактах
  проверены хеши. Новых флагов деплоя не требуется.

Пакет Roots не изменился: его прежний fingerprint и маркер применения
распознаются, повторный dry-run возвращает 94 skip без новых версий.

## 5. Математика и проверки

Журнал:
[ARENA-C2-RATIONAL-MATH-CHECKS-20261106.json](ARENA-C2-RATIONAL-MATH-CHECKS-20261106.json).

| Группа | Проверок | Результат |
|---|---:|---|
| Утверждения в 53 задачах владельца | 435 | PASS |
| Новые 20 разобранных примеров | 50 | PASS |
| Поля 40 коротких проверок | 52 | PASS |
| Суммы критериев 93 задач | 93 | PASS |
| **Итого** | **630** | **Ошибок 0** |

Проверены точные асимптоты, стационарные точки и их классификация, полные
диапазоны, интервалы неравенств, исключения reciprocal, действительные
ветви квадратного корня, вырожденные члены семейств и особые уровни.
Отдельно проверено включение `x=±2` в буквальное неравенство задачи 4280:
ограничения вспомогательной дроби не перенесены в исходное неравенство.

**Ошибок в математических ответах задач владельца не выявлено.**
Журнал фиксирует проверенные утверждения; автоматические проверки не заменяют
оценку качества всех объяснений преподавателем.
Математические ответы владельца молча не исправлялись.

| Техническая проверка | Результат |
|---|---|
| Unit/regression: C1/C2, полные ключи, интервалы, повторение, происхождение и view lens | 22/22 |
| Локальная интеграция C2: dry-run, запрет учителю, stale token, импорт, повтор, защищённые файлы, гостевые проверки, прогресс, archive/restore | 1/1 |
| Playwright: пять уроков, гостевой сценарий и общие страницы/кабинеты | 3/3 |
| Адаптивная матрица: 40 случаев главы + 56 общих страниц | 96/96 |
| Представление решения с графиком и критериями | 390/1280, обе темы, без переполнения |
| Контраст текста/фона | 12 пар, минимум 5.6:1, все ≥ 4.5:1 |
| TypeScript и ESLint изменённых TS/JS | PASS |
| Production build на Node 22 / Webpack / standalone | PASS, локальная Windows |
| Аудит 23 743 файлов dist и клиентского JS | PASS, секретов и служебного содержимого в клиентском JS не обнаружено |
| `git diff --check` | PASS |
| Локальный health | 200 |
| Презентации прежних уроков | 59 админу; 33 маршрута учителя — 404 |

Ширины: 1280, 390, 360 и 768 px, светлая и тёмная темы.
Нет горизонтальной прокрутки и обрезанных кнопок; KaTeX без ошибок.
В браузере проверены неверный/полный ответ, восстановление после reload,
свежий вариант, дробь вместе со всеми исключениями, письменная самооценка
и реальная загрузка всех графиков.

CI дополнен тестами C2 и математическим скриптом с закреплённой зависимостью
ANTLR. Удалённый Linux CI не запускался: push не разрешён.

### Команды проверки

```powershell
python scripts/content/verify-fp1-rational.py --owner 'E:\my folder\questions_data\original\Pure1 9231\02_Rational_functions_9231_revised.json' --report docs/ARENA-C2-RATIONAL-MATH-CHECKS-20261106.json
& '.local/node22/node.exe' --import tsx --test tests/content-rational.test.ts tests/content-packages.test.ts tests/square-learning.test.ts tests/quadratics-learning.test.ts tests/view-lens.test.ts tests/content-stage6b.test.ts
& '.local/node22/node.exe' scripts/content-package-local.mjs --import tsx --test tests/content-rational-local.test.ts
$env:ARENA_UX_BASE_URL='http://127.0.0.1:3109'
& '.local/node22/node.exe' node_modules/@playwright/test/cli.js test --config=playwright.ux.config.ts tests/ux-browser/content-c2-rational.spec.ts
```

Последние два теста временно публикуют только Rational на локальной базе и
возвращают его в DRAFT; опубликованный Roots не переключают. Тесты C1,
которые намеренно возвращают Roots в DRAFT, в этом запуске не выполнялись.

## 6. Старый банк и прогресс

Переиспользована существующая локальная база
`maths4u_test_bank_c1_1cf6766c2a4d` на `127.0.0.1:33317`, MATHS4U_ENV=test.
Новая база и копия проекта не создавались. Рабочий сервер не подключался.

До C2 снят хеш каждого из **40 920 существующих рядов в 63 таблицах**.
Полная сверка:

- **40 918 / 40 920** прежних рядов идентичны по SHA-256.
- Различаются 2 записи LearningProgress синтетического `qa_c1_admin` для `fp1_roots_coefficients`, `fp1_roots_mixed`. Это действующий локальный сеанс просмотра; текущее completed = false. Эти записи не откатывались.
- Остальные строки, включая результаты реальных учеников, старые ответы, проверки, Review, классы, работы и профили, совпадают с исходным снимком. Необъяснённых изменений — **0**.
- Частный журнал содержит исходные хеши и явные исключения QA: `.local/c2-rational-20261106/preservation.json`. Совпадение всех 40 920 хешей не заявляется.

Ни один прежний Task, TaskVersion, пользователь, класс, работа, ответ,
IndependentCheck или Review не удалён и не заменён. Никакие изменения
активного тестового сеанса не откатывались ради совпадения хешей.

Итоговые количества:

| Показатель | Значение |
|---|---:|
| Task до C2 → после C2 | 3444 → 3537 (+93) |
| TaskVersion до C2 → после C2 | 3488 → 3581 (+93) |
| UNKNOWN | 0 |
| Презентации | 59 |
| Маркер Rational 1.0.0 | 1 |
| Roots | PUBLISHED |
| Rational functions | DRAFT |
| Гостевой каталог в итоговом состоянии | 782 |

При временной тестовой публикации Rational каталог содержал 875 задач,
после archive/restore — снова 782. Повтор применения пакета не изменил
число версий, файлов и AuditEvent.
Исходные 13 реальных пользователей и три прежних QA-аккаунта сохранены;
новых аккаунтов для C2 не создавалось.
Свободное место после сборки: C: **37.11 GiB**, D: **141.79 GiB**.

## 7. Изменённые файлы

Точный список для будущего отдельного коммита этой главы:
[ARENA-C2-RATIONAL-FILES-20261106.json](ARENA-C2-RATIONAL-FILES-20261106.json).
Это только разрешённые файлы C2 и дорожная карта, без `output/`, `tmp/`,
`test-results/`, `.local/` и сторонних документов.

Всего 105 файлов, из них 81 PNG.

- `.github/workflows/hostinger-preview.yml`
- `content/original/9231-fp1/rational-owner-verification-v1.json`
- `content/original/9231-fp1/rational-quick-verification-v1.json`
- `content/original/9231-fp1/rational-v1.json`
- `docs/ARENA-C2-RATIONAL-FILES-20261106.json`
- `docs/ARENA-C2-RATIONAL-MATH-CHECKS-20261106.json`
- `docs/ARENA-C2-RATIONAL-REPORT-20261106.md`
- `docs/ARENA-C2-RATIONAL-SOURCE-AUDIT-20261106.json`
- `docs/CODEX-ARENA-ROADMAP-20261105.md`
- `docs/CONTENT-PACKAGES.md`
- `next.config.ts`
- `scripts/content/fp1_rational_teaching.py`
- `scripts/content/prepare-fp1-rational.py`
- `scripts/content/verify-fp1-rational.py`
- `scripts/package-hostinger.mjs`
- `src/lib/content-package-assets.ts`
- `src/lib/content-package-content.ts`
- `src/lib/content-package-schema.ts`
- `src/lib/content-packages.ts`
- `src/lib/question-support.ts`
- `src/lib/square-learning.ts`
- `tests/content-rational-local.test.ts`
- `tests/content-rational.test.ts`
- `tests/ux-browser/content-c2-rational.spec.ts`
- `content/original/9231-fp1/rational-assets/` — 81 PNG; точные пути и хеши перечислены в manifest/source audit.

Исходники и журналы QA в `.local/c2-rational-20261106/` не предназначены
для git. Секреты не выводились и не включались в пакет или документацию.

## 8. Скриншоты

Основные:

- `test-results/c2-rational-20261106/chapter-preview.png` — глава, 1280 px.
- `test-results/c2-rational-20261106/mobile-first-screen.png` — первый экран, 390 px.
- `test-results/c2-rational-20261106/solution-390-light.png` — решение с графиком и критериями.
- `test-results/c2-rational-20261106/solution-390-dark.png` — тот же сценарий в тёмной теме.

Полный список:

- `test-results/c2-rational-20261106/asymptotes-1280-dark.png`
- `test-results/c2-rational-20261106/asymptotes-1280-light.png`
- `test-results/c2-rational-20261106/asymptotes-390-dark.png`
- `test-results/c2-rational-20261106/asymptotes-390-light.png`
- `test-results/c2-rational-20261106/chapter-preview.png`
- `test-results/c2-rational-20261106/mobile-first-screen.png`
- `test-results/c2-rational-20261106/modulus-1280-dark.png`
- `test-results/c2-rational-20261106/modulus-1280-light.png`
- `test-results/c2-rational-20261106/modulus-390-dark.png`
- `test-results/c2-rational-20261106/modulus-390-light.png`
- `test-results/c2-rational-20261106/parameters-1280-dark.png`
- `test-results/c2-rational-20261106/parameters-1280-light.png`
- `test-results/c2-rational-20261106/parameters-390-dark.png`
- `test-results/c2-rational-20261106/parameters-390-light.png`
- `test-results/c2-rational-20261106/ranges-1280-dark.png`
- `test-results/c2-rational-20261106/ranges-1280-light.png`
- `test-results/c2-rational-20261106/ranges-390-dark.png`
- `test-results/c2-rational-20261106/ranges-390-light.png`
- `test-results/c2-rational-20261106/relationships-1280-dark.png`
- `test-results/c2-rational-20261106/relationships-1280-light.png`
- `test-results/c2-rational-20261106/relationships-390-dark.png`
- `test-results/c2-rational-20261106/relationships-390-light.png`
- `test-results/c2-rational-20261106/shared-admin-0-1280-dark.png`
- `test-results/c2-rational-20261106/shared-admin-0-1280-light.png`
- `test-results/c2-rational-20261106/shared-admin-0-390-dark.png`
- `test-results/c2-rational-20261106/shared-admin-0-390-light.png`
- `test-results/c2-rational-20261106/shared-guest-0-1280-dark.png`
- `test-results/c2-rational-20261106/shared-guest-0-1280-light.png`
- `test-results/c2-rational-20261106/shared-guest-0-390-dark.png`
- `test-results/c2-rational-20261106/shared-guest-0-390-light.png`
- `test-results/c2-rational-20261106/shared-guest-1-1280-dark.png`
- `test-results/c2-rational-20261106/shared-guest-1-1280-light.png`
- `test-results/c2-rational-20261106/shared-guest-1-390-dark.png`
- `test-results/c2-rational-20261106/shared-guest-1-390-light.png`
- `test-results/c2-rational-20261106/shared-guest-2-1280-dark.png`
- `test-results/c2-rational-20261106/shared-guest-2-1280-light.png`
- `test-results/c2-rational-20261106/shared-guest-2-390-dark.png`
- `test-results/c2-rational-20261106/shared-guest-2-390-light.png`
- `test-results/c2-rational-20261106/shared-guest-3-1280-dark.png`
- `test-results/c2-rational-20261106/shared-guest-3-1280-light.png`
- `test-results/c2-rational-20261106/shared-guest-3-390-dark.png`
- `test-results/c2-rational-20261106/shared-guest-3-390-light.png`
- `test-results/c2-rational-20261106/shared-student-0-1280-dark.png`
- `test-results/c2-rational-20261106/shared-student-0-1280-light.png`
- `test-results/c2-rational-20261106/shared-student-0-390-dark.png`
- `test-results/c2-rational-20261106/shared-student-0-390-light.png`
- `test-results/c2-rational-20261106/shared-teacher-0-1280-dark.png`
- `test-results/c2-rational-20261106/shared-teacher-0-1280-light.png`
- `test-results/c2-rational-20261106/shared-teacher-0-390-dark.png`
- `test-results/c2-rational-20261106/shared-teacher-0-390-light.png`
- `test-results/c2-rational-20261106/solution-1280-dark.png`
- `test-results/c2-rational-20261106/solution-1280-light.png`
- `test-results/c2-rational-20261106/solution-390-dark.png`
- `test-results/c2-rational-20261106/solution-390-light.png`
- `test-results/c2-rational-20261106/figures-1.jpg`
- `test-results/c2-rational-20261106/figures-2.jpg`
- `test-results/c2-rational-20261106/figures-3.jpg`
- `test-results/c2-rational-20261106/figures-4.jpg`
- `test-results/c2-rational-20261106/figures-5.jpg`
- `test-results/c2-rational-20261106/figures-6.jpg`

Матрицы и проверки:
`test-results/c2-rational-20261106/responsive.json`,
`test-results/c2-rational-20261106/shared-pages.json`,
`test-results/c2-rational-20261106/guest-flow.json`,
`test-results/c2-rational-20261106/contrast.json`.

## 9. Предпросмотр и оставшиеся действия

**Глава:** http://127.0.0.1:3109/admin/content-packages/9231-fp1-rational

**Первый урок:**
http://127.0.0.1:3109/admin/content-packages/9231-fp1-rational/preview/fp1_rational_asymptotes

Сервер оставлен работающим на порту 3109. Для входа используется прежний
локальный сеанс администратора. При необходимости повторного запуска из
`D:\www\arena`:

```powershell
& '.local/node22/node.exe' scripts/content-package-local.mjs server.js
```

Rational пока не опубликован: сначала просмотр владельцем, затем отдельное
Publish chapter. Roots остаётся опубликованным локально.
Нужна оценка ясности конспектов и примеров; технических блокирующих вопросов нет.
После оценки можно продолжать C2 со следующей главой Summation of series.

Остальные главы C2, C3–C5 и будущие этапы не начаты. AI-проверка письменных
решений, реклама, платежи и видео не подключались.
**Без push, deploy и изменений production-базы. Файлы и база maths4u.sbs
не затронуты.**

## 10. Локальная публикация по команде владельца — 6 ноября 2026

Выполнено штатное Publish chapter для `9231-fp1-rational` через локальный
административный API. Перед этим запущены остановленные сервер предпросмотра
и существующая MariaDB с прежними данными.

- Состояние Rational functions — **PUBLISHED**; доступны все 93 задачи
  (53 письменные и 40 коротких проверок).
- Глава и все пять уроков открываются гостю с HTTP 200.
- Проверена загрузка графика после открытия решения — PNG, HTTP 200.
- Гостевой каталог — **875** задач; health — **200**; UNKNOWN — **0**.
- Повторного импорта нет: маркер пакета версии 1.0.0 по-прежнему один.
- Roots осталась PUBLISHED, её запись состояния не изменилась.
- Непосредственно до и после публикации сверены **37 600 существующих рядов
  в 59 таблицах**, включая пользователей, версии содержания, ответы и прогресс:
  изменений нет. Таблицы состояния публикации в эту сверку не включались.

Журнал операции: `.local/c2-rational-20261106/owner-publication.json`
(игнорируется git).

Публичная локальная ссылка:
http://127.0.0.1:3109/courses/maths4u-9231-fp1?chapter=fp1_rational

Без push, deploy и изменений рабочей базы.
