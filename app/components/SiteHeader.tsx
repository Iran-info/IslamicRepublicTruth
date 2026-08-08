import Link from "next/link";
import type { Locale } from "@/lib/content";
import { getCopy } from "@/lib/content";

export function SiteHeader({ locale, languageHref }: { locale: Locale; languageHref?: string }) {
  const copy = getCopy(locale); const otherLocale = locale === "en" ? "fa" : "en";
  return <header className="site-header"><div className="wrap header-inner">
    <Link className="wordmark" href={`/?lang=${locale}`} aria-label="Azad Journal home"><span className="wordmark-seal">آ</span><span><b>AZAD</b><small>JOURNAL</small></span></Link>
    <nav aria-label={copy.mainNavigation}><Link href={`/?lang=${locale}`}>{copy.articles}</Link><Link href={`/?lang=${locale}#principles-title`}>{copy.about}</Link></nav>
    <Link className="language-switch" href={languageHref ?? `/?lang=${otherLocale}`} hrefLang={otherLocale} aria-label={copy.switchLanguage}><span>{locale === "en" ? "FA" : "EN"}</span><i aria-hidden="true">↔</i></Link>
  </div></header>;
}
