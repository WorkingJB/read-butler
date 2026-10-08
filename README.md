# Speed Read It

A free speed reader. Paste text or upload a PDF, EPUB, DOCX, TXT, Markdown or HTML file and read it one word at a time (RSVP), with a warm-up ramp and a target speed that adapts to how much you take in. Works on the web and as a Chrome extension side panel, with one synced library.

- [Market analysis](docs/market-analysis.md): what already exists and where this fits.
- [Architecture](docs/architecture.md): design decisions, data model, security, hosting and setup.

## Stack

- **Web:** Next.js 16 (App Router) on Vercel, Tailwind CSS 4
- **Extension:** Chrome Manifest V3 side panel, Vite + React
- **Backend:** Supabase (Auth with email codes, Postgres with row level security)
- **Shared packages:** `@speedread/core` (reader engine, file parsing, data access) and `@speedread/reader-ui` (React reader)

## Getting started

```bash
npm install

# Web app
cp apps/web/.env.example apps/web/.env.local   # add Supabase URL and publishable key
npm run dev:web                                  # http://localhost:3000

# Chrome extension
cp apps/extension/.env.example apps/extension/.env
npm run build:extension                          # load apps/extension/dist as an unpacked extension
```

The `/try` page and the signed-out extension work without Supabase configured.

Apply the database schema with `npx supabase db push` (after `npx supabase link`), or paste `supabase/migrations/*.sql` into the Supabase SQL editor. See the setup section of the architecture doc for auth email templates and redirect URLs.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev:web` | Next.js dev server |
| `npm run dev:extension` | Rebuilds the extension on change |
| `npm run build` | Builds the web app and the extension |
| `npm run typecheck` | TypeScript across all workspaces |
| `npm run lint` | ESLint (web app) |
| `npm test` | Unit tests for the reader engine and parsers |
