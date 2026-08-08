import { getChatGPTUser } from "@/app/chatgpt-auth";
import { database, ensureDatabase } from "@/db/initialize";
import { isAdminEmail, isSameOriginMutation } from "@/lib/security";

type RouteContext = { params: Promise<{ id:string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!isSameOriginMutation(request)) return Response.json({ error:"Invalid request origin" }, { status:403 });
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error:"Authentication required" }, { status:401 });
  if (!(await isAdminEmail(user.email))) return Response.json({ error:"Editor access required" }, { status:403 });
  const payload = await request.json().catch(() => null) as { status?:unknown } | null;
  const status = payload?.status === "visible" || payload?.status === "removed" ? payload.status : null;
  if (!status) return Response.json({ error:"Invalid moderation status" }, { status:400 });
  const { id } = await context.params;
  if (!/^[a-f0-9-]{20,60}$/i.test(id)) return Response.json({ error:"Invalid comment" }, { status:400 });
  await ensureDatabase();
  const result = await database().prepare("UPDATE comments SET status = ? WHERE id = ?").bind(status, id).run();
  if (!result.meta.changes) return Response.json({ error:"Comment not found" }, { status:404 });
  return Response.json({ ok:true, status }, { headers:{ "cache-control":"no-store" } });
}
