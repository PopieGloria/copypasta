import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CopyPasta — Cross-device clipboard',
  description:
    'Transfer text between your devices instantly. Create a temporary room, paste your content, and open it from any device — no account needed.',
  keywords: ['clipboard', 'cross-device', 'text transfer', 'temporary', 'copypasta'],
  openGraph: {
    title: 'CopyPasta — Cross-device clipboard',
    description: 'Transfer text between devices instantly. No account needed.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="page-container">{children}</body>
    </html>
  );
}
