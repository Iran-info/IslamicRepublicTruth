import Link from "next/link";
import { ArticleCard } from "@/app/components/ArticleCard";
import { SiteFooter } from "@/app/components/SiteFooter";
import { SiteHeader } from "@/app/components/SiteHeader";
import { getCopy, localeFrom } from "@/lib/content";
import { listArticles } from "@/lib/data";

export const dynamic = "force-dynamic";

type HomeProps = { searchParams: Promise<{ lang?: string; q?: string }> };

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const locale = localeFrom(params.lang);
  const copy = getCopy(locale);
  const query = params.q?.trim().slice(0, 80) ?? "";
  const articles = await listArticles(locale, query);
  const [featured, ...rest] = articles;

  return (
    <div className="site-shell" dir={locale === "fa" ? "rtl" : "ltr"}>
      <SiteHeader locale={locale} />
      <main>
        <section className="hero wrap" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">{copy.journalEyebrow}</p>
            <h1 id="hero-title">{copy.heroTitle}</h1>
            <p className="hero-intro">{copy.heroIntro}</p>
          </div>
          <form className="search" action="/" method="get" role="search">
            <input type="hidden" name="lang" value={locale} />
            <label className="sr-only" htmlFor="article-search">{copy.searchLabel}</label>
            <input id="article-search" name="q" type="search" defaultValue={query}
              placeholder={copy.searchPlaceholder} maxLength={80} />
            <button type="submit">{copy.searchAction}</button>
          </form>
        </section>

        {featured ? (
          <section className="featured wrap" aria-labelledby="featured-title">
            <div className="section-heading">
              <p className="eyebrow" id="featured-title">{query ? copy.searchResults : copy.featured}</p>
              {query ? <Link href={`/?lang=${locale}`} className="text-link">{copy.clearSearch}</Link> : null}
            </div>
            <Link className="featured-story" href={`/articles/${featured.slug}?lang=${locale}`}>
              <div className={`cover-art cover-art--${featured.coverTone}`}>
                <span className="cover-orbit" aria-hidden="true" />
                <span className="cover-mark">AZ</span>
              </div>
              <div className="featured-copy">
                <div className="article-meta">
                  <span>{featured.category}</span><span aria-hidden="true">·</span>
                  <time dateTime={featured.publishedAt}>{new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-CA", { year: "numeric", month: "long", day: "numeric" }).format(new Date(featured.publishedAt))}</time>
                </div>
                <h2>{featured.title}</h2><p>{featured.deck}</p>
                <span className="read-link">{copy.readArticle} <b aria-hidden="true">↗</b></span>
              </div>
            </Link>
          </section>
        ) : (
          <section className="empty-state wrap">
            <p className="eyebrow">{copy.searchResults}</p><h2>{copy.noResultsTitle}</h2><p>{copy.noResultsBody}</p>
            <Link href={`/?lang=${locale}`} className="button button--ink">{copy.clearSearch}</Link>
          </section>
        )}

        {rest.length ? (
          <section className="latest wrap" aria-labelledby="latest-title">
            <div className="section-heading section-heading--rule"><h2 id="latest-title">{copy.latest}</h2><span>{String(rest.length).padStart(2, "0")}</span></div>
            <div className="article-grid">{rest.map((article) => <ArticleCard key={article.id} article={article} locale={locale} />)}</div>
          </section>
        ) : null}

        <section className="principles wrap" aria-labelledby="principles-title">
          <p className="eyebrow">{copy.openForum}</p>
          <div><h2 id="principles-title">{copy.principlesTitle}</h2><p>{copy.principlesBody}</p></div>
          <div className="principle-list">{copy.principles.map((item, index) => <p key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}</p>)}</div>
        </section>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
