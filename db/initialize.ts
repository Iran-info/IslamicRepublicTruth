import { sampleArticles } from "@/lib/content";

type RuntimeBindings = { DB?: D1Database };
let initialization: Promise<void> | null = null;
let activeDatabase: D1Database | null = null;

export class DatabaseUnavailableError extends Error {}

export function database(): D1Database {
  if (!activeDatabase) throw new DatabaseUnavailableError("Database binding is unavailable");
  return activeDatabase;
}

export async function ensureDatabase() {
  if (initialization) return initialization;
  initialization = initialize().catch((error) => {
    initialization = null;
    throw error;
  });
  return initialization;
}

async function initialize() {
  const { env } = await import("cloudflare:workers");
  const db = (env as unknown as RuntimeBindings).DB;
  if (!db) throw new DatabaseUnavailableError("Database binding is unavailable");
  activeDatabase = db;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      translation_group TEXT NOT NULL,
      locale TEXT NOT NULL CHECK(locale IN ('en','fa')),
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      deck TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Essay',
      author TEXT NOT NULL DEFAULT 'Azad Journal',
      cover_key TEXT,
      cover_tone TEXT NOT NULL DEFAULT 'sage' CHECK(cover_tone IN ('sage','clay','night')),
      issue TEXT NOT NULL DEFAULT '01',
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
      published_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS articles_slug_unique ON articles (slug)"),
    db.prepare("CREATE INDEX IF NOT EXISTS articles_locale_status_date_idx ON articles (locale, status, published_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS articles_translation_group_idx ON articles (translation_group)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      article_id TEXT NOT NULL,
      parent_id TEXT,
      author_hash TEXT NOT NULL,
      author_name TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'visible' CHECK(status IN ('visible','pending','removed')),
      created_at TEXT NOT NULL,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE SET NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS comments_article_status_date_idx ON comments (article_id, status, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS comments_author_date_idx ON comments (author_hash, created_at)"),
  ]);

  await db.batch(
    sampleArticles.map((article) =>
      db.prepare(`INSERT OR IGNORE INTO articles (
        id, translation_group, locale, slug, title, deck, body, category,
        author, cover_key, cover_tone, issue, status, published_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(
          article.id,
          article.translationGroup,
          article.locale,
          article.slug,
          article.title,
          article.deck,
          article.body,
          article.category,
          article.author,
          article.coverKey,
          article.coverTone,
          article.issue,
          article.status,
          article.publishedAt,
          article.createdAt,
          article.updatedAt,
        ),
    ),
  );
}
