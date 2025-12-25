# Best Practice Next App

Next.js (App Router) reference app that demonstrates:
- Health ID → Provider ID OAuth flow using [`better-auth`](https://github.com/gndelia/better-auth) with SQLite/Drizzle.
- Protected user profile routes with session cookies.
- Population and hospital management UIs with inline editing plus a dashboard summary.
- A `/test-provider-id` playground to debug the raw provider profile flow.

## Quick start
1. Install dependencies
   ```bash
   npm install
   ```
2. Create `.env.local` with required values:
   - `DATABASE_URL=./data/app.db` (default SQLite path; relative paths resolve from project root)
   - `HEALTH_CLIENT_ID=...`
   - `HEALTH_CLIENT_SECRET=...`
   - `HEALTH_REDIRECT_URI=http://localhost:3000/api/auth/oauth2/callback/health-id`
   - `BETTER_AUTH_URL=http://localhost:3000`
   - `PROVIDER_CLIENT_ID=...`
   - `PROVIDER_CLIENT_SECRET=...`
   - `TEST_PROVIDER_ID_SESSION_SECRET=...` (encrypts the temporary cookie in `/test-provider-id`)
3. Apply the schema (SQLite via Drizzle). A starter DB already exists at `./data/app.db`.
   ```bash
   npm run db:push
   ```
4. Run the dev server
   ```bash
   npm run dev
   ```
5. Open http://localhost:3000 (dashboard). Use **Sign in** to start the Health ID OAuth flow and view the session/provider profile at `/user/profile`.

## Available scripts
- `npm run dev` – start Next.js in development mode
- `npm run build` / `npm run start` – production build & start
- `npm run lint` – run ESLint
- `npm run db:push` – sync schema to the SQLite database
- `npm run db:studio` – open Drizzle Studio

## Key routes & features
- `/dashboard` – overview cards for population and admissions
- `/population` – searchable, filterable registry with inline edits
- `/hospital` – manage hospital records
- `/sign-in` → `/user/profile` – Health ID → Provider ID sign-in, session, and provider profile viewer
- `/api/auth/*` – Better Auth handlers; `/api/auth/me/provider-profile` returns stored provider profile JSON
- `/test-provider-id/*` – manual Provider ID profile flow (debug playground)

## Authentication flow docs
Detailed sequence diagrams and troubleshooting live in:
- `docs/healthid-providerid-better-auth-flow.md` – Better Auth + Health ID + Provider ID end-to-end flow
- `docs/PROVIDER_ID_PROFILE_FLOW.md` – focused walkthrough for the `/test-provider-id` playground

## Notes
- The database path falls back to `./data/app.db` (see `src/db/index.ts`); keep the same path across runs to avoid losing OAuth state during development.
- Tailwind CSS v4 is used for styling; check `src/app/globals.css` for design tokens.
