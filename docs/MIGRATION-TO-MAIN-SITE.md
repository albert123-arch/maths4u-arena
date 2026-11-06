# Перенос Arena на maths4u.sbs — план

6 ноября 2026. Никакие редиректы, аккаунты, данные production и настройки доменов этим документом не изменены.

## Что переносится

- 688 задач с классификацией ORIGINAL после решения Этапа 6b: прежние 668 и 20 задач Book 2, авторство которых подтвердил владелец. Их текущие и прежние версии, авторские конспекты, примеры, точная проверка и повторение. Перед переносом — редакторская проверка и явное сопоставление редакционных UID с уже существующими problems основного сайта. Маршруты Book 2 сохраняются; старые PHP-адреса для него нужно отдельно сверить со свежим экспортом.
- Существующие URL Arena `/courses/...`, `/library`, `/learn/...` планируется сохранить как маршруты основного домена. Сейчас canonical/sitemap содержат arena.maths4u.sbs; переключение домена и 301 выполняются отдельным релизом.
- Аккаунты и прогресс существующей Arena сохраняются. Локальную тестовую базу с QA-пользователями переносить нельзя.

## Что не переносится в публичный банк

- 2 654 CAMBRIDGE_EXAM: записи, файлы, версии, ответы и оценки сохраняются в административном архиве. Для их старых адресов не предлагать 301 на другую авторскую задачу и не выдавать архивный файл как публичный.
- 10 демонстрационных задач имеют отдельный административный архив DEMO и не переносятся в публичный банк. Текущих UNKNOWN в основной локальной базе нет. Новые UNKNOWN скрыты до проверки; OTHER_THIRD_PARTY может открываться только по явному одобрению владельца. Это не разрешение на автоматический перенос новых импортов.
- Временные QA-аккаунты, классы, работы, ответы, токены, cookie и конфигурация `.local/`.
- Ссылки на презентации и права преподавателей не становятся публичными при переносе; требуется отдельная сверка разрешений. 59 ссылок отмечены в прежнем production-аудите. В текущей локальной test-базе LessonPresentation = 0; перед переносом нужна отдельная сверка свежего экспорта, без использования QA-базы.

## Проверенная карта учебных тем

Карта построена по php_subchapter_id/skills из авторских пакетов и текущим Lesson ID Arena. Это соответствие навыков; оно не доказывает равенство всех вопросов старой страницы. Адреса ниже пока только план будущих 301 после сверки свежей рабочей базы.

| Старый адрес maths4u.sbs | Новый маршрут на основном домене | Статус |
| --- | --- | --- |
| /subchapter.php?id=11 | /courses/maths4u-9709-p1/topics/orig_quadratics_factorisation | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=12 | /courses/maths4u-9709-p1/topics/orig_quadratics_completing_square | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=14 | /courses/maths4u-9709-p1/topics/orig_quadratics_simultaneous | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=17 | /courses/maths4u-9709-p1/topics/orig_quadratics_inequalities | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=18 | /courses/maths4u-9709-p1/topics/orig_quadratics_roots | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=27 | /courses/maths4u-9709-p1/topics/orig_functions_inverse | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=28 | /courses/maths4u-9709-p1/topics/orig_functions_composite | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=29 | /courses/maths4u-9709-p1/topics/orig_functions_restricted_inverse | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=30 | /courses/maths4u-9709-p1/topics/orig_functions_inverse_graphs | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=31 | /courses/maths4u-9709-p1/topics/orig_functions_transformations | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=36 | /courses/maths4u-9709-p1/topics/orig_coordinate_geometry_distance_midpoint | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=37 | /courses/maths4u-9709-p1/topics/orig_coordinate_geometry_parallel_perpendicular | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=38 | /courses/maths4u-9709-p1/topics/orig_coordinate_geometry_straight_lines | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=39 | /courses/maths4u-9709-p1/topics/orig_coordinate_geometry_circles | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=40 | /courses/maths4u-9709-p1/topics/orig_coordinate_geometry_line_circle | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=52 | /courses/maths4u-9709-p1/topics/orig_circular_measure_radians | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=53 | /courses/maths4u-9709-p1?chapter=orig_9709_p1_circular_measure | Старая тема разделена: сначала решение владельца |
| /subchapter.php?id=55 | /courses/maths4u-9709-p1?chapter=orig_9709_p1_circular_measure | Старая тема разделена: сначала решение владельца |
| /subchapter.php?id=61 | /courses/maths4u-9709-p1/topics/orig_trigonometry_quadratic_equations | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=62 | /courses/maths4u-9709-p1/topics/orig_trigonometry_ratios | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=63 | /courses/maths4u-9709-p1/topics/orig_trigonometry_graphs | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=65 | /courses/maths4u-9709-p1/topics/orig_trigonometry_equations | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=66 | /courses/maths4u-9709-p1/topics/orig_trigonometry_identities | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=69 | /courses/maths4u-9709-p1/topics/orig_series_arithmetic | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=70 | /courses/maths4u-9709-p1/topics/orig_series_geometric | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=71 | /courses/maths4u-9709-p1/topics/orig_series_trig_arithmetic | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=72 | /courses/maths4u-9709-p1/topics/orig_series_trig_geometric | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=73 | /courses/maths4u-9709-p1/topics/orig_series_applications | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=74 | /courses/maths4u-9709-p1/topics/orig_binomial_expansion_expansion | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=75 | /courses/maths4u-9709-p1?chapter=orig_9709_p1_binomial_expansion | Старая тема разделена: сначала решение владельца |
| /subchapter.php?id=76 | /courses/maths4u-9709-p1/topics/orig_binomial_expansion_parameters | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=77 | /courses/maths4u-9709-p1/topics/orig_binomial_expansion_approximations | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=78 | /courses/maths4u-9709-p1/topics/orig_differentiation_derivatives | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=80 | /courses/maths4u-9709-p1/topics/orig_differentiation_tangents_normals | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=81 | /courses/maths4u-9709-p1/topics/orig_differentiation_curve_behaviour | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=82 | /courses/maths4u-9709-p1/topics/orig_differentiation_rates | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=83 | /courses/maths4u-9709-p1/topics/orig_differentiation_optimisation | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=84 | /courses/maths4u-9709-p1/topics/orig_integration_power_integrals | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=85 | /courses/maths4u-9709-p1/topics/orig_integration_curve_equations | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=86 | /courses/maths4u-9709-p1/topics/orig_integration_areas | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=87 | /courses/maths4u-9709-p1/topics/orig_integration_volumes | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=88 | /courses/maths4u-9709-p1/topics/orig_integration_accumulation | Совпадение навыка; сверить старое содержимое |
| /subchapter.php?id=197 | /courses/maths4u-9709-p1?chapter=orig_9709_p1_cross_topic_revision | Старая тема разделена: сначала решение владельца |

Всего 43 старых адреса соответствуют 50 темам. В `subchapter_id` 53, 55, 75 и 197 есть несколько новых навыков: предложена страница соответствующей главы, а не произвольная одна задача. Подробности — в `MIGRATION-URL-MAP-20261106.json`.

## Экзаменационные адреса

Старые адреса `problems.php?subchapter_id=N&filter=all#card-ID`, course.php, chapter.php и subchapter.php сопоставляются через SourceReference, ImportRecord и ключи structure-пакета. Старый fragment `#card-ID` не передаётся серверу: индивидуальный 301 по нему технически невозможен. Нужны страничное соответствие и, при необходимости, клиентский перенос якоря для авторских задач.

Для пяти импортированных курсов ниже публичного назначения нет: все их задачи сейчас Cambridge. В Arena идентификаторы и URL сохранены; публичные адреса скрыты, администратор использует `/admin/archive` и существующий `/teacher/tasks/{Task.id}`. Архивные адреса не направлять на похожие авторские задачи.

| Старый курс | Текущий маршрут Arena | План |
| --- | --- | --- |
| /course.php?id=12 — Further Probability & Statistics | /courses/maths4u-9231-statistics | Архив; нет публичного 301 |
| /course.php?id=6 — Further Pure Mathematics 1 | /courses/maths4u-9231-fp1 | Архив; нет публичного 301 |
| /course.php?id=15 — Additional Mathematics | /courses/maths4u-0606 | Архив; нет публичного 301 |
| /course.php?id=14 — Further Pure Mathematics 2 | /courses/maths4u-9231-fp2 | Архив; нет публичного 301 |
| /course.php?id=13 — Further Mechanics | /courses/maths4u-9231-mechanics | Архив; нет публичного 301 |

## Аккаунты и прогресс старого PHP-сайта — варианты для решения владельца

1. **Новые аккаунты на платформе.** Старые результаты остаются на прежнем сайте в закрытой истории; затем отдельно импортируется только выбранная история. Самый простой первый релиз, но пользователи не получают автоматическое продолжение.
2. **Сопоставление учётных записей с подтверждением владельца.** Отдельная карта `legacy site + user id → Arena user id`, проверка совпадений и конфликтов логинов, подтверждение входом или восстановлением. Не объединять людей по имени, не копировать cookie/Session и не выдавать чужие пароли. Совместимость паролей и разрешений проверяется до выбора способа входа.
3. **Перенос истории после подтверждённой привязки.** Для каждой задачи нужен проверенный редакционный UID и конкретная версия. Не переносить прогресс на просто похожую новую задачу и не засчитывать самооценку как автоматический или учительский балл. Архивная история может показывать собственный ответ и полученную оценку с заглушкой вместо условия.

Решить отдельно: момент переключения, сохранение прежней истории, подтверждение пользователей, правила совпадения задач и версий, права на презентации и пользовательские подписки. Никакой вариант в Этапе 6 не внедряется.

## Порядок будущего релиза

- Снять резервную копию рабочей базы и файлов, записать commit и актуальные счётчики. Проверить свежий экспорт только чтением.
- Применить проверенные миграции на staging. Отдельно получить команду владельца на рабочую базу; текущая CLI намеренно отказывается работать вне локальной test-базы.
- Выполнить dry-run классификации/архива, рассмотреть UNKNOWN и конфликтующие ручные отметки; затем применить архивирование по отдельной команде с журналом и проверкой отката.
- Сверить карту редиректов с фактическими публичными материалами и историей; не экспортировать `.local/` и тестовую базу.
- Переключить домен, canonical, hreflang, sitemap и только утверждённые 301 отдельным релизом. Проверить роли, файлы и собственные ответы в истории на живом сайте.
