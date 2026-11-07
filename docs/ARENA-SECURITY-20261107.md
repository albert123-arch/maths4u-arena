# Arena: исправления зависимостей перед импортом, 7 ноября 2026

При первой Hostinger-сборке выявлен фактический npm audit для прежних зависимостей: 16 предупреждений, включая critical Next.js. Публикация пакетов содержания приостановлена до исправления; первый кодовый deployment `7624939` завершён, health 200, прежние 688 публичных задач сохранены.

Обновлены и зафиксированы точные версии: Next.js / eslint-config-next 16.4.5, sanitize-html 2.18.1, sharp 0.35.5, Zod 4.6.7. Совместимые транзитивные исправления выполнены без `--force`; переход на другой major и ослабление защит не применялись.

Официальные основания: [Next.js SVG RCE, исправлено с 16.4.1](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [Next.js use cache RCE](https://github.com/advisories/GHSA-673q-mjm6-r5xr), [sanitize-html 2.18.0+](https://github.com/advisories/GHSA-x3q4-9hxx-gx8m). Это проверка известных advisory, не исчерпывающий аудит приложения.

После исправлений: **0 critical / 0 high / 0 low**. Осталось восемь moderate в цепочке ESLint/minimatch; все их установленные узлы помечены dev в lock-файле. ESLint, eslint-config-next, typescript-eslint и @typescript-eslint отсутствуют в standalone runtime. Автоматический совет npm откатить eslint-config-next на 15.x не выполнялся.

Локально прошли повторная production-сборка Next 16.4.5, TypeScript, ESLint исходников, 92 unit-теста. Аудит standalone: 24395 файлов, без приватных env/fixtures/секретов. Полная браузерная регрессия и новый Linux CI выполняются до следующего push main. Источники задач, ключи, критерии, схемы данных и прогресс этим коммитом не меняются.

Приватные логи: `.local/one-tree-20261107/production/{npm-audit-production,npm-audit-fixed}.json`, security-install.log, security-transitive.log; build/lint/unit — `.local/one-tree-20261107/security-*.log`. Точный состав: `ARENA-SECURITY-FILES-20261107.json`.
