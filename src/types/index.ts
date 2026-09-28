// =============================================================================
// CopyPasta — Shared TypeScript Types
// =============================================================================
// These types are designed to be future-proof.
// v0.1 only uses 'text' items; future versions will add 'file' | 'image' etc.
// =============================================================================

export type RoomItemType = 'text' | 'file' | 'image';

export interface Room {
  id: string;
  code: string;
  created_at: string;
  expires_at: string;
  metadata: Record<string, unknown>;
}

export interface RoomItem {
  id: string;
  room_id: string;
  type: RoomItemType;
  content: string | null;       // For text items
  file_path: string | null;     // For future file/image items
  file_meta: FileMeta;          // For future file metadata
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

// Future-proof file metadata shape — not used in v0.1
export interface FileMeta {
  filename?: string;
  size?: number;
  mime_type?: string;
  [key: string]: unknown;
}

// Realtime broadcast payload for text sync
export interface TextBroadcastPayload {
  content: string;
  sender_id: string; // ephemeral session ID to suppress echoes
}

// UI state types
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
