import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isValidRoomCodeFormat } from '@/lib/roomCode';
import RoomEditor from '@/components/RoomEditor';

interface PageProps {
  params: Promise<{ code: string }>;
}

// Server-side validation — bad/expired rooms get a 404, not a client-side error
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Room: ${code} — CopyPasta`,
    description: 'Shared clipboard room. Paste text here and access it from any device.',
  };
}

export default async function RoomPage({ params }: PageProps) {
  const { code } = await params;

  // Format check — prevent DB query with bad input
  if (!isValidRoomCodeFormat(code)) {
    notFound();
  }

  const supabase = createServerSupabaseClient();

  // Validate the room exists and is not expired
  const { data: room, error } = await supabase
    .from('rooms')
    .select('id, code, expires_at, created_at, metadata')
    .eq('code', code)
    .gt('expires_at', 'now()')
    .single();

  if (error || !room) {
    notFound();
  }

  // Fetch the initial text content
  const { data: item } = await supabase
    .from('room_items')
    .select('id, content, type, updated_at')
    .eq('room_id', room.id)
    .eq('type', 'text')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  return (
    <RoomEditor
      room={room}
      initialItem={item ?? null}
    />
  );
}
