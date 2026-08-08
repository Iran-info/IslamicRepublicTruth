import Link from "next/link";
import { AdminStudio } from "@/app/admin/AdminStudio";
import { chatGPTSignOutPath, requireChatGPTUser } from "@/app/chatgpt-auth";
import { getCommentsForAdmin, listAllArticles } from "@/lib/data";
import { adminIsConfigured, isAdminEmail } from "@/lib/security";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  const [configured, authorized] = await Promise.all([
    adminIsConfigured(),
    isAdminEmail(user.email),
  ]);
  if (!configured || !authorized) {
    return <main className="access-page"><div className="access-card"><span className="wordmark-seal">آ</span><p className="eyebrow">Private editorial studio</p><h1>This account does not have editor access.</h1><p>The public journal remains available. No account details are displayed here.</p><div><Link className="button button--ink" href="/">Return to journal</Link><a className="button" href={chatGPTSignOutPath("/")}>Sign out</a></div></div></main>;
  }

  const [articles, comments] = await Promise.all([
    listAllArticles(),
    getCommentsForAdmin().catch(() => []),
  ]);
  return <AdminStudio articles={articles} comments={comments} signOutPath={chatGPTSignOutPath("/")} />;
}
