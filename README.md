# Read Butler

A free speed reader. Paste text, upload a PDF, EPUB, DOCX, TXT, Markdown or HTML file, save web pages, or pick a free classic from Project Gutenberg, and read it one word at a time (RSVP), with a warm-up ramp and a target speed that adapts to how much you take in. Works on the web and as a Chrome extension side panel, with one synced library.

- [Market analysis](docs/market-analysis.md): what already exists and where this fits.
- [Architecture](docs/architecture.md): design decisions, data model, security, hosting and setup.

## Stack

- **Web:** Next.js 16 (App Router) on Vercel, Tailwind CSS 4
- **Extension:** Chrome Manifest V3 side panel, Vite + React
- **Backend:** Supabase (Auth with email codes, Postgres with row level security)
- **Shared packages:** `@readbutler/core` (reader engine, file parsing, data access) and `@readbutler/reader-ui` (React reader)

## Getting started

Development is cloud-first: nothing runs locally except the extension build.

- **Web app:** open a PR. CI runs lint, typecheck and tests, and Vercel builds a preview deployment. Merging to `main` deploys to production at https://www.readbutler.com.
- **Database and auth:** add a migration under `supabase/migrations/` or change `supabase/config.toml`. PRs get a dry run, and merging to `main` applies both to the hosted project via GitHub Actions. Don't run `supabase config push` locally: the SMTP password comes from a CI secret.
- **Chrome extension:**

```bash
npm install
cp apps/extension/.env.example apps/extension/.env.local   # Supabase URL, publishable key, web app URL
npm run build:extension                                     # load apps/extension/dist as an unpacked extension
```

The `/try` page and the signed-out extension work without Supabase configured.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev:web` | Next.js dev server |
| `npm run dev:extension` | Rebuilds the extension on change |
| `npm run build` | Builds the web app and the extension |
| `npm run typecheck` | TypeScript across all workspaces |
| `npm run lint` | ESLint (web app) |
| `npm test` | Unit tests for the reader engine and parsers |
