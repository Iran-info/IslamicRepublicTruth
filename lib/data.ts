import { database, ensureDatabase } from "@/db/initialize";
import type { Article, Locale } from "@/lib/content";
import { sampleArticles } from "@/lib/content";

export type PublicComment = {
  id: string;
  articleId: string;
  parentId: string | null;
  authorName: string;
  body: string;
  status: "visible" | "pending" | "removed";
  createdAt: string;
};

type ArticleRow = {
  id:string; translation_group:string; locale:Locale; slug:string; title:string;
  deck:string; body:string; category:string; author:string; cover_key:string|null;
  cover_tone:"sage"|"clay"|"night"; issue:string; status:"draft"|"published";
  published_at:string; created_at:string; updated_at:string;
};

const toArticle = (row: ArticleRow): Article => ({
  id:row.id, translationGroup:row.translation_group, locale:row.locale, slug:row.slug,
  title:row.title, deck:row.deck, body:row.body, category:row.category, author:row.author,
  coverKey:row.cover_key, coverTone:row.cover_tone, issue:row.issue, status:row.status,
  publishedAt:row.published_at, createdAt:row.created_at, updatedAt:row.updated_at,
});

export async function listArticles(locale: Locale, query = ""): Promise<Article[]> {
  try {
    await ensureDatabase();
    const db = database();
    const trimmed = query.trim();
    const statement = trimmed
      ? db.prepare(`SELECT * FROM articles WHERE locale = ? AND status = 'published'
          AND (title LIKE ? OR deck LIKE ? OR category LIKE ?)
          ORDER BY datetime(published_at) DESC LIMIT 60`).bind(locale, `%${trimmed}%`, `%${trimmed}%`, `%${trimmed}%`)
      : db.prepare("SELECT * FROM articles WHERE locale = ? AND status = 'published' ORDER BY datetime(published_at) DESC LIMIT 60").bind(locale);
    const result = await statement.all<ArticleRow>();
    return result.results.map(toArticle);
  } catch (error) {
    console.error("Article list fallback", error);
    const fallback = sampleArticles.filter((article) => article.locale === locale && article.status === "published");
    const needle = query.trim().toLocaleLowerCase(locale);
    return needle
      ? fallback.filter((article) => `${article.title} ${article.deck} ${article.category}`.toLocaleLowerCase(locale).includes(needle))
      : fallback;
  }
}

export async function listAllArticles(): Promise<Article[]> {
  try {
    await ensureDatabase();
    const result = await database().prepare("SELECT * FROM articles ORDER BY datetime(updated_at) DESC LIMIT 200").all<ArticleRow>();
    return result.results.map(toArticle);
  } catch (error) {
    console.error("Admin article list fallback", error);
    return sampleArticles;
  }
}

export async function getArticleBySlug(slug: string, includeDrafts = false): Promise<Article | null> {
  try {
    await ensureDatabase();
    const statement = includeDrafts
      ? database().prepare("SELECT * FROM articles WHERE slug = ? LIMIT 1").bind(slug)
      : database().prepare("SELECT * FROM articles WHERE slug = ? AND status = 'published' LIMIT 1").bind(slug);
    const row = await statement.first<ArticleRow>();
    return row ? toArticle(row) : null;
  } catch (error) {
    console.error("Article fallback", error);
    return sampleArticles.find((article) => article.slug === slug && (includeDrafts || article.status === "published")) ?? null;
  }
}

export async function getTranslation(article: Article): Promise<Article | null> {
  try {
    await ensureDatabase();
    const row = await database().prepare("SELECT * FROM articles WHERE translation_group = ? AND locale != ? AND status = 'published' LIMIT 1").bind(article.translationGroup, article.locale).first<ArticleRow>();
    return row ? toArticle(row) : null;
  } catch {
    return sampleArticles.find((item) => item.translationGroup === article.translationGroup && item.locale !== article.locale && item.status === "published") ?? null;
  }
}

export async function getComments(articleId: string): Promise<PublicComment[]> {
  try {
    await ensureDatabase();
    const result = await database().prepare(`SELECT id, article_id, parent_id, author_name, body, status, created_at
      FROM comments WHERE article_id = ? AND status = 'visible' ORDER BY datetime(created_at) ASC LIMIT 250`)
      .bind(articleId).all<{id:string;article_id:string;parent_id:string|null;author_name:string;body:string;status:"visible";created_at:string}>();
    return result.results.map((row) => ({ id:row.id, articleId:row.article_id, parentId:row.parent_id, authorName:row.author_name, body:row.body, status:row.status, createdAt:row.created_at }));
  } catch (error) {
    console.error("Comment list unavailable", error);
    return [];
  }
}

export async function getCommentsForAdmin(): Promise<(PublicComment & { articleTitle:string })[]> {
  await ensureDatabase();
  const result = await database().prepare(`SELECT c.id, c.article_id, c.parent_id, c.author_name, c.body, c.status, c.created_at, a.title AS article_title
    FROM comments c JOIN articles a ON a.id = c.article_id ORDER BY datetime(c.created_at) DESC LIMIT 200`)
    .all<{id:string;article_id:string;parent_id:string|null;author_name:string;body:string;status:"visible"|"pending"|"removed";created_at:string;article_title:string}>();
  return result.results.map((row) => ({ id:row.id, articleId:row.article_id, parentId:row.parent_id, authorName:row.author_name, body:row.body, status:row.status, createdAt:row.created_at, articleTitle:row.article_title }));
}
