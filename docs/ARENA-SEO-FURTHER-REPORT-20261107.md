# Arena Further SEO — отчёт 7 ноября 2026

## Изменения

Главная начинает с четырёх направлений 9231, при этом 9709 Pure 1, Book 2 и остальные существующие направления сохранены. Все просмотренные владельцем 23 главы остаются опубликованными. Нет жёсткого списка русских URL: прежняя проверка реального русского содержания не изменялась.

Для 23 глав добавлены постоянные адреса `/courses/<course>/chapters/<chapter>`. У 112 уроков и этих 23 глав title содержит привычную тему, код 9231 и курс; description основан на учебной цели. Добавлены BreadcrumbList и LearningResource, видимые хлебные крошки главы. Canonical не включает фильтры. Sitemap содержит опубликованные главы/уроки, реальный стабильный lastmod из публикации/версии урока; архив администратора исключён. В подвале есть ссылка на maths4u.sbs. Английские публичные страницы не начинают читать cookie языка или темы.

LearningResource не выдаётся за отдельную гарантированную расширенную выдачу Google. Структурированные данные описывают страницу без вымышленных оценок, лицензий и одобрения Cambridge. Все новые задачи владельца остаются публичными; provenance не попадает в публичный HTML/JSON.

## Проверки

92 unit-теста; TypeScript; ESLint 357 файлов; production-сборка. Автоматически проверены **все 135 URL**: HTTP 200, точные title/canonical/JSON-LD/dateModified; две выдачи sitemap идентичны; 9709 Pure 1 и Book 2 присутствуют, 116 архивных уроков отсутствуют. Дополнительно 24 состояния главной/главы/урока на 360/390/768/1280 px и обеих темах: ошибок JS, KaTeX и переполнения нет. 12 снимков: `test-results/further-seo-20261107/{home,chapter,lesson}-{390,1280}-{light,dark}.png`.

## Все локальные предпросмотры глав

- [Roots of polynomial equations вЂ” 9231 Further Pure 1 notes & practice | Maths4U](http://127.0.0.1:3109/courses/maths4u-9231-fp1/chapters/roots-original)
- [Rational functions вЂ” 9231 Further Pure 1 notes & practice | Maths4U](http://127.0.0.1:3109/courses/maths4u-9231-fp1/chapters/rational-functions)
- [Summation of series вЂ” 9231 Further Pure 1 notes & practice | Maths4U](http://127.0.0.1:3109/courses/maths4u-9231-fp1/chapters/summation-of-series)
- [Matrices 1 вЂ” 9231 Further Pure 1 notes & practice | Maths4U](http://127.0.0.1:3109/courses/maths4u-9231-fp1/chapters/matrices-1)
- [Polar coordinates вЂ” 9231 Further Pure 1 notes & practice | Maths4U](http://127.0.0.1:3109/courses/maths4u-9231-fp1/chapters/polar-coordinates)
- [Vectors вЂ” 9231 Further Pure 1 notes & practice | Maths4U](http://127.0.0.1:3109/courses/maths4u-9231-fp1/chapters/vectors)
- [Proof by induction вЂ” 9231 Further Pure 1 notes & practice | Maths4U](http://127.0.0.1:3109/courses/maths4u-9231-fp1/chapters/proof-by-induction)
- [Continuous random variables вЂ” 9231 Further Statistics notes & practice | Maths4U](http://127.0.0.1:3109/courses/maths4u-9231-statistics/chapters/continuous-random-variables)
- [Inferential statistics вЂ” 9231 Further Statistics notes & practice | Maths4U](http://127.0.0.1:3109/courses/maths4u-9231-statistics/chapters/inferential-statistics)
- [Chi-squared tests вЂ” 9231 Further Statistics notes & practice | Maths4U](http://127.0.0.1:3109/courses/maths4u-9231-statistics/chapters/chi-squared-tests)
- [Non-parametric tests вЂ” 9231 Further Statistics notes & practice | Maths4U](http://127.0.0.1:3109/courses/maths4u-9231-statistics/chapters/non-parametric-tests)
- [Probability generating functions вЂ” 9231 Further Statistics notes & practice | Maths4U](http://127.0.0.1:3109/courses/maths4u-9231-statistics/chapters/probability-generating-functions)
- [Hyperbolic functions вЂ” 9231 Further Pure 2 notes & practice | Maths4U](http://127.0.0.1:3109/courses/maths4u-9231-fp2/chapters/hyperbolic-functions)
- [Matrices 2 вЂ” 9231 Further Pure 2 notes & practice | Maths4U](http://127.0.0.1:3109/courses/maths4u-9231-fp2/chapters/matrices-2)
- [Differentiation вЂ” 9231 Further Pure 2 notes & practice | Maths4U](http://127.0.0.1:3109/courses/maths4u-9231-fp2/chapters/differentiation)
- [Integration вЂ” 9231 Further Pure 2 notes & practice | Maths4U](http://127.0.0.1:3109/courses/maths4u-9231-fp2/chapters/integration)
- [Complex numbers вЂ” 9231 Further Pure 2 notes & practice | Maths4U](http://127.0.0.1:3109/courses/maths4u-9231-fp2/chapters/complex-numbers)
- [Differential equations вЂ” 9231 Further Pure 2 notes & practice | Maths4U](http://127.0.0.1:3109/courses/maths4u-9231-fp2/chapters/differential-equations)
- [Projectiles вЂ” 9231 Further Mechanics notes & practice | Maths4U](http://127.0.0.1:3109/courses/maths4u-9231-mechanics/chapters/projectiles)
- [Equilibrium of a rigid body вЂ” 9231 Further Mechanics notes & practice | Maths4U](http://127.0.0.1:3109/courses/maths4u-9231-mechanics/chapters/equilibrium-of-a-rigid-body)
- [Circular motion вЂ” 9231 Further Mechanics notes & practice | Maths4U](http://127.0.0.1:3109/courses/maths4u-9231-mechanics/chapters/circular-motion)
- [Hooke's law вЂ” 9231 Further Mechanics notes & practice | Maths4U](http://127.0.0.1:3109/courses/maths4u-9231-mechanics/chapters/hookes-law)
- [Linear motion under a variable force вЂ” 9231 Further Mechanics notes & practice | Maths4U](http://127.0.0.1:3109/courses/maths4u-9231-mechanics/chapters/linear-motion-variable-force)

## Границы и источники

Search Console, DNS и отправка sitemap в аккаунте Google пока не изменялись. Сроки индексации и рекламный доход не гарантируются. Применение опубликованного контента по делу важнее количества страниц: [Google о generative AI content](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content). Lastmod отражает существенное обновление: [Google sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap). Описание разметки: [Breadcrumb](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb), [LearningResource](https://schema.org/LearningResource). Будущий перенос между доменами потребует отдельной адресной карты и проверки 301: [Google site move](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes).

Операции публикации — в `ARENA-CONTENT-DEPLOY-20261107.md`; локальные артефакты, экспорт и восстановленная база исключены из Git.
