"use client";

import { FormEvent, useMemo, useState } from "react";
import type { Locale } from "@/lib/content";
import type { PublicComment } from "@/lib/data";

const words = {
  en:{ title:"Discussion", intro:"Challenge the argument, add evidence, or correct the record.", rule:"Strong disagreement is welcome. Threats, spam and private information are not.", alias:"Public pen name", aliasPlaceholder:"Choose a name that does not identify you", comment:"Your comment", commentPlaceholder:"Write a thoughtful response…", post:"Post comment", posting:"Posting…", reply:"Reply", replying:"Replying to", cancel:"Cancel", empty:"No comments yet. Begin the discussion.", signIn:"Sign in with ChatGPT to comment", signedNote:"Use a pen name. Your email is converted to a private one-way identifier and is never shown in the discussion.", retry:"Something went wrong. Please try again." },
  fa:{ title:"گفت‌وگو", intro:"استدلال را به چالش بکشید، سند اضافه کنید یا خطایی را اصلاح کنید.", rule:"مخالفت جدی آزاد است؛ تهدید، هرزنامه و انتشار اطلاعات خصوصی نه.", alias:"نام مستعار عمومی", aliasPlaceholder:"نامی انتخاب کنید که هویت شما را آشکار نکند", comment:"دیدگاه شما", commentPlaceholder:"پاسخی سنجیده بنویسید…", post:"ارسال دیدگاه", posting:"در حال ارسال…", reply:"پاسخ", replying:"در پاسخ به", cancel:"لغو", empty:"هنوز دیدگاهی ثبت نشده است. شما آغاز کنید.", signIn:"برای نوشتن دیدگاه با ChatGPT وارد شوید", signedNote:"از نام مستعار استفاده کنید. ایمیل شما به شناسه‌ای خصوصی و یک‌طرفه تبدیل می‌شود و در گفت‌وگو نمایش داده نخواهد شد.", retry:"مشکلی پیش آمد. دوباره تلاش کنید." },
} as const;

export function CommentsPanel({ articleId, locale, initialComments, signedIn, signInPath }:{ articleId:string; locale:Locale; initialComments:PublicComment[]; signedIn:boolean; signInPath:string }) {
  const t = words[locale];
  const [comments, setComments] = useState(initialComments);
  const [alias, setAlias] = useState("");
  const [body, setBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<PublicComment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const roots = useMemo(() => comments.filter((comment) => !comment.parentId), [comments]);
  const children = (id:string) => comments.filter((comment) => comment.parentId === id);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`/api/articles/${articleId}/comments`, { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ alias, body, parentId:replyingTo?.id ?? null }) });
      const result = await response.json() as { comment?:PublicComment; error?:string };
      if (!response.ok || !result.comment) throw new Error(result.error ?? t.retry);
      setComments((current) => [...current, result.comment!]); setBody(""); setReplyingTo(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : t.retry); }
    finally { setBusy(false); }
  }

  function Comment({ comment, nested=false }:{ comment:PublicComment; nested?:boolean }) {
    return <article className={`comment${nested ? " comment--reply" : ""}`}>
      <div className="comment-head"><span className="comment-avatar" aria-hidden="true">{comment.authorName.slice(0,1).toLocaleUpperCase(locale)}</span><div><b>{comment.authorName}</b><time dateTime={comment.createdAt}>{new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-CA", { dateStyle:"medium" }).format(new Date(comment.createdAt))}</time></div></div>
      <p>{comment.body}</p>
      {signedIn && !nested ? <button className="reply-button" type="button" onClick={() => setReplyingTo(comment)}>{t.reply}</button> : null}
      {children(comment.id).map((child) => <Comment key={child.id} comment={child} nested />)}
    </article>;
  }

  return <section className="comments-section" id="discussion" aria-labelledby="discussion-title">
    <div className="comments-intro"><p className="eyebrow">{String(comments.length).padStart(2,"0")}</p><div><h2 id="discussion-title">{t.title}</h2><p>{t.intro}</p></div></div>
    <aside className="discussion-rule"><span aria-hidden="true">↳</span><p>{t.rule}</p></aside>
    {signedIn ? <form className="comment-form" onSubmit={submit}>
      {replyingTo ? <div className="replying-banner"><span>{t.replying} <b>{replyingTo.authorName}</b></span><button type="button" onClick={() => setReplyingTo(null)}>{t.cancel}</button></div> : null}
      <label><span>{t.alias}</span><input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder={t.aliasPlaceholder} maxLength={40} /></label>
      <label><span>{t.comment}</span><textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={t.commentPlaceholder} minLength={2} maxLength={2000} required rows={5} /></label>
      <div className="form-foot"><small>{t.signedNote}</small><button className="button button--ink" type="submit" disabled={busy}>{busy ? t.posting : t.post}</button></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </form> : <a className="sign-in-card" href={signInPath}><span>{t.signIn}</span><b aria-hidden="true">↗</b></a>}
    <div className="comment-list">{roots.length ? roots.map((comment) => <Comment key={comment.id} comment={comment} />) : <p className="no-comments">{t.empty}</p>}</div>
  </section>;
}
