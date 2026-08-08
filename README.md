# Azad Journal

A calm bilingual English/Persian journal. It is fully static: articles and cover images live in this repository, the private editor runs only on the owner's computer, GitHub Pages hosts the site, and Giscus stores public discussion in GitHub Discussions.

## Run the website locally

Requires Node.js 22 or newer.

```powershell
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Write or edit an article

```powershell
npm run admin
```

The browser opens `http://127.0.0.1:4179`. The editor binds only to your own computer. It edits `content/articles.json` and stores sanitized cover images in `public/covers/`.

After saving, preview and publish:

```powershell
npm run dev
git status
git add content/articles.json public/covers
git commit -m "Publish new article"
git push
```

Draft articles remain in the repository but are excluded from the generated public website. Do not put secrets or private identifying information into drafts if this repository is public.

## Publish free with GitHub Pages

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `main`, then open the **Actions** tab and wait for **Deploy journal to GitHub Pages** to finish.
4. The site will appear at `https://iran-info.github.io/IslamicRepublicTruth/`.

No Cloudflare account, D1 database, R2 bucket, server, or payment method is used.

## Activate comments with Giscus

1. Open **Settings → General → Features** and enable **Discussions**.
2. Install the [Giscus GitHub App](https://github.com/apps/giscus) for this repository only.
3. Open [giscus.app](https://giscus.app/), enter `Iran-info/IslamicRepublicTruth`, choose **Discussion title contains page pathname**, select the **Announcements** category, and copy the generated `data-repo-id` and `data-category-id` values.
4. Put those two values into `content/site-config.json`, commit, and push.

Readers must use a GitHub account to comment. Their GitHub profile is public, but the website receives no email address and operates no user database.

## Privacy and security

- The public website has no database, upload endpoint, admin route, password form, or writable server.
- The local editor listens only on `127.0.0.1` and uses a random session token for writes.
- Cover images are re-encoded in the browser, removing EXIF camera/GPS metadata before they are saved.
- Use an organization identity, a pseudonymous GitHub account, and GitHub's no-reply commit email. Do not commit personal names, email addresses, analytics IDs, or image originals containing identifying details.
- Repository history is permanent in practice. Inspect `git diff --staged` before every push.
