import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ExoPet — Automate any habitat',
  description:
    'Open-source habitat automation for aquariums, terrariums, and more.',
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
