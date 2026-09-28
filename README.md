# 🍝 CopyPasta

> A lightweight, cross-device temporary clipboard. Paste text on one device, grab it from another — instantly, with no account needed.

---

## Table of Contents
1. [Project Structure](#project-structure)
2. [Database Schema](#database-schema)
3. [Supabase Setup](#supabase-setup)
4. [Environment Variables](#environment-variables)
5. [Local Development](#local-development)
6. [Vercel Deployment](#vercel-deployment)
7. [Security Considerations](#security-considerations)
8. [Known Limitations](#known-limitations)
9. [Future Roadmap](#future-roadmap)

---

## Project Structure

```
copypasta/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Landing page (client component)
│   │   ├── landing.css               # Landing page styles
│   │   ├── room.css                  # Room page styles
│   │   ├── globals.css               # Design system / CSS variables
│   │   ├── layout.tsx                # Root layout + metadata
│   │   ├── not-found.tsx             # 404 page (expired/invalid rooms)
│   │   ├── room/[code]/
│   │   │   └── page.tsx              # Room page (server component — validates room)
│   │   └── api/
│   │       └── rooms/
│   │           ├── route.ts          # POST /api/rooms → create room
│   │           └── [code]/
│   │               └── route.ts      # GET /api/rooms/[code] → validate room
│   ├── components/
│   │   └── RoomEditor.tsx            # Client component: textarea + realtime
│   ├── lib/
│   │   ├── constants.ts              # TTL, debounce delay, word list, etc.
│   │   ├── roomCode.ts               # Crypto-random room code generator
│   │   └── supabase/
│   │       ├── client.ts             # Browser Supabase client (anon key)
│   │       └── server.ts             # Server Supabase client (API routes)
│   └── types/
│       └── index.ts                  # TypeScript types (future-proof)
├── supabase/
│   └── schema.sql                    # Full DB schema + RLS policies
├── .env.local.example                # Environment variable template
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## Database Schema

Two tables designed for extensibility:

### `rooms`
| Column | Type | Description |
|---|---|---|
| `id` | `UUID` | Primary key |
| `code` | `TEXT` | Human-readable unique code (e.g. `tiger-river-amber`) |
| `created_at` | `TIMESTAMPTZ` | Room creation time |
| `expires_at` | `TIMESTAMPTZ` | Auto-expiry timestamp (24h TTL) |
| `metadata` | `JSONB` | Extensible bag (future: display name, settings) |

### `room_items`
| Column | Type | Description |
|---|---|---|
| `id` | `UUID` | Primary key |
| `room_id` | `UUID` | FK → `rooms.id` (CASCADE DELETE) |
| `type` | `TEXT` | `'text'` ∣ `'file'` ∣ `'image'` |
| `content` | `TEXT` | Content for text items |
| `file_path` | `TEXT` | Future: Supabase Storage path |
| `file_meta` | `JSONB` | Future: filename, size, mime\_type, checksum |
| `created_at` | `TIMESTAMPTZ` | Item creation time |
| `updated_at` | `TIMESTAMPTZ` | Auto-updated on write |
| `expires_at` | `TIMESTAMPTZ` | Optional per-item override expiry |

---

## Supabase Setup

### Step 1 — Create a project
1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New project** → choose a name (e.g. `copypasta`) → set a DB password → choose a region close to your users

### Step 2 — Apply the schema
1. In the Supabase dashboard, go to **SQL Editor** → **New Query**
2. Paste the entire contents of [`supabase/schema.sql`](./supabase/schema.sql)
3. Click **Run**
4. Verify with:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables
   WHERE schemaname = 'public' AND tablename IN ('rooms', 'room_items');
   ```
   Both tables should show `rowsecurity = true`.

### Step 3 — Enable Realtime
1. Go to **Database** → **Replication**
2. Ensure `room_items` is listed in the `supabase_realtime` publication
   (the schema.sql already adds it, but verify here)

### Step 4 — Get your credentials
1. Go to **Project Settings** → **API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> ⚠️ **Never copy the `service_role` key into frontend code or `.env.local.`**

---

## Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

| Variable | Where to find it | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon/public | ✅ |

---

## Local Development

### Prerequisites
- Node.js 18+ ([download](https://nodejs.org))
- A Supabase project with the schema applied (see above)

### Steps

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd copypasta

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.local.example .env.local
# Edit .env.local and add your Supabase URL + anon key

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Vercel Deployment

### First-time deploy

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Deploy (follow the prompts)
vercel
```

### Set environment variables on Vercel

In the Vercel dashboard → your project → **Settings** → **Environment Variables**, add:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project-ref.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-anon-key` |

Or via CLI:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Production deploy

```bash
vercel --prod
```

---

## Security Considerations

### What's protected
- **Anon key only in frontend**: The Supabase `service_role` key is never exposed. Only the `anon` key is used, which respects Row Level Security.
- **RLS enforced at DB level**: Even if someone calls the Supabase REST API directly with the anon key, they can only read rooms they have the code for, and only if the room is not expired.
- **Random codes**: Room codes are 3 words drawn from a ~90-word list using `crypto.getRandomValues()` (cryptographically random). ~729,000 combinations — sufficient for short-lived rooms with 24h TTL.
- **Format validation**: Room codes are validated against `^[a-z]+-[a-z]+-[a-z]+$` before hitting the database, preventing injection.
- **Server-side expiry enforcement**: Expired rooms return 404 (via Next.js `notFound()`).
- **DB constraints**: `rooms` table enforces code format and expiry bounds at the PostgreSQL level.

### Known security limitations
1. **No authentication**: Anyone who knows a room code can read and write to it. The room code is the only "secret". This is by design for v0.1.
2. **Obscurity ≠ security**: Room codes provide ~20 bits of entropy. This is acceptable for temporary, low-value clipboard data, but not suitable for sensitive information.
3. **No rate limiting**: The `/api/rooms` endpoint can be called rapidly to create many rooms. Add Vercel's rate limiting or an edge middleware if abuse becomes a concern.
4. **Content is readable by Supabase**: All text is stored in plaintext in the database. Do not use CopyPasta for passwords, secrets, or sensitive personal data.
5. **Realtime is unencrypted at the application layer**: Supabase Realtime uses TLS (transport encryption), but the content is not end-to-end encrypted.
6. **No CSRF protection on API routes**: Next.js API routes don't use cookies, so CSRF is not a vector here.

---

## Known Limitations (v0.1)

- **No authentication** — anyone with the code can access the room
- **Single text item per room** — no history, no multiple snippets
- **No file uploads** — text only
- **No room deletion by user** — rooms expire automatically after 24h
- **No pg_cron cleanup** — expired rooms accumulate in the DB until manually deleted (they are still inaccessible via RLS)
- **~729k room code combinations** — suitable for the current scale; add a numeric suffix for more entropy if needed

---

## Future Roadmap

The schema and architecture are designed to support:

- [ ] Multiple text snippets per room (already modelled via `room_items`)
- [ ] Clipboard history (timestamps already stored)
- [ ] File/PDF/image uploads via Supabase Storage (`file_path` + `file_meta` columns ready)
- [ ] User authentication (Supabase Auth — zero schema changes needed)
- [ ] Room password protection (`metadata` JSONB column ready)
- [ ] Room naming / display names
- [ ] Rate limiting on room creation
- [ ] End-to-end encryption (client-side before write)
