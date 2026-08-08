import { getChatGPTUser } from "@/app/chatgpt-auth";
import { sanitizeImage } from "@/lib/image-sanitizer";
import { isAdminEmail, isSameOriginMutation, runtimeBindings } from "@/lib/security";

const MAX_BYTES = 6 * 1024 * 1024;

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return Response.json({ error:"Invalid request origin" }, { status:403 });
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error:"Authentication required" }, { status:401 });
  if (!(await isAdminEmail(user.email))) return Response.json({ error:"Editor access required" }, { status:403 });
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BYTES + 100_000) return Response.json({ error:"Image must be under 6 MB" }, { status:413 });
  const data = await request.formData();
  const file = data.get("file");
  if (!(file instanceof File)) return Response.json({ error:"Choose an image" }, { status:400 });
  if (file.size < 100 || file.size > MAX_BYTES) return Response.json({ error:"Image must be under 6 MB" }, { status:413 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sanitized = sanitizeImage(bytes);
  if (!sanitized) return Response.json({ error:"Use a valid JPEG, PNG or WebP image under 40 megapixels" }, { status:415 });
  const bucket = (await runtimeBindings()).BUCKET;
  if (!bucket) return Response.json({ error:"Image storage is unavailable" }, { status:503 });
  const key = `cover-${crypto.randomUUID()}.${sanitized.extension}`;
  await bucket.put(key, sanitized.bytes, { httpMetadata:{ contentType:sanitized.contentType, cacheControl:"public, max-age=31536000, immutable" }, customMetadata:{ sanitized:"true", uploadedAt:new Date().toISOString() } });
  return Response.json({ key, url:`/media/${key}` }, { status:201, headers:{ "cache-control":"no-store" } });
}
