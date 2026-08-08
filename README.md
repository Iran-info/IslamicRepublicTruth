# Azad Journal

A calm, bilingual English/Persian publishing application with a private
editor, article discussions, cover images, and privacy-focused defaults.

## Features

- English and Persian layouts with automatic LTR/RTL direction
- Private article editor with drafts and publishing controls
- Top cover image for every article
- Comment discussions with public pen names
- Server-enforced collective author byline
- Cover-image metadata removal for JPEG, PNG, and WebP uploads
- Same-origin write protection, strict security headers, and private-route
  search exclusion
- D1 database storage and R2 object storage

## Privacy

This source snapshot contains no administrator email, comment-hashing secret,
personal identity, or Git history from the former hosted project. The included
hosting manifest has no project ID and is not connected to a live deployment.

Never commit real environment values. Configure these only in the deployment
platform:

- `ADMIN_EMAILS`: comma-separated editor account allowlist
- `COMMENT_HASH_SECRET`: random secret of at least 32 characters

Use a GitHub no-reply commit email if repository anonymity matters.

## Runtime architecture

The current implementation targets Vinext on Cloudflare Workers:

- Cloudflare D1 binding: `DB`
- Cloudflare R2 binding: `BUCKET`
- Cloudflare Images binding: `IMAGES` for Vinext image optimization
- ChatGPT/Sites identity headers for the existing editor and commenter
  authentication layer

The public pages can be developed locally. Deploying the full editor and
comment workflow outside ChatGPT Sites requires replacing the authentication
header adapter in `app/chatgpt-auth.ts` and configuring equivalent D1/R2
bindings.

## Local development

Requirements:

- Node.js 22.13 or newer
- npm
- Git Bash or WSL on Windows for the included lifecycle shell scripts

Install and start:

```bash
npm ci
npm run dev
```

Validation:

```bash
npm test
npm run lint
```

## Main directories

- `app/`: pages, editor, API routes, and UI components
- `db/`: database schema and initialization
- `lib/`: validation, security, persistence, and image sanitization
- `worker/`: Cloudflare Worker entry point and security headers
- `drizzle/`: D1 migration files
- `tests/`: security, rendering, and metadata-removal tests

See `PUSH-TO-GITHUB.md` for the exact Windows PowerShell commands to publish
this snapshot to the repository.
