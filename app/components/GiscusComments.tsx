"use client";

import { useEffect, useRef } from "react";
import config from "@/content/site-config.json";
import type { Locale } from "@/lib/content";

export function GiscusComments({ locale }: { locale: Locale }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current || !config.giscus.repoId || !config.giscus.categoryId) return;
    host.current.replaceChildren();
    const script = document.createElement("script");
    Object.entries({
      src:"https://giscus.app/client.js", "data-repo":config.giscus.repo, "data-repo-id":config.giscus.repoId,
      "data-category":config.giscus.category, "data-category-id":config.giscus.categoryId,
      "data-mapping":"pathname", "data-strict":"1", "data-reactions-enabled":"1", "data-emit-metadata":"0",
      "data-input-position":"top", "data-theme":"preferred_color_scheme", "data-lang":locale === "fa" ? "fa" : "en", crossorigin:"anonymous",
    }).forEach(([key,value]) => script.setAttribute(key,value));
    script.async = true; host.current.appendChild(script);
  }, [locale]);
  const text = locale === "fa"
    ? { title:"گفت‌وگو", intro:"استدلال را به چالش بکشید، سند اضافه کنید یا خطایی را اصلاح کنید.", setup:"برای فعال‌کردن دیدگاه‌ها، راهنمای Giscus در فایل README را کامل کنید." }
    : { title:"Discussion", intro:"Challenge the argument, add evidence, or correct the record.", setup:"Complete the Giscus step in README to activate comments." };
  return <section className="comments-section" id="discussion"><div className="comments-intro"><p className="eyebrow">↳</p><div><h2>{text.title}</h2><p>{text.intro}</p></div></div>{!config.giscus.repoId || !config.giscus.categoryId ? <aside className="discussion-rule"><span aria-hidden="true">↳</span><p>{text.setup}</p></aside> : null}<div ref={host}/></section>;
}
