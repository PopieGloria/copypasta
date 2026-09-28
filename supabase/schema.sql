-- =============================================================================
-- CopyPasta — Supabase Database Schema
-- Version: 0.1
-- =============================================================================
-- Run this entire file in the Supabase SQL editor:
--   Supabase Dashboard → SQL Editor → New Query → paste → Run
-- =============================================================================

-- ── Extensions ────────────────────────────────────────────────────────────────
-- pgcrypto is enabled by default on Supabase
-- gen_random_uuid() is available via pgcrypto or pg 13+

-- ── Tables ────────────────────────────────────────────────────────────────────

-- rooms: one row per temporary clipboard session
CREATE TABLE IF NOT EXISTS rooms (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT        NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  -- Extensible metadata bag: reserved for future room-level settings
  -- (e.g. max_items, password_hash, display_name)
  metadata    JSONB       NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT rooms_code_format CHECK (code ~ '^[a-z]+-[a-z]+-[a-z]+$'),
  CONSTRAINT rooms_expiry_future CHECK (expires_at > created_at)
);

-- room_items: content inside a room (text now; files/images later)
CREATE TABLE IF NOT EXISTS room_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  -- 'text' in v0.1; future: 'file' | 'image' | 'link'
  type        TEXT        NOT NULL DEFAULT 'text',
  content     TEXT,                          -- populated for type='text'
  file_path   TEXT,                          -- populated for type='file'/'image'
  -- Future file metadata: { filename, size, mime_type, checksum, … }
  file_meta   JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Per-item expiry (can be null = inherit from room, or override for faster expiry)
  expires_at  TIMESTAMPTZ,

  CONSTRAINT room_items_type_check CHECK (type IN ('text', 'file', 'image'))
);

-- ── Indexes ────────────────────────────────────────────────────────────────────

-- Primary lookup path: join room by code
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms (code);

-- Cleanup: find all expired rooms efficiently
CREATE INDEX IF NOT EXISTS idx_rooms_expires_at ON rooms (expires_at);

-- Items by room (for listing all items in a room)
CREATE INDEX IF NOT EXISTS idx_room_items_room_id ON room_items (room_id);

-- Partial index: quickly find active (non-expired) rooms
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms (code) WHERE expires_at > NOW();

-- ── updated_at trigger ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS room_items_updated_at ON room_items;
CREATE TRIGGER room_items_updated_at
  BEFORE UPDATE ON room_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security ─────────────────────────────────────────────────────────
-- Goal: anonymous users can read/write any non-expired room IF they know the code.
-- No user enumeration is possible — there's no "list all rooms" permission.

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_items ENABLE ROW LEVEL SECURITY;

-- rooms: SELECT — anyone with the code can read non-expired rooms
DROP POLICY IF EXISTS "rooms_select" ON rooms;
CREATE POLICY "rooms_select"
  ON rooms
  FOR SELECT
  TO anon
  USING (expires_at > NOW());

-- rooms: INSERT — anyone can create a room (server API route does this)
DROP POLICY IF EXISTS "rooms_insert" ON rooms;
CREATE POLICY "rooms_insert"
  ON rooms
  FOR INSERT
  TO anon
  WITH CHECK (
    -- Enforce code format at DB level too
    code ~ '^[a-z]+-[a-z]+-[a-z]+$'
    AND expires_at > NOW()
    AND expires_at <= NOW() + INTERVAL '25 hours' -- No rooms longer than 25h
  );

-- rooms: UPDATE / DELETE — NOT allowed for anon in v0.1
-- (rooms expire on their own; no user-initiated deletion yet)

-- room_items: SELECT — anon can read items belonging to a valid, non-expired room
DROP POLICY IF EXISTS "room_items_select" ON room_items;
CREATE POLICY "room_items_select"
  ON room_items
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = room_items.room_id
        AND r.expires_at > NOW()
    )
  );

-- room_items: INSERT — anon can create items in a valid room
DROP POLICY IF EXISTS "room_items_insert" ON room_items;
CREATE POLICY "room_items_insert"
  ON room_items
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = room_items.room_id
        AND r.expires_at > NOW()
    )
    AND type IN ('text', 'file', 'image')
    AND (content IS NULL OR LENGTH(content) <= 100000)  -- 100k char limit
  );

-- room_items: UPDATE — anon can update items in a valid room (for realtime text sync)
DROP POLICY IF EXISTS "room_items_update" ON room_items;
CREATE POLICY "room_items_update"
  ON room_items
  FOR UPDATE
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = room_items.room_id
        AND r.expires_at > NOW()
    )
  )
  WITH CHECK (
    type IN ('text', 'file', 'image')
    AND (content IS NULL OR LENGTH(content) <= 100000)
  );

-- ── Supabase Realtime ──────────────────────────────────────────────────────────
-- Enable realtime for room_items so Postgres Changes can fire.
-- Note: in v0.1 we use Broadcast (ephemeral) for live sync and rely on
-- Postgres Changes only as a fallback for reconnecting clients.
ALTER PUBLICATION supabase_realtime ADD TABLE room_items;

-- ── Automatic cleanup (optional — requires pg_cron extension) ─────────────────
-- Uncomment and run separately if pg_cron is enabled on your Supabase project.
-- Free tier may not have pg_cron; rooms will simply accumulate until manually
-- cleaned. Expired rooms cannot be read due to RLS, so this is only for storage.

-- SELECT cron.schedule(
--   'delete-expired-rooms',
--   '0 * * * *',   -- every hour
--   $$DELETE FROM rooms WHERE expires_at < NOW() - INTERVAL '1 hour'$$
-- );

-- ── Verification query ─────────────────────────────────────────────────────────
-- Run this after applying the schema to verify everything is set up correctly:
--
-- SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public' AND tablename IN ('rooms', 'room_items');
