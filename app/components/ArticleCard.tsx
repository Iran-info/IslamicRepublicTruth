import Link from "next/link";
import type { Article, Locale } from "@/lib/content";
import { getCopy } from "@/lib/content";

export function ArticleCard({ article, locale }: { article: Article; locale: Locale }) {
  const copy = getCopy(locale);
  const date = new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-CA", { year: "numeric", month: "short", day: "numeric" }).format(new Date(article.publishedAt));
  return (
    <article className="article-card"><Link href={`/articles/${article.slug}?lang=${locale}`} aria-label={article.title}>
      <div className={`card-cover cover-art--${article.coverTone}`}>{article.coverKey ? <img src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/covers/${article.coverKey}`} alt="" /> : null}<span className="card-index" aria-hidden="true">{article.issue}</span><span className="card-line" aria-hidden="true" /></div>
      <div className="article-meta"><span>{article.category}</span><time dateTime={article.publishedAt}>{date}</time></div>
      <h3>{article.title}</h3><p>{article.deck}</p><span className="read-link">{copy.readArticle} <b aria-hidden="true">↗</b></span>
    </Link></article>
  );
}
