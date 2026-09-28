'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isValidRoomCodeFormat } from '@/lib/roomCode';
import './landing.css';

export default function LandingPage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const joinInputRef = useRef<HTMLInputElement>(null);

  async function handleCreate() {
    setError(null);
    setIsCreating(true);
    try {
      const res = await fetch('/api/rooms', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create room');
      router.push(`/room/${data.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsCreating(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toLowerCase();
    setError(null);

    if (!code) {
      joinInputRef.current?.focus();
      return;
    }

    if (!isValidRoomCodeFormat(code)) {
      setError('Room codes look like: tiger-river-amber (three words with dashes)');
      return;
    }

    setIsJoining(true);
    try {
      const res = await fetch(`/api/rooms/${code}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Room not found');
      router.push(`/room/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Room not found or has expired');
      setIsJoining(false);
    }
  }

  return (
    <div className="landing-root">
      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <div className="landing-logo-icon">🍝</div>
          CopyPasta
        </div>
        <span className="landing-nav-badge">v0.1</span>
      </nav>

      {/* Hero */}
      <main className="landing-hero">
        <div className="landing-eyebrow fade-up">
          <span className="dot dot-pulse" style={{ color: 'var(--brand-accent)' }} />
          Realtime · No account needed · Free
        </div>

        <h1 className="landing-title fade-up fade-up-delay-1">
          Your clipboard,<br />
          <span className="landing-title-gradient">across every device</span>
        </h1>

        <p className="landing-subtitle fade-up fade-up-delay-2">
          Create a temporary room, paste your text, and instantly access it from
          any device. No accounts, no installs, no friction.
        </p>

        {/* Action card */}
        <div className="landing-action-card fade-up fade-up-delay-3">
          {/* Create */}
          <button
            id="create-pasta-btn"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px 20px', fontSize: '0.95rem' }}
            onClick={handleCreate}
            disabled={isCreating || isJoining}
            aria-label="Create a new CopyPasta room"
          >
            {isCreating ? (
              <>
                <Spinner />
                Creating room…
              </>
            ) : (
              <>
                <span>🍝</span>
                Create Pasta
              </>
            )}
          </button>

          {/* Divider */}
          <div className="landing-action-divider">or join existing</div>

          {/* Join */}
          <form className="landing-join-form" onSubmit={handleJoin} noValidate>
            <input
              ref={joinInputRef}
              id="join-room-input"
              className="input"
              type="text"
              placeholder="tiger-river-amber"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value);
                setError(null);
              }}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Room code"
              disabled={isCreating || isJoining}
            />
            <button
              id="join-pasta-btn"
              className="btn btn-secondary"
              type="submit"
              disabled={isCreating || isJoining || !joinCode.trim()}
              aria-label="Join room"
            >
              {isJoining ? <Spinner /> : 'Join'}
            </button>
          </form>

          {/* Error */}
          {error && (
            <div
              role="alert"
              style={{
                fontSize: '0.83rem',
                color: 'var(--status-error)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 4px',
              }}
            >
              <span aria-hidden="true">⚠</span>
              {error}
            </div>
          )}
        </div>
      </main>

      {/* Features */}
      <section className="landing-features" aria-label="Features">
        {FEATURES.map((f) => (
          <div className="landing-feature" key={f.label}>
            <div className="landing-feature-icon" aria-hidden="true">{f.icon}</div>
            <span>{f.label}</span>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        Rooms expire after 24 hours &nbsp;·&nbsp; Text is stored temporarily &nbsp;·&nbsp; No account required
      </footer>
    </div>
  );
}

const FEATURES = [
  { icon: '⚡', label: 'Realtime sync' },
  { icon: '🔒', label: 'No account needed' },
  { icon: '🌐', label: 'Any device, any browser' },
  { icon: '💨', label: 'Expires automatically' },
];

function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
      <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
