import {
  type AnySQLiteColumn,
  index,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const articles = sqliteTable(
  "articles",
  {
    id: text("id").primaryKey(),
    translationGroup: text("translation_group").notNull(),
    locale: text("locale", { enum: ["en", "fa"] }).notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    deck: text("deck").notNull().default(""),
    body: text("body").notNull(),
    category: text("category").notNull().default("Essay"),
    author: text("author").notNull().default("Azad Journal"),
    coverKey: text("cover_key"),
    coverTone: text("cover_tone", { enum: ["sage", "clay", "night"] })
      .notNull()
      .default("sage"),
    issue: text("issue").notNull().default("01"),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("draft"),
    publishedAt: text("published_at").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("articles_slug_unique").on(table.slug),
    index("articles_locale_status_date_idx").on(
      table.locale,
      table.status,
      table.publishedAt,
    ),
    index("articles_translation_group_idx").on(table.translationGroup),
  ],
);

export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    parentId: text("parent_id").references((): AnySQLiteColumn => comments.id, {
      onDelete: "set null",
    }),
    authorHash: text("author_hash").notNull(),
    authorName: text("author_name").notNull(),
    body: text("body").notNull(),
    status: text("status", { enum: ["visible", "pending", "removed"] })
      .notNull()
      .default("visible"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("comments_article_status_date_idx").on(
      table.articleId,
      table.status,
      table.createdAt,
    ),
    index("comments_author_date_idx").on(table.authorHash, table.createdAt),
  ],
);
