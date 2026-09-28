// =============================================================================
// GET /api/rooms/[code] — Validate that a room exists and is not expired
// =============================================================================

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isValidRoomCodeFormat } from '@/lib/roomCode';

interface RouteParams {
  params: Promise<{ code: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { code } = await params;

  // Validate format before hitting DB
  if (!isValidRoomCodeFormat(code)) {
    return NextResponse.json(
      { error: 'Invalid room code format.' },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();

  const { data: room, error } = await supabase
    .from('rooms')
    .select('id, code, expires_at, created_at')
    .eq('code', code)
    .gt('expires_at', 'now()')  // Only return non-expired rooms
    .single();

  if (error || !room) {
    return NextResponse.json(
      { error: 'Room not found or has expired.' },
      { status: 404 }
    );
  }

  return NextResponse.json({ room });
}
