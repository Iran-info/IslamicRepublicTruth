import { getChatGPTUser } from "@/app/chatgpt-auth";
import { database, ensureDatabase } from "@/db/initialize";
import { commenterHash, isSameOriginMutation } from "@/lib/security";

type RouteContext = { params: Promise<{ id: string }> };

function cleanAlias(value: unknown) {
  if (typeof value !== "string") return "Reader";
  const alias = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  if (!alias) return "Reader";
  if (alias.length < 2 || alias.length > 40) throw new Error("Display name must be 2–40 characters");
  return alias;
}

export async function POST(request: Request, context: RouteContext) {
  if (!isSameOriginMutation(request)) return Response.json({ error:"Invalid request origin" }, { status:403 });
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error:"Sign in to join the discussion" }, { status:401 });

  const payload = await request.json().catch(() => null) as { body?:unknown; alias?:unknown; parentId?:unknown } | null;
  if (!payload) return Response.json({ error:"Invalid comment data" }, { status:400 });
  const body = typeof payload.body === "string" ? payload.body.replace(/\r\n/g, "\n").trim() : "";
  if (body.length < 2 || body.length > 2000) return Response.json({ error:"Comment must be 2–2,000 characters" }, { status:400 });
  if ((body.match(/https?:\/\//gi) ?? []).length > 3) return Response.json({ error:"Please limit links to three per comment" }, { status:400 });
  let alias: string;
  try { alias = cleanAlias(payload.alias); }
  catch (error) { return Response.json({ error:error instanceof Error ? error.message : "Invalid display name" }, { status:400 }); }
  const parentId = typeof payload.parentId === "string" && /^[a-f0-9-]{20,60}$/i.test(payload.parentId) ? payload.parentId : null;
  let authorHash: string;
  try { authorHash = await commenterHash(user.email); }
  catch (error) { console.error("Comment identity setup failed", error); return Response.json({ error:"Discussion is temporarily unavailable" }, { status:503 }); }

  try {
    const { id: articleId } = await context.params;
    await ensureDatabase();
    const db = database();
    const article = await db.prepare("SELECT id FROM articles WHERE id = ? AND status = 'published' LIMIT 1").bind(articleId).first<{id:string}>();
    if (!article) return Response.json({ error:"Article not found" }, { status:404 });
    if (parentId) {
      const parent = await db.prepare("SELECT id FROM comments WHERE id = ? AND article_id = ? AND status = 'visible' LIMIT 1").bind(parentId, articleId).first<{id:string}>();
      if (!parent) return Response.json({ error:"The comment you are replying to is unavailable" }, { status:400 });
    }
    const recent = await db.prepare("SELECT COUNT(*) AS count FROM comments WHERE author_hash = ? AND datetime(created_at) >= datetime('now','-10 minutes')")
      .bind(authorHash).first<{count:number}>();
    if ((recent?.count ?? 0) >= 5) return Response.json({ error:"Please wait before posting again" }, { status:429 });

    const duplicate = await db.prepare("SELECT id FROM comments WHERE author_hash = ? AND body = ? AND datetime(created_at) >= datetime('now','-2 minutes') LIMIT 1")
      .bind(authorHash, body).first<{id:string}>();
    if (duplicate) return Response.json({ error:"That comment was already posted" }, { status:409 });

    const comment = { id:crypto.randomUUID(), articleId, parentId, authorName:alias, body, status:"visible" as const, createdAt:new Date().toISOString() };
    await db.prepare("INSERT INTO comments (id, article_id, parent_id, author_hash, author_name, body, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'visible', ?)")
      .bind(comment.id, articleId, parentId, authorHash, alias, body, comment.createdAt).run();
    return Response.json({ comment }, { status:201, headers:{ "cache-control":"no-store" } });
  } catch (error) {
    console.error("Comment create failed", error);
    return Response.json({ error:"Unable to post comment" }, { status:500 });
  }
}
