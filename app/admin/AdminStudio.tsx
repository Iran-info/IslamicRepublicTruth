"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import type { Article } from "@/lib/content";
import type { PublicComment } from "@/lib/data";

type AdminComment = PublicComment & { articleTitle:string };
type EditorState = Omit<Article,"id"|"createdAt"|"updatedAt"> & { id:string|null };
type Tab = "articles" | "comments";

const blankArticle = (): EditorState => ({
  id:null, translationGroup:"", locale:"en", slug:"", title:"", deck:"", body:"",
  category:"Essay", author:"Azad Journal", coverKey:null, coverTone:"sage", issue:"01",
  status:"draft", publishedAt:new Date().toISOString(),
});

function fromArticle(article: Article): EditorState {
  const { createdAt, updatedAt, ...rest } = article;
  void createdAt;
  void updatedAt;
  return rest;
}

function slugify(value:string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-+|-+$/g,"").slice(0,120);
}

export function AdminStudio({ articles:initialArticles, comments:initialComments, signOutPath }:{ articles:Article[]; comments:AdminComment[]; signOutPath:string }) {
  const [tab,setTab] = useState<Tab>("articles");
  const [articles] = useState(initialArticles);
  const [comments,setComments] = useState(initialComments);
  const [draft,setDraft] = useState<EditorState>(blankArticle());
  const [busy,setBusy] = useState(false);
  const [uploading,setUploading] = useState(false);
  const [message,setMessage] = useState("");
  const publishedCount = useMemo(() => articles.filter((article) => article.status === "published").length,[articles]);

  function field<K extends keyof EditorState>(key:K,value:EditorState[K]) { setDraft((current) => ({...current,[key]:value})); }
  function edit(article:Article) { setDraft(fromArticle(article)); setTab("articles"); setMessage(""); window.scrollTo({top:0,behavior:"smooth"}); }
  function translate(article:Article) { setDraft({...blankArticle(),translationGroup:article.translationGroup,locale:article.locale === "en" ? "fa" : "en",category:article.locale === "en" ? "مقاله" : "Essay",author:article.locale === "en" ? "نشریه آزاد" : "Azad Journal",coverKey:article.coverKey,coverTone:article.coverTone}); setMessage(""); window.scrollTo({top:0,behavior:"smooth"}); }

  async function save(event:FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/articles",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(draft)});
      const result = await response.json() as {error?:string};
      if (!response.ok) throw new Error(result.error ?? "Unable to save article");
      setMessage(draft.status === "published" ? "Article published successfully." : "Draft saved successfully.");
      setTimeout(() => window.location.reload(),700);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save article"); }
    finally { setBusy(false); }
  }

  async function upload(event:ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    setUploading(true); setMessage("");
    try {
      const form = new FormData(); form.append("file",file);
      const response = await fetch("/api/admin/upload",{method:"POST",body:form});
      const result = await response.json() as {key?:string;error?:string};
      if (!response.ok || !result.key) throw new Error(result.error ?? "Unable to upload image");
      field("coverKey",result.key); setMessage("Cover image sanitized and uploaded.");
    } catch(error) { setMessage(error instanceof Error ? error.message : "Unable to upload image"); }
    finally { setUploading(false); event.target.value=""; }
  }

  async function moderate(id:string,status:"visible"|"removed") {
    const response = await fetch(`/api/admin/comments/${id}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({status})});
    if (response.ok) setComments((current) => current.map((comment) => comment.id === id ? {...comment,status} : comment));
  }

  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <Link className="wordmark admin-wordmark" href="/"><span className="wordmark-seal">آ</span><span><b>AZAD</b><small>STUDIO</small></span></Link>
      <nav><button className={tab === "articles" ? "active" : ""} onClick={() => setTab("articles")}><span>01</span>Articles</button><button className={tab === "comments" ? "active" : ""} onClick={() => setTab("comments")}><span>02</span>Discussion</button></nav>
      <div className="admin-account"><span>Private editor</span><a href={signOutPath}>Sign out</a></div>
    </aside>

    <main className="admin-main">
      <header className="admin-topbar"><div><p className="eyebrow">Private workspace</p><h1>{tab === "articles" ? "Editorial studio" : "Discussion desk"}</h1></div><Link href="/" target="_blank">View journal <span aria-hidden="true">↗</span></Link></header>
      {tab === "articles" ? <>
        <section className="admin-stats"><p><span>Published</span><b>{publishedCount}</b></p><p><span>Drafts</span><b>{articles.length-publishedCount}</b></p><p><span>Languages</span><b>EN · FA</b></p></section>
        <section className="editor-grid">
          <form className="article-editor" onSubmit={save} noValidate>
            <div className="editor-heading"><div><p className="eyebrow">{draft.id ? "Editing" : "New story"}</p><h2>{draft.id ? draft.title : "Write something worth keeping."}</h2></div>{draft.id ? <button type="button" className="quiet-button" onClick={() => {setDraft(blankArticle());setMessage("")}}>New article</button> : null}</div>
            <div className="field-row field-row--three"><label><span>Language</span><select value={draft.locale} onChange={(e) => { const locale=e.target.value as "en"|"fa"; setDraft((current) => ({...current,locale,author:locale === "fa" ? "نشریه آزاد" : "Azad Journal"})); }}><option value="en">English</option><option value="fa">Persian</option></select></label><label><span>Status</span><select value={draft.status} onChange={(e) => field("status",e.target.value as "draft"|"published")}><option value="draft">Draft</option><option value="published">Published</option></select></label><label><span>Issue</span><input value={draft.issue} onChange={(e) => field("issue",e.target.value)} maxLength={8} required /></label></div>
            <label className="editor-field"><span>Title</span><input className="title-input" value={draft.title} onChange={(e) => field("title",e.target.value)} maxLength={180} placeholder={draft.locale === "fa" ? "عنوان مقاله" : "Article title"} dir={draft.locale === "fa" ? "rtl" : "ltr"} required /></label>
            <label className="editor-field"><span>Summary</span><textarea value={draft.deck} onChange={(e) => field("deck",e.target.value)} maxLength={420} rows={3} placeholder="A clear, one-sentence reason to read…" dir={draft.locale === "fa" ? "rtl" : "ltr"} required /></label>
            <div className="slug-field"><label className="editor-field"><span>URL slug</span><input value={draft.slug} onChange={(e) => field("slug",e.target.value)} maxLength={120} placeholder="article-url" required /></label><button type="button" onClick={() => field("slug",slugify(draft.title))}>Generate</button></div>
            <label className="editor-field"><span>Category</span><input value={draft.category} onChange={(e) => field("category",e.target.value)} maxLength={60} required /></label>
            <label className="editor-field"><span>Article body <small>Use ## for section headings and &gt; for a quotation.</small></span><textarea className="body-input" value={draft.body} onChange={(e) => field("body",e.target.value)} maxLength={80000} rows={20} placeholder="Begin writing…" dir={draft.locale === "fa" ? "rtl" : "ltr"} required /></label>
            <div className="cover-editor"><div className={`cover-preview cover-art--${draft.coverTone}`}>{draft.coverKey ? <img src={`/media/${draft.coverKey}`} alt="Current cover" /> : <><span className="cover-orbit"/><b>AZ</b></>}</div><div><p className="eyebrow">Article cover</p><h3>{draft.coverKey ? "Cover ready" : "Calm fallback artwork"}</h3><p>Upload JPEG, PNG or WebP up to 6 MB. Camera, GPS, author and text metadata is removed on the server before storage.</p><label className="upload-button"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={uploading}/>{uploading ? "Sanitizing…" : "Choose image"}</label><div className="tone-picker"><span>Fallback tone</span>{(["sage","clay","night"] as const).map((tone) => <button type="button" key={tone} className={`${tone}${draft.coverTone === tone ? " selected" : ""}`} onClick={() => field("coverTone",tone)} aria-label={`${tone} cover tone`} />)}</div></div></div>
            <input type="hidden" value={draft.translationGroup} readOnly />
            <div className="editor-actions"><p className={message.toLowerCase().includes("unable") || message.toLowerCase().includes("must") ? "error" : ""}>{message}</p><button className="button button--ink" type="submit" disabled={busy}>{busy ? "Saving…" : draft.status === "published" ? "Publish article" : "Save draft"}</button></div>
          </form>
          <aside className="story-library"><div className="library-title"><p className="eyebrow">Library</p><span>{articles.length}</span></div>{articles.map((article) => <article key={article.id}><div><span>{article.locale.toUpperCase()} · {article.status}</span><h3>{article.title}</h3><p>{article.category} · {new Intl.DateTimeFormat("en-CA",{dateStyle:"medium"}).format(new Date(article.updatedAt))}</p></div><div><button onClick={() => edit(article)}>Edit</button><button onClick={() => translate(article)}>Add translation</button></div></article>)}</aside>
        </section>
      </> : <section className="moderation-panel"><div className="moderation-heading"><div><p className="eyebrow">Reader discussion</p><h2>Moderate behavior, not disagreement.</h2></div><p>Keep strong criticism visible. Remove spam, threats and private information.</p></div><div className="moderation-list">{comments.length ? comments.map((comment) => <article key={comment.id} className={comment.status === "removed" ? "removed" : ""}><header><div><b>{comment.authorName}</b><span>on {comment.articleTitle}</span></div><time>{new Intl.DateTimeFormat("en-CA",{dateStyle:"medium",timeStyle:"short"}).format(new Date(comment.createdAt))}</time></header><p>{comment.body}</p><footer><span>{comment.status}</span>{comment.status === "visible" ? <button onClick={() => moderate(comment.id,"removed")}>Remove</button> : <button onClick={() => moderate(comment.id,"visible")}>Restore</button>}</footer></article>) : <div className="moderation-empty"><span>↳</span><h3>No comments yet.</h3><p>New reader responses will appear here.</p></div>}</div></section>}
    </main>
  </div>;
}
