import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mindtrace — Your AI Memory Engine',
  description:
    'A personal journaling and habit-tracking app where the AI remembers structured facts about you — confidence-scored, time-aware, deduplicated.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
