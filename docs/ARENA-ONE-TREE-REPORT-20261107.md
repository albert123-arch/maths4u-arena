# Arena One Tree — отчёт 7 ноября 2026

Изменения проверены локально. Владелец 7 ноября отдельно разрешил push и deploy; результаты публикации записываются в `ARENA-CONTENT-DEPLOY-20261107.md`.

## Что сделано

Завершена глава Linear motion under a variable force, локальный коммит `afcc0c0`. Обычное дерево четырёх курсов 9231 теперь одинаково для администратора и ученика: новые главы, без старых дубликатов. По последнему решению владельца Cambridge вынесен **в отдельный раздел Admin → Cambridge question archive**. Источник не занимает место в обычных уроках. Курсы 9709 Pure 1 и Book 2 сохранены.

Три отдельные таблицы размещения сохраняют исходные Topic, Lesson, LessonTask, Task и все версии. Каждая архивная задача имеет единственное размещение в пределах курса. По точному provenance 1159 задач сопоставлены с уроками адаптаций. Предлагаемые резервные соответствия ниже **не утверждены и не применены**. 63 задачи Induction остаются в «Unallocated»; 39 Momentum — в архиве без новой главы. Добавление нового пакета автоматически обновляет уже включённый слой архива в одной транзакции.

Новые адаптации владельца остаются ORIGINAL и опубликованными. Сходство с источником не запускает скрытие. Служебные связи источника видны только администратору. Для старых архивных URL администратор получает 307 в приватный архив, остальные — 404. Ограничения существующих Work не изменены; будущий конструктор F1 не внедрялся.

## Числа на основной локальной тестовой базе

| Курс | Архив | Точное размещение | Не распределено | Только архив | Новые главы / уроки |
|---|---:|---:|---:|---:|---:|
| maths4u-9231-statistics | 217 | 217 | 0 | 0 | 5 / 24 |
| maths4u-9231-fp1 | 413 | 350 | 63 | 0 | 7 / 33 |
| maths4u-9231-fp2 | 390 | 390 | 0 | 0 | 6 / 35 |
| maths4u-9231-mechanics | 241 | 202 | 0 | 39 | 5 / 20 |

Гость, ученик и учитель: до/после **2857 задач, 6 курсов, 163 урока**. Обычный администратор: **2857 авторских задач**, тот же каталог. Приватный архив: **2654 задачи** (1261 Further и 1393 Add Maths). Администратор с `source=ALL`: **5511 доступных задач**. Всего локальных Task 5519, включая 8 тестовых/недоступных записей.

## Таблицы старый урок → новый урок для утверждения

«Точно» показывает фактическое распределение по provenance; один старый урок может разойтись по нескольким новым. «Предложение» — только запасной маршрут, до утверждения не используется. Числа считаются по единственным размещениям задач, а не по числу адаптаций.

### Further Pure Mathematics 1

| Старый урок | Задач | Точно → новый урок | Не распределено / архив | Предложение, не утверждено |
|---|---:|---|---:|---|
| Proof by induction · End-of-chapter review exercise 7 | 0 | — | 0 | — |
| Proof by induction · Proof by induction for divisibility | 17 | — | 17 | Building an induction proof |
| Proof by induction · Cross-topic review exercise 1 | 1 | — | 1 | — |
| Proof by induction · The inductive process | 45 | — | 45 | Divisibility and a complete inductive argument |
| Cross-Topic Revision · 2021 Paper1 | 0 | — | 0 | — |
| Cross-Topic Revision · Cross-Topic Revision Exercise 1 | 0 | — | 0 | — |
| Cross-Topic Revision · 2022 Paper1 | 0 | — | 0 | — |
| Cross-Topic Revision · 9231_2020_p11 | 0 | — | 0 | — |
| Matrices 1 · Matrix transformations | 16 | Invariant sets and maps in space: 5; Building plane transformations: 4; Determinants, restrictions and scale: 3; Undoing matrix equations: 2; Working with matrix products: 2 | 0 | Invariant sets and maps in space |
| Matrices 1 · The inverse matrix | 1 | Undoing matrix equations: 1 | 0 | Undoing matrix equations |
| Matrices 1 · Determinants | 0 | — | 0 | Determinants, restrictions and scale |
| Matrices 1 · Matrix operations | 3 | Undoing matrix equations: 1; Working with matrix products: 1; Determinants, restrictions and scale: 1 | 0 | Working with matrix products |
| Matrices 1 · End-of-chapter review exercise 4 | 0 | — | 0 | — |
| Vectors · Planes | 77 | Parameters and exceptional configurations: 16; Angles, projections and distances: 18; Describing and intersecting planes: 18; Lines and common perpendiculars: 21; Vector products, orientation and area: 4 | 0 | Lines and common perpendiculars |
| Vectors · End-of-chapter review exercise 6 | 3 | Vector products, orientation and area: 3 | 0 | Vector products, orientation and area |
| Vectors · Vector equation of a line | 3 | Lines and common perpendiculars: 2; Parameters and exceptional configurations: 1 | 0 | Lines and common perpendiculars |
| Vectors · The vector product rule | 1 | Vector products, orientation and area: 1 | 0 | Vector products, orientation and area |
| Roots of polynomial equations · Quadratics | 0 | — | 0 | Roots and coefficients of quadratic, cubic and quartic equations |
| Roots of polynomial equations · Quartics | 10 | Transforming equations by substitution: 7; Symmetric functions of roots and power sums: 2; Roots and coefficients of quadratic, cubic and quartic equations: 1 | 0 | Transforming equations by substitution |
| Roots of polynomial equations · End-of-chapter review exercise 1 | 0 | — | 0 | — |
| Roots of polynomial equations · Cubics | 52 | Transforming equations by substitution: 23; Mixed problems: 14; Roots and coefficients of quadratic, cubic and quartic equations: 6; Symmetric functions of roots and power sums: 9 | 0 | Transforming equations by substitution |
| Roots of polynomial equations · Substitutions | 0 | — | 0 | Transforming equations by substitution |
| Summation of series · The summation formulae ОЈr, ОЈr^2, ОЈr^3 | 53 | Telescoping sums from differences: 22; Using power sums and finite limits: 14; Convergence, remainders and bounds: 11; Deriving power-sum formulae: 6 | 0 | Telescoping sums from differences |
| Summation of series · Converging series | 15 | Convergence, remainders and bounds: 10; Telescoping sums from differences: 5 | 0 | Convergence, remainders and bounds |
| Summation of series · End-of-chapter review exercise 3 | 0 | — | 0 | — |
| Polar coordinates · End-of-chapter review exercise 5 | 0 | — | 0 | — |
| Polar coordinates · Applications of polar coordinates | 62 | Distances, tangents and extreme points: 14; Sketching admissible polar curves: 12; Connecting polar and Cartesian forms: 11; Intersections and changing boundaries: 14; Polar areas and composite regions: 11 | 0 | Intersections and changing boundaries |
| Polar coordinates · The polar system | 1 | Connecting polar and Cartesian forms: 1 | 0 | Connecting polar and Cartesian forms |
| Rational functions · Oblique asymptotes | 20 | Parameter families and reconstruction: 9; Relationships between curves: 1; Modulus and inequalities: 1; Asymptotes and curve sketching: 5; Ranges and stationary points: 4 | 0 | Parameter families and reconstruction |
| Rational functions · End-of-chapter review exercise 2 | 0 | — | 0 | — |
| Rational functions · Vertical asymptotes | 4 | Asymptotes and curve sketching: 2; Ranges and stationary points: 2 | 0 | Asymptotes and curve sketching |
| Rational functions · Relationships between curves | 21 | Modulus and inequalities: 8; Parameter families and reconstruction: 2; Relationships between curves: 11 | 0 | Relationships between curves |
| Rational functions · Inequalities | 8 | Relationships between curves: 2; Modulus and inequalities: 3; Parameter families and reconstruction: 2; Ranges and stationary points: 1 | 0 | Modulus and inequalities |
### Further Pure Mathematics 2

| Старый урок | Задач | Точно → новый урок | Не распределено / архив | Предложение, не утверждено |
|---|---:|---|---:|---|
| Complex numbers · Powers of sine and cosine | 14 | Multiple angles and exact polynomial roots: 9; Power identities and trigonometric integrals: 4; Complex powers, rotations and root arguments: 1 | 0 | Multiple angles and exact polynomial roots |
| Complex numbers · End-of-chapter review exercise 23 | 0 | — | 0 | — |
| Complex numbers · The roots of unity | 5 | Roots of unity, root polygons and parameter cases: 4; Multiple angles and exact polynomial roots: 1 | 0 | Roots of unity, root polygons and parameter cases |
| Complex numbers · de Moivre's theorem | 32 | Multiple angles and exact polynomial roots: 10; Complex powers, rotations and root arguments: 5; Finite, binomial and convergent complex sums: 2; Power identities and trigonometric integrals: 10; Roots of unity, root polygons and parameter cases: 5 | 0 | Multiple angles and exact polynomial roots |
| Complex numbers · Complex summations | 8 | Finite, binomial and convergent complex sums: 8 | 0 | Finite, binomial and convergent complex sums |
| Hyperbolic functions · End-of-chapter review exercise 19 | 0 | — | 0 | — |
| Hyperbolic functions · Hyperbolic identities | 3 | Mixed problems and later-topic extensions: 3 | 0 | Mixed problems and later-topic extensions |
| Hyperbolic functions · Logarithmic form for inverse hyperbolic functions | 0 | — | 0 | Inverse functions and principal branches |
| Hyperbolic functions · Inverse hyperbolic functions | 0 | — | 0 | Inverse functions and principal branches |
| Hyperbolic functions · Exponential forms of hyperbolic functions | 3 | Mixed problems and later-topic extensions: 3 | 0 | Mixed problems and later-topic extensions |
| Integration · Arc length and surface areas | 40 | Curved surfaces of revolution: 20; Arc length in Cartesian, parametric and polar form: 19; Further integration techniques: 1 | 0 | Curved surfaces of revolution |
| Integration · End-of-chapter review exercise 22 | 0 | — | 0 | — |
| Integration · Integration techniques | 9 | Trigonometric and hyperbolic reductions: 3; Further integration techniques: 5; Curved surfaces of revolution: 1 | 0 | Further integration techniques |
| Integration · Limits of areas | 20 | Rectangle estimates, sums and limits: 20 | 0 | Rectangle estimates, sums and limits |
| Integration · Reduction formulae | 40 | Algebraic and exponential reduction formulae: 28; Trigonometric and hyperbolic reductions: 12 | 0 | Algebraic and exponential reduction formulae |
| Differentiation · Parametric equations | 12 | Parametric gradients and concavity: 10; Mixed problems and later-topic links: 2 | 0 | Parametric gradients and concavity |
| Differentiation · End-of-chapter review exercise 21 | 0 | — | 0 | — |
| Differentiation · Hyperbolic and inverse functions | 6 | Hyperbolic and inverse-function derivatives: 2; Implicit first and second derivatives: 1; Mixed problems and later-topic links: 2; Stationary points and local geometry: 1 | 0 | Hyperbolic and inverse-function derivatives |
| Differentiation · Maclaurin series | 15 | Maclaurin polynomials and approximations: 13; Mixed problems and later-topic links: 2 | 0 | Maclaurin polynomials and approximations |
| Differentiation · Implicit functions | 44 | Implicit first and second derivatives: 17; Mixed problems and later-topic links: 8; Hyperbolic and inverse-function derivatives: 5; Parametric gradients and concavity: 4; Stationary points and local geometry: 10 | 0 | Implicit first and second derivatives |
| Differential equations · First order differential equations | 16 | Linear first-order equations and models: 15; Substitutions, real branches and transformed conditions: 1 | 0 | Linear first-order equations and models |
| Differential equations · Substitution methods for differential equations | 8 | Substitutions, real branches and transformed conditions: 7; Linear first-order equations and models: 1 | 0 | Substitutions, real branches and transformed conditions |
| Differential equations · Second order differential equations: The inhomogeneous case | 33 | Oscillatory forcing, resonance and long-term behaviour: 17; Polynomial and exponential particular integrals: 11; Complementary functions and initial conditions: 2; Substitutions, real branches and transformed conditions: 2; Linear first-order equations and models: 1 | 0 | Oscillatory forcing, resonance and long-term behaviour |
| Differential equations · End-of-chapter review exercise 24 | 0 | — | 0 | — |
| Differential equations · Cross-topic review exercise 4 | 0 | — | 0 | — |
| Differential equations · Second order differential equations: The homogeneous case | 12 | Polynomial and exponential particular integrals: 6; Complementary functions and initial conditions: 4; Substitutions, real branches and transformed conditions: 2 | 0 | Polynomial and exponential particular integrals |
| Matrices 2 · Diagonalisation | 13 | Mixed matrix applications: 6; Diagonalisation and matrix powers: 3; Characteristic equations and CayleyвЂ“Hamilton: 2; Reconstruction and similarity: 2 | 0 | Mixed matrix applications |
| Matrices 2 · Eigenvalues and eigenvectors | 33 | Eigenvalue algebra from the definition: 12; Reconstruction and similarity: 5; Characteristic equations and CayleyвЂ“Hamilton: 2; Eigenvalues and eigenvectors: 6; Diagonalisation and matrix powers: 6; Mixed matrix applications: 2 | 0 | Eigenvalue algebra from the definition |
| Matrices 2 · Systems of equations | 15 | Systems, consistency and geometry: 13; Mixed matrix applications: 2 | 0 | Systems, consistency and geometry |
| Matrices 2 · End-of-chapter review exercise 20 | 0 | — | 0 | — |
| Matrices 2 · Matrix algebra | 9 | Mixed matrix applications: 2; Characteristic equations and CayleyвЂ“Hamilton: 4; Systems, consistency and geometry: 3 | 0 | Characteristic equations and CayleyвЂ“Hamilton |
### Further Mechanics

| Старый урок | Задач | Точно → новый урок | Не распределено / архив | Предложение, не утверждено |
|---|---:|---|---:|---|
| Equilibrium of a rigid body · The moment of a force | 1 | Moments, support reactions and composite rods: 1 | 0 | Moments, support reactions and composite rods |
| Equilibrium of a rigid body · Centres of mass of rods and laminas | 19 | Moments, support reactions and composite rods: 6; Plane laminas, suspension and toppling: 13 | 0 | Plane laminas, suspension and toppling |
| Equilibrium of a rigid body · Centres of mass of solids | 13 | Moments, support reactions and composite rods: 3; Contact forces, friction and linked constraints: 1; Composite solids, cavities and shells: 9 | 0 | Composite solids, cavities and shells |
| Equilibrium of a rigid body · Objects in equilibrium | 15 | Contact forces, friction and linked constraints: 15 | 0 | Contact forces, friction and linked constraints |
| Equilibrium of a rigid body · End-of-chapter review exercise 14 | 0 | — | 0 | — |
| Circular motion · Horizontal circles | 26 | Horizontal circles and radial acceleration: 11; Conical pendulums, linked strings and elastic constraints: 15 | 0 | Conical pendulums, linked strings and elastic constraints |
| Circular motion · Vertical circles | 34 | Slack strings, turning points and loss of contact: 10; Release, impacts and changes of centre: 10; Vertical circles: energy and signed radial forces: 14 | 0 | Vertical circles: energy and signed radial forces |
| Circular motion · End-of-chapter review exercise 15 | 0 | — | 0 | — |
| Circular motion · The 3-dimensional case | 3 | Release, impacts and changes of centre: 1; Conical pendulums, linked strings and elastic constraints: 2 | 0 | Conical pendulums, linked strings and elastic constraints |
| Linear motion under a variable force · Acceleration with respect to displacement | 18 | Position-dependent force and the physical velocity branch: 9; Resistance, first stops and changes of direction: 4; Time-dependent forces and complete trajectories: 2; Limiting speeds, finite travel and constant power: 3 | 0 | Position-dependent force and the physical velocity branch |
| Linear motion under a variable force · End-of-chapter review exercise 17 | 0 | — | 0 | — |
| Linear motion under a variable force · Acceleration with respect to time | 15 | Resistance, first stops and changes of direction: 4; Limiting speeds, finite travel and constant power: 7; Time-dependent forces and complete trajectories: 4 | 0 | Limiting speeds, finite travel and constant power |
| Hooke's law · Hooke's law | 7 | Coupled elements, geometry and friction: 2; Slack phases, collisions and changes of force: 1; Elastic models, equilibrium and changes of load: 4 | 0 | Elastic models, equilibrium and changes of load |
| Hooke's law · End-of-chapter review exercise 16 | 0 | — | 0 | — |
| Hooke's law · The work-energy principle | 21 | Slack phases, collisions and changes of force: 7; Coupled elements, geometry and friction: 5; Elastic energy, extension and compression: 7; Elastic models, equilibrium and changes of load: 2 | 0 | Elastic energy, extension and compression |
| Hooke's law · Elastic potential energy | 3 | Coupled elements, geometry and friction: 1; Elastic energy, extension and compression: 2 | 0 | Elastic energy, extension and compression |
| Projectiles · Motion in the vertical plane | 14 | Meetings, rebounds and release into free flight: 5; Components, velocity and flight events: 9 | 0 | Components, velocity and flight events |
| Projectiles · End-of-chapter review exercise 13 | 0 | — | 0 | — |
| Projectiles · The Cartesian equation of the trajectory | 13 | Meetings, rebounds and release into free flight: 4; Cartesian trajectories, targets and obstacles: 9 | 0 | Cartesian trajectories, targets and obstacles |
| Momentum · Impulse and the conservation of momentum | 14 | — | 14 | — |
| Momentum · Oblique collisions and other examples | 25 | — | 25 | — |
| Momentum · Cross-topic review exercise 3 | 0 | — | 0 | — |
| Momentum · End-of-chapter review exercise 18 | 0 | — | 0 | — |
### Further Probability & Statistics

| Старый урок | Задач | Точно → новый урок | Не распределено / архив | Предложение, не утверждено |
|---|---:|---|---:|---|
| Non-parametric tests · Single-sample Wilcoxon signed-rank test | 9 | Signed ranks for one population: 9 | 0 | Signed ranks for one population |
| Non-parametric tests · Single-sample sign test | 2 | Sign tests for a population median: 2 | 0 | Sign tests for a population median |
| Non-parametric tests · End-of-chapter review exercise 11 | 0 | — | 0 | — |
| Non-parametric tests · Paired-sample sign test | 0 | — | 0 | Sign tests for a population median |
| Non-parametric tests · Wilcoxon matched-pairs signed-rank test | 8 | Matched pairs and ranked changes: 8 | 0 | Matched pairs and ranked changes |
| Non-parametric tests · Non-parametric tests | 0 | — | 0 | Sign tests for a population median |
| Non-parametric tests · Wilcoxon rank-sum test | 8 | Rank-sum tests for independent groups: 8 | 0 | Rank-sum tests for independent groups |
| Inferential statistics · Hypothesis tests concerning the difference in means | 21 | Independent means: the normal procedure: 10; Pooled variance and independent-sample t-tests: 10; Confidence intervals for one mean: 1 | 0 | Independent means: the normal procedure |
| Inferential statistics · End-of-chapter review exercise 9 | 0 | — | 0 | — |
| Inferential statistics · t-distribution | 9 | StudentвЂ™s t and a single population mean: 7; Paired observations and mean differences: 2 | 0 | StudentвЂ™s t and a single population mean |
| Inferential statistics · Confidence intervals for the difference in means | 11 | Confidence intervals for differences of means: 11 | 0 | Confidence intervals for differences of means |
| Inferential statistics · Paired t-tests | 9 | Paired observations and mean differences: 9 | 0 | Paired observations and mean differences |
| Inferential statistics · Confidence intervals for the mean of a small sample | 17 | Confidence intervals for one mean: 17 | 0 | Confidence intervals for one mean |
| Probability generating functions · Cross-topic review exercise 2 | 17 | Building and reading generating functions: 7; Recovering distributions and moments: 4; Transformations and dependence: 4; Repeated independent sums: 2 | 0 | Building and reading generating functions |
| Probability generating functions · Three or more random variables | 2 | Repeated independent sums: 2 | 0 | Repeated independent sums |
| Probability generating functions · Mean (E(X)) and variance (Var(X)) using the probability generating function | 0 | — | 0 | Building and reading generating functions |
| Probability generating functions · The sum of independent random variables | 9 | Building and reading generating functions: 2; Recovering distributions and moments: 3; Repeated independent sums: 2; Adding independent counts: 2 | 0 | Recovering distributions and moments |
| Probability generating functions · The probability generating function | 22 | Building and reading generating functions: 8; Transformations and dependence: 5; Adding independent counts: 7; Recovering distributions and moments: 2 | 0 | Building and reading generating functions |
| Probability generating functions · End-of-chapter review exercise 12 | 0 | — | 0 | — |
| Chi-squared tests · Goodness of fit for continuous distributions | 5 | Goodness of fit for continuous distributions: 5 | 0 | Goodness of fit for continuous distributions |
| Chi-squared tests · End-of-chapter review exercise 10 | 0 | — | 0 | — |
| Chi-squared tests · Testing association through contingency tables | 13 | Association and contingency tables: 13 | 0 | Association and contingency tables |
| Chi-squared tests · Forming hypotheses | 0 | — | 0 | — |
| Chi-squared tests · Goodness of fit for discrete distributions | 17 | Goodness of fit with a specified discrete model: 10; Discrete models with a fitted parameter: 7 | 0 | Goodness of fit with a specified discrete model |
| Continuous random variables · Calculating E(g(X)) for a continuous random variable | 0 | — | 0 | — |
| Continuous random variables · Finding the probability density function and cumulative distribution function of Y = g(X) | 20 | Increasing and decreasing transformations: 11; Expectations of functions and variance: 3; Mapped breakpoints and multiple inverse branches: 6 | 0 | Increasing and decreasing transformations |
| Continuous random variables · The probability density function | 5 | CDFs, quantiles and conditional probabilities: 3; Density models and probability areas: 2 | 0 | CDFs, quantiles and conditional probabilities |
| Continuous random variables · The cumulative distribution function | 13 | CDFs, quantiles and conditional probabilities: 5; Density models and probability areas: 4; Expectations of functions and variance: 4 | 0 | CDFs, quantiles and conditional probabilities |
| Continuous random variables · End-of-chapter review exercise 8 | 0 | — | 0 | — |

Полная машиночитаемая карта с ID: [ARENA-ONE-TREE-MAPPING-20261107.json](ARENA-ONE-TREE-MAPPING-20261107.json). Все `approvedLessonId` равны null. Владелец может утвердить только нужные строки отдельно; публикация интерфейса не утверждает эти предложения.

## Проверки и сохранность

- TypeScript — успешно; ESLint — 357 исходных файлов, успешно. 92 unit-теста прошли. Сборка Hostinger прошла аудит 24042 файлов без локальных секретов.
- Пять браузерных сценариев прошли: 135 SEO-страниц, 56 состояний адаптивности, полный каталог всех трёх ролей (по 58 страниц), приватные прямые URL, файлы, режимы просмотра STUDENT/TEACHER, старые закладки, взаимные ссылки, 63 Unallocated.
- Основная тестовая база: все **68251 исходная строка в 63 таблицах сохранены побайтно по отпечаткам**. Новые audit/session/overlay-записи допустимы; старые строки не заменялись. Повторное применение слоя: 0 записей. Отключение и повторное включение проверены.
- Пять старых Work: HTTP 200 и прежние SHA-256 API-ответов. В локальной копии отсутствуют исходные физические Cambridge-файлы: прежний HTTP 503 для администратора не изменился; у остальных 404. Наличие физических production-файлов требует отдельного live-readback.
- Свежая копия production: SQL 32109247 байт, SHA-256 `737bf1df5e65842f7e9ecd8df89151c2cf977234c99f1ea2de798fae08289ffc`. В отдельной новой loopback-базе прошли две миграции, 23 пакета, публикация и One Tree: **2169 новых задач, 0 обновлений старых**, гость 2857, администратор 5511, UNKNOWN 0, презентаций 59. Все **39772 исходные строки 62 таблиц** сохранены; повтор всех пакетов, публикаций и дерева не изменил ни одной строки.
- Контраст: общие цветовые tokens, поля и кнопки сохранены. Проверены светлая/тёмная темы и отсутствие наложений/горизонтальной прокрутки на 360, 390, 768, 1280 px. Отдельный автоматический WCAG-аудит всех страниц не заявляется.

## Снимки и ограничения

`test-results/one-tree-20261107/{mechanics,archive}-{390,1280}-{light,dark}.png`; JSON-результаты `responsive.json`, `archive-flow.json`, `public-boundaries.json`. Локальные артефакты и SQL не добавляются в Git.

Реклама, платежи и ИИ не включались. Прямые ключи, критерии, баллы, исходники владельца в E: не изменены. Не утверждены резервные соответствия; новая глава Momentum пока не создана. Точный состав файлов коммита — в соседнем `ARENA-ONE-TREE-FILES-20261107.json`.


### Управление размещением в кабинете

В приватном архиве добавлен свёрнутый блок Update archive placement: dry-run показывает число задач, точных связей и Unallocated, Apply использует полученный token. Запасные соответствия это действие не утверждает. Браузерный тест нажал обе кнопки на уже применённом локальном дереве и получил Rows changed: 0; повторная production-сборка и TypeScript/ESLint прошли.
