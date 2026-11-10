# Songwriting

Personal songwriting app: lyric editor with rhyme lookup, BPM-locked audio
looping, and song organization. Built with React, TypeScript, Vite, Tailwind
CSS, and Supabase. Installable as a PWA on iPhone (Add to Home Screen).

## First-time setup

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase dashboard, go to **SQL Editor** and run the contents of
   [`supabase/schema.sql`](supabase/schema.sql). This creates all the tables,
   security policies, and the storage bucket for audio files.
3. In the Supabase dashboard, go to **Settings -> API** and copy the
   **Project URL** and **anon/public key**.
4. Copy `.env.example` to `.env.local` and paste those two values in.
5. Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

6. Open the printed `localhost` URL, sign up for an account (email +
   password), and confirm the app loads past the login screen.

## Project structure

- `src/lib/supabaseClient.ts` — the shared Supabase client.
- `src/auth/` — login screen and auth state (`AuthProvider`).
- `src/types/database.ts` — TypeScript types matching `supabase/schema.sql`.
- `supabase/schema.sql` — the full database schema, safe to re-run.

## Status

Phase 1 (this): project scaffold, PWA shell, Supabase schema, and login are
working. The lyric editor, audio looping, and song list are not built yet.
