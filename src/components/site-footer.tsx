import Link from "next/link";
import { courseLevels } from "@/lib/discovery-model";
import type { LanguagePair } from "@/lib/public-page-model";
import { SiteLanguages } from "./site-languages";
import { useLocale } from "./ui";
import styles from "./site-footer.module.css";

export function SiteFooter({ languagePair }: { languagePair?: LanguagePair }) {
  const { t } = useLocale();
  return <footer className={styles.footer}>
    <div className={styles.brand}>
      <strong>Maths4U Arena</strong>
      <a href="https://maths4u.sbs/">{t("Основной сайт Maths4U", "Maths4U main site")} <span aria-hidden="true">↗</span></a>
      <SiteLanguages languagePair={languagePair} className={styles.languages} />
    </div>
    <nav aria-label={t("Уровни обучения", "Learning levels")}>
      <ul>{courseLevels.map(level => <li key={level.key}>
        <Link href={`/learn/${level.key}`} prefetch={false}>{level.code} · {t(level.ru, level.title)}</Link>
      </li>)}
        <li><Link href="/learn/olympiad" prefetch={false}>{t("Олимпиадная математика", "Olympiad Mathematics")}</Link></li>
      </ul>
    </nav>
    <nav aria-label={t("О сайте и помощь", "About and help")}>
      <ul>
        <li><Link href="/about" prefetch={false}>{t("О проекте", "About Arena")}</Link></li>
        <li><Link href="/about#contact" prefetch={false}>{t("Контакты", "Contact")}</Link></li>
        <li><Link href="/about#privacy" prefetch={false}>{t("Конфиденциальность", "Privacy")}</Link></li>
        <li><Link href="/recover" prefetch={false}>{t("Помощь со входом", "Account help")}</Link></li>
      </ul>
    </nav>
  </footer>;
}
