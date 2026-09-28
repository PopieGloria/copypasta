// =============================================================================
// POST /api/rooms — Create a new room
// =============================================================================
// Server-side room creation:
//  1. Generate a unique room code
//  2. Insert the room into Supabase
//  3. Create the initial text item for that room
//  4. Return the room code
//
// This runs server-side so we can do a uniqueness retry loop safely.
// =============================================================================

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateRoomCode } from '@/lib/roomCode';
import { ROOM_TTL_MS } from '@/lib/constants';

const MAX_RETRIES = 5;

export async function POST() {
  const supabase = createServerSupabaseClient();

  let room = null;
  let attempts = 0;

  // Retry loop in case of rare code collision
  while (!room && attempts < MAX_RETRIES) {
    attempts++;
    const code = generateRoomCode();

    const expiresAt = new Date(Date.now() + ROOM_TTL_MS).toISOString();

    const { data, error } = await supabase
      .from('rooms')
      .insert({
        code,
        expires_at: expiresAt,
      })
      .select('id, code, expires_at')
      .single();

    if (error) {
      // Code 23505 = unique_violation — code collision, retry
      if (error.code === '23505') {
        continue;
      }
      console.error('[POST /api/rooms] DB error:', error);
      return NextResponse.json(
        { error: 'Failed to create room. Please try again.' },
        { status: 500 }
      );
    }

    room = data;

    // Create the initial empty text item for this room
    const { error: itemError } = await supabase
      .from('room_items')
      .insert({
        room_id: room.id,
        type: 'text',
        content: '',
      });

    if (itemError) {
      console.error('[POST /api/rooms] Failed to create room item:', itemError);
      // Room was created but item failed — still navigable, just empty
      // The room page will handle missing items gracefully
    }
  }

  if (!room) {
    return NextResponse.json(
      { error: 'Could not generate a unique room code. Please try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ code: room.code, expires_at: room.expires_at }, { status: 201 });
}
