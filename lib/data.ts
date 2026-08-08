import type { Article, Locale } from "@/lib/content";
import { sampleArticles } from "@/lib/content";

export function listArticles(locale: Locale, query = ""): Article[] {
  const needle = query.trim().toLocaleLowerCase(locale);
  return sampleArticles
    .filter((article) => article.locale === locale && article.status === "published")
    .filter((article) => !needle || `${article.title} ${article.deck} ${article.category}`.toLocaleLowerCase(locale).includes(needle))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

export function getArticleBySlug(slug: string): Article | null {
  return sampleArticles.find((article) => article.slug === slug && article.status === "published") ?? null;
}

export function getTranslation(article: Article): Article | null {
  return sampleArticles.find((item) => item.translationGroup === article.translationGroup && item.locale !== article.locale && item.status === "published") ?? null;
}
