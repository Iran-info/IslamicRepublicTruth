import type { ArticleStatus, Locale } from "@/lib/content";

export type ArticleInput = {
  id: string | null;
  translationGroup: string;
  locale: Locale;
  slug: string;
  title: string;
  deck: string;
  body: string;
  category: string;
  author: string;
  coverKey: string | null;
  coverTone: "sage" | "clay" | "night";
  issue: string;
  status: ArticleStatus;
  publishedAt: string;
};

const slugPattern = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;
const safeIdPattern = /^[a-zA-Z0-9-]{1,100}$/;
const coverKeyPattern = /^cover-[a-f0-9-]+\.(?:jpg|png|webp|avif)$/;

function textField(value: unknown, name: string, min: number, max: number) {
  if (typeof value !== "string") throw new Error(`${name} is required`);
  const clean = value.replace(/\r\n/g, "\n").trim();
  if (clean.length < min || clean.length > max) throw new Error(`${name} must be ${min}–${max} characters`);
  return clean;
}

export function parseArticleInput(value: unknown): ArticleInput {
  if (!value || typeof value !== "object") throw new Error("Invalid article data");
  const input = value as Record<string, unknown>;
  const locale = input.locale === "fa" ? "fa" : input.locale === "en" ? "en" : null;
  if (!locale) throw new Error("Language must be English or Persian");
  const status = input.status === "published" ? "published" : input.status === "draft" ? "draft" : null;
  if (!status) throw new Error("Status must be draft or published");
  const coverTone = input.coverTone === "clay" || input.coverTone === "night" ? input.coverTone : "sage";
  const slug = textField(input.slug, "Slug", 1, 120).toLocaleLowerCase(locale === "fa" ? "fa" : "en-US");
  if (!slugPattern.test(slug)) throw new Error("Slug may contain letters, numbers and single hyphens only");
  const id = typeof input.id === "string" && input.id ? input.id : null;
  if (id && !safeIdPattern.test(id)) throw new Error("Invalid article id");
  const suppliedGroup = typeof input.translationGroup === "string" ? input.translationGroup.trim() : "";
  if (suppliedGroup && !safeIdPattern.test(suppliedGroup)) throw new Error("Invalid translation link");
  const coverKey = typeof input.coverKey === "string" && input.coverKey ? input.coverKey : null;
  if (coverKey && !coverKeyPattern.test(coverKey)) throw new Error("Invalid cover image reference");
  const publishedAt = typeof input.publishedAt === "string" && !Number.isNaN(Date.parse(input.publishedAt))
    ? new Date(input.publishedAt).toISOString()
    : new Date().toISOString();

  return {
    id,
    translationGroup: suppliedGroup || crypto.randomUUID(),
    locale,
    slug,
    title: textField(input.title, "Title", 2, 180),
    deck: textField(input.deck, "Summary", 2, 420),
    body: textField(input.body, "Article", 20, 80000),
    category: textField(input.category, "Category", 2, 60),
    author: textField(input.author, "Author", 2, 100),
    coverKey,
    coverTone,
    issue: textField(input.issue, "Issue", 1, 8),
    status,
    publishedAt,
  };
}
