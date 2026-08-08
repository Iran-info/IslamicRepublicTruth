type RuntimeBindings = {
  ADMIN_EMAILS?: string;
  COMMENT_HASH_SECRET?: string;
  BUCKET?: R2Bucket;
};

export async function runtimeBindings() {
  const { env } = await import("cloudflare:workers");
  return env as unknown as RuntimeBindings;
}

export async function isAdminEmail(email: string) {
  const allowed = (await runtimeBindings()).ADMIN_EMAILS?.split(",")
    .map((value) => value.trim().toLocaleLowerCase("en-US"))
    .filter(Boolean) ?? [];
  return allowed.includes(email.trim().toLocaleLowerCase("en-US"));
}

export async function adminIsConfigured() {
  return Boolean((await runtimeBindings()).ADMIN_EMAILS?.trim());
}

export function isSameOriginMutation(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function commenterHash(email: string) {
  const secret = (await runtimeBindings()).COMMENT_HASH_SECRET;
  if (!secret || secret.length < 32) throw new Error("Comment identity protection is not configured");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name:"HMAC", hash:"SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email.trim().toLocaleLowerCase("en-US")));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const privateResponseHeaders = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};
