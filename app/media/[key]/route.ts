import { runtimeBindings } from "@/lib/security";

type RouteContext = { params: Promise<{ key:string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { key } = await context.params;
  if (!/^cover-[a-f0-9-]+\.(?:jpg|png|webp|avif)$/.test(key)) return new Response("Not found", { status:404 });
  const bucket = (await runtimeBindings()).BUCKET;
  if (!bucket) return new Response("Not found", { status:404 });
  const object = await bucket.get(key);
  if (!object) return new Response("Not found", { status:404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
}
