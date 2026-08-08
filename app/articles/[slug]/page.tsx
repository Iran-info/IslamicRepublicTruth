import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/app/components/ArticleBody";
import { ArticleCard } from "@/app/components/ArticleCard";
import { GiscusComments } from "@/app/components/GiscusComments";
import { SiteFooter } from "@/app/components/SiteFooter";
import { SiteHeader } from "@/app/components/SiteHeader";
import { getArticleBySlug, getTranslation, listArticles } from "@/lib/data";
import { sampleArticles } from "@/lib/content";

type PageProps = { params: Promise<{ slug:string }> };

export function generateStaticParams() {
  return sampleArticles.filter((article) => article.status === "published").map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const article = getArticleBySlug(decodeURIComponent((await params).slug));
  return article ? { title:article.title, description:article.deck } : { title:"Article not found" };
}

export default async function ArticlePage({ params }: PageProps) {
  const article = getArticleBySlug(decodeURIComponent((await params).slug));
  if (!article) notFound();
  const translation = getTranslation(article);
  const related = listArticles(article.locale).filter((item) => item.id !== article.id).slice(0,2);
  const locale = article.locale;
  const readingTime = Math.max(1, Math.ceil(article.body.split(/\s+/).length / (locale === "fa" ? 180 : 220)));
  const date = new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-CA", { year:"numeric", month:"long", day:"numeric" }).format(new Date(article.publishedAt));
  const labels = locale === "fa" ? { min:"دقیقه مطالعه", publisher:"ناشر", byline:"نشریه آزاد", back:"بازگشت به مقاله‌ها", related:"بیشتر بخوانید" } : { min:"min read", publisher:"Published by", byline:"Azad Journal", back:"Back to articles", related:"Keep reading" };

  return <div className="site-shell article-shell" dir={locale === "fa" ? "rtl" : "ltr"}>
    <SiteHeader locale={locale} languageHref={translation ? `/articles/${translation.slug}/?lang=${translation.locale}` : `/?lang=${locale === "en" ? "fa" : "en"}`} />
    <main><article><header className="article-hero wrap"><Link className="back-link" href={`/?lang=${locale}`}><span aria-hidden="true">←</span>{labels.back}</Link><div className="article-hero-grid"><div><p className="eyebrow">{article.category}</p><h1>{article.title}</h1><p className="article-deck">{article.deck}</p></div><div className="article-facts"><p><span>{labels.publisher}</span><b>{labels.byline}</b></p><p><span>{date}</span><b>{readingTime} {labels.min}</b></p></div></div></header>
      <div className="article-cover wrap">{article.coverKey ? <img src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/covers/${article.coverKey}`} alt=""/> : <div className={`cover-art cover-art--${article.coverTone}`}><span className="cover-orbit" aria-hidden="true"/><span className="cover-mark">AZ</span></div>}</div>
      <div className="article-layout wrap"><aside className="article-rail"><span>{article.issue}</span><i/></aside><ArticleBody body={article.body}/><aside className="share-note"><p>AZAD / {article.issue}</p><span>{article.category}</span></aside></div>
    </article><div className="article-lower wrap"><GiscusComments locale={locale}/></div>
    {related.length ? <section className="related wrap"><div className="section-heading section-heading--rule"><h2>{labels.related}</h2><span>{String(related.length).padStart(2,"0")}</span></div><div className="article-grid">{related.map((item)=><ArticleCard key={item.id} article={item} locale={locale}/>)}</div></section> : null}</main><SiteFooter locale={locale}/>
  </div>;
}
