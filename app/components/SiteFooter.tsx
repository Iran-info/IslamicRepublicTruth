import Link from "next/link";
import type { Locale } from "@/lib/content";
import { getCopy } from "@/lib/content";

export function SiteFooter({ locale }: { locale: Locale }) {
  const copy = getCopy(locale);
  return <footer className="site-footer"><div className="wrap footer-grid"><div><span className="footer-mark">آ</span><p>{copy.footerLine}</p></div><div className="footer-links"><Link href={`/?lang=${locale}`}>{copy.articles}</Link><Link href={`/?lang=${locale}#principles-title`}>{copy.communityRules}</Link></div><p className="copyright">© {new Date().getFullYear()} AZAD JOURNAL</p></div></footer>;
}
