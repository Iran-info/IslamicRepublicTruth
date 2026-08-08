import { getChatGPTUser } from "@/app/chatgpt-auth";
import { database, ensureDatabase } from "@/db/initialize";
import { parseArticleInput, type ArticleInput } from "@/lib/article-input";
import { isAdminEmail, isSameOriginMutation } from "@/lib/security";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return Response.json({ error:"Invalid request origin" }, { status:403 });
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error:"Authentication required" }, { status:401 });
  if (!(await isAdminEmail(user.email))) return Response.json({ error:"Editor access required" }, { status:403 });

  let article: ArticleInput;
  try {
    article = parseArticleInput(await request.json());
  } catch (error) {
    return Response.json({ error:error instanceof Error ? error.message : "Invalid article data" }, { status:400 });
  }

  try {
    await ensureDatabase();
    const db = database();
    const now = new Date().toISOString();
    const anonymousByline = article.locale === "fa" ? "نشریه آزاد" : "Azad Journal";
    const conflict = await db.prepare("SELECT id FROM articles WHERE slug = ? AND id != ? LIMIT 1").bind(article.slug, article.id ?? "").first<{id:string}>();
    if (conflict) return Response.json({ error:"That URL slug is already in use" }, { status:409 });

    const id = article.id ?? crypto.randomUUID();
    if (article.id) {
      const existing = await db.prepare("SELECT id FROM articles WHERE id = ? LIMIT 1").bind(id).first<{id:string}>();
      if (!existing) return Response.json({ error:"Article not found" }, { status:404 });
      await db.prepare(`UPDATE articles SET translation_group=?, locale=?, slug=?, title=?, deck=?, body=?, category=?, author=?, cover_key=?, cover_tone=?, issue=?, status=?, published_at=?, updated_at=? WHERE id=?`)
        .bind(article.translationGroup, article.locale, article.slug, article.title, article.deck, article.body, article.category, anonymousByline, article.coverKey, article.coverTone, article.issue, article.status, article.publishedAt, now, id).run();
    } else {
      await db.prepare(`INSERT INTO articles (id, translation_group, locale, slug, title, deck, body, category, author, cover_key, cover_tone, issue, status, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(id, article.translationGroup, article.locale, article.slug, article.title, article.deck, article.body, article.category, anonymousByline, article.coverKey, article.coverTone, article.issue, article.status, article.publishedAt, now, now).run();
    }
    return Response.json({ ok:true, id, slug:article.slug }, { headers:{ "cache-control":"no-store" } });
  } catch (error) {
    console.error("Article save failed", error);
    return Response.json({ error:"Unable to save article" }, { status:500 });
  }
}
