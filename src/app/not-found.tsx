import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        padding: '24px',
        textAlign: 'center',
        background: 'var(--bg-base)',
      }}
    >
      <div style={{ fontSize: '4rem', lineHeight: 1 }}>🍝</div>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
        Room not found
      </h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '360px', fontSize: '0.95rem', lineHeight: 1.6 }}>
        This room doesn&apos;t exist or has already expired. Rooms are automatically
        deleted after 24 hours.
      </p>
      <Link
        href="/"
        className="btn btn-primary"
        style={{ marginTop: '8px' }}
      >
        ← Back to home
      </Link>
    </div>
  );
}
