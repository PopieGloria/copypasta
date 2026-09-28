'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useId,
} from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import type {
  Room,
  RoomItem,
  ConnectionStatus,
  TextBroadcastPayload,
} from '@/types';
import {
  BROADCAST_EVENT_TEXT,
  CHANNEL_PREFIX,
  DB_WRITE_DEBOUNCE_MS,
  MAX_CONTENT_LENGTH,
} from '@/lib/constants';
import '../app/room.css';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatExpiry(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getStatusColor(status: ConnectionStatus): string {
  switch (status) {
    case 'connected': return 'var(--status-success)';
    case 'connecting': return 'var(--status-warning)';
    case 'disconnected':
    case 'error': return 'var(--status-error)';
  }
}

function getStatusLabel(status: ConnectionStatus): string {
  switch (status) {
    case 'connected': return 'Live';
    case 'connecting': return 'Connecting…';
    case 'disconnected': return 'Disconnected';
    case 'error': return 'Error';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface RoomEditorProps {
  room: Room;
  initialItem: Pick<RoomItem, 'id' | 'content' | 'type' | 'updated_at'> | null;
}

export default function RoomEditor({ room, initialItem }: RoomEditorProps) {
  // Stable ephemeral session ID to suppress echo from our own broadcasts
  const sessionId = useId();

  const [content, setContent] = useState(initialItem?.content ?? '');
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [isSaving, setIsSaving] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [textCopied, setTextCopied] = useState(false);
  const [expiryLabel, setExpiryLabel] = useState(() => formatExpiry(room.expires_at));
  const [toast, setToast] = useState<string | null>(null);

  const contentRef = useRef(content);
  const dbWriteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep ref in sync (used inside callbacks to avoid stale closures)
  useEffect(() => { contentRef.current = content; }, [content]);

  // ── Update expiry label every minute ────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setExpiryLabel(formatExpiry(room.expires_at));
    }, 60_000);
    return () => clearInterval(interval);
  }, [room.expires_at]);

  // ── Toast auto-dismiss ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Supabase Realtime channel ────────────────────────────────────────────────
  useEffect(() => {
    const channelName = `${CHANNEL_PREFIX}${room.code}`;

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } }, // Don't receive own broadcasts
    });

    channelRef.current = channel;

    channel
      .on('broadcast', { event: BROADCAST_EVENT_TEXT }, (payload) => {
        const data = payload.payload as TextBroadcastPayload;
        // Extra guard: ignore our own session's messages
        if (data.sender_id === sessionId) return;
        setContent(data.content);
        contentRef.current = data.content;
        // Cancel any pending DB write since remote just updated
        // (remote's device handles its own DB write)
        if (dbWriteTimer.current) clearTimeout(dbWriteTimer.current);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setStatus('connected');
        else if (status === 'CHANNEL_ERROR') setStatus('error');
        else if (status === 'TIMED_OUT') setStatus('disconnected');
        else setStatus('connecting');
      });

    return () => {
      if (dbWriteTimer.current) clearTimeout(dbWriteTimer.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.code, room.id]);

  // ── Persist text to DB (debounced) ──────────────────────────────────────────
  const scheduleSave = useCallback(
    (newContent: string) => {
      if (dbWriteTimer.current) clearTimeout(dbWriteTimer.current);
      setIsSaving(false);

      dbWriteTimer.current = setTimeout(async () => {
        setIsSaving(true);
        try {
          const { error } = await supabase
            .from('room_items')
            .update({ content: newContent, updated_at: new Date().toISOString() })
            .eq('room_id', room.id)
            .eq('type', 'text');

          if (error) {
            console.error('[RoomEditor] Save failed:', error);
          }
        } finally {
          setIsSaving(false);
        }
      }, DB_WRITE_DEBOUNCE_MS);
    },
    [room.id]
  );

  // ── Handle text change ───────────────────────────────────────────────────────
  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newContent = e.target.value;
    if (newContent.length > MAX_CONTENT_LENGTH) return;

    setContent(newContent);
    contentRef.current = newContent;

    // Broadcast immediately for realtime feel
    channelRef.current?.send({
      type: 'broadcast',
      event: BROADCAST_EVENT_TEXT,
      payload: { content: newContent, sender_id: sessionId } satisfies TextBroadcastPayload,
    });

    // Schedule DB write after user pauses
    scheduleSave(newContent);
  }

  // ── Copy room code ───────────────────────────────────────────────────────────
  async function handleCopyCode() {
    await navigator.clipboard.writeText(room.code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  // ── Copy text content ────────────────────────────────────────────────────────
  async function handleCopyText() {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setTextCopied(true);
    setToast('Copied to clipboard!');
    setTimeout(() => setTextCopied(false), 2000);
  }

  // ── Clear content ────────────────────────────────────────────────────────────
  function handleClear() {
    setContent('');
    contentRef.current = '';
    channelRef.current?.send({
      type: 'broadcast',
      event: BROADCAST_EVENT_TEXT,
      payload: { content: '', sender_id: sessionId } satisfies TextBroadcastPayload,
    });
    scheduleSave('');
    textareaRef.current?.focus();
  }

  const charCount = content.length;
  const charNearLimit = charCount > MAX_CONTENT_LENGTH * 0.9;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="room-root">
      {/* Header */}
      <header className="room-header">
        <div className="room-header-left">
          <Link href="/" className="room-logo-link" aria-label="Go to CopyPasta home">
            <div className="room-logo-icon-sm">🍝</div>
            <span>CopyPasta</span>
          </Link>
          <div className="room-header-sep" aria-hidden="true" />
          {/* Room code */}
          <div className="room-code-display" title="Room code">
            <span className="room-code-label">Room</span>
            <span className="room-code-value" id="room-code">{room.code}</span>
            <button
              className="room-code-copy-btn"
              onClick={handleCopyCode}
              aria-label={codeCopied ? 'Code copied!' : 'Copy room code'}
              title={codeCopied ? 'Copied!' : 'Copy code'}
            >
              {codeCopied ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>
        </div>

        <div className="room-header-right">
          {/* Expiry */}
          <div className="room-expiry" title={`Expires at ${new Date(room.expires_at).toLocaleString()}`}>
            <span aria-hidden="true">⏱</span>
            <span>Expires in&nbsp;</span>
            <span className="room-expiry-value">{expiryLabel}</span>
          </div>

          {/* Connection status */}
          <span
            className="badge"
            style={{
              color: getStatusColor(status),
              background: `${getStatusColor(status)}18`,
              border: `1px solid ${getStatusColor(status)}40`,
            }}
            role="status"
            aria-live="polite"
            aria-label={`Connection status: ${getStatusLabel(status)}`}
          >
            <span
              className={`dot ${status === 'connected' ? 'dot-pulse' : ''}`}
              aria-hidden="true"
            />
            {getStatusLabel(status)}
          </span>
        </div>
      </header>

      {/* Main editor */}
      <main className="room-main" id="main-content">
        {/* Toolbar */}
        <div className="room-toolbar">
          <div className="room-toolbar-left">
            <span
              className={`room-char-count ${charNearLimit ? 'near-limit' : ''}`}
              aria-live="polite"
              aria-label={`${charCount.toLocaleString()} characters`}
            >
              {charCount.toLocaleString()} / {MAX_CONTENT_LENGTH.toLocaleString()} chars
            </span>
          </div>
          <div className="room-toolbar-right">
            <button
              id="clear-text-btn"
              className="btn btn-danger btn-sm"
              onClick={handleClear}
              disabled={!content}
              aria-label="Clear all text"
              title="Clear"
            >
              <TrashIcon />
              Clear
            </button>
            <button
              id="copy-text-btn"
              className="btn btn-primary btn-sm"
              onClick={handleCopyText}
              disabled={!content}
              aria-label={textCopied ? 'Copied!' : 'Copy text to clipboard'}
            >
              {textCopied ? <CheckIcon /> : <CopyIcon />}
              {textCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Textarea */}
        <div className="room-editor-wrapper">
          <textarea
            ref={textareaRef}
            id="room-textarea"
            className="room-textarea"
            value={content}
            onChange={handleChange}
            placeholder="Paste or type your text here…&#10;Changes sync instantly to all connected devices."
            aria-label="Shared clipboard content"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />

          {/* Saving indicator */}
          <div
            className="room-saving-indicator"
            style={{ opacity: isSaving ? 1 : 0 }}
            aria-live="polite"
            aria-label={isSaving ? 'Saving…' : ''}
          >
            <Spinner size={11} />
            Saving…
          </div>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <span>✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Micro icons (inline SVG to avoid icon library dependencies)
// ─────────────────────────────────────────────────────────────────────────────

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 11H2.5A1.5 1.5 0 011 9.5v-7A1.5 1.5 0 012.5 1h7A1.5 1.5 0 0111 2.5V3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 8.5l3.5 3.5 7.5-7.5" stroke="var(--status-success)" strokeWidth="2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h12M5 4V2.5A.5.5 0 015.5 2h5a.5.5 0 01.5.5V4M6 7v5M10 7v5M3 4l.8 9.2A1 1 0 004.8 14h6.4a1 1 0 001-.8L13 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
      <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
