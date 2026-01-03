import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Family Video Tagger',
  description: 'Metadata tagging webapp for cataloging home videos in Jellyfin',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
